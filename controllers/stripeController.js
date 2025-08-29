import Stripe from 'stripe';
import Order from '../models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    console.log("➡️ Received orderId:", orderId);

    // Populate deeply
    const order = await Order.findById(orderId).populate({
      path: "orderItems.product",
      model: "Product",
    });

    if (!order) {
      console.error("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("📦 Populated order:", JSON.stringify(order, null, 2));

    const lineItems = order.orderItems.map((item) => {
      if (!item.product || !item.product.name || !item.product.price) {
        console.error("❌ Invalid product in order:", item);
        throw new Error("Invalid product data in orderItems");
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product.name,
          },
          unit_amount: Math.round(item.product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });

    // Save session ID to order (optional)
    order.paymentIntentId = session.id;
    await order.save();

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("❌ Stripe session creation failed:", error.message);
    res.status(500).json({ message: "Failed to create checkout session", error: error.message });
  }
};
// Webhook handler (make sure to configure raw body middleware in express)
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const order = await Order.findById(session.metadata.orderId);
      if (!order) {
        console.error('❌ Order not found for session:', session.id);
        return res.status(404).send('Order not found');
      }

      order.paymentStatus = 'paid';
      order.orderStatus = 'on-process';
      await order.save();

      console.log('✅ Order updated as paid:', order._id);
    } catch (err) {
      console.error('❌ Error updating order:', err.message);
      return res.status(500).send('Server error');
    }
  }

  res.json({ received: true });
};











// // controllers/stripeController.js
// import Stripe from 'stripe';
// import Order from '../models/Order.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const createPaymentIntent = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     if (order.paymentStatus === 'paid') {
//       return res.status(400).json({ message: 'Order already paid' });
//     }

//     const amountInCents = Math.round(order.totalPrice * 100);

//     // Create Stripe PaymentIntent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amountInCents,
//       currency: 'usd',
//       automatic_payment_methods: {
//         enabled: true,
//         allow_redirects: 'never'  // disable redirect payment methods
//         },
//       metadata: {
//         orderId: order._id.toString(),
//         userId: req.user._id.toString(),
//       },
//     });

//     // AUTOMATICALLY save paymentIntentId to the order here
//     order.paymentIntentId = paymentIntent.id;
//     await order.save();

//     res.json({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error('Error creating payment intent:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



// // Stripe webhook handler to update order on payment success
// export const stripeWebhook = async (req, res) => {
//   const sig = req.headers['stripe-signature'];

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     console.error('Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   if (event.type === 'payment_intent.succeeded') {
//     const paymentIntent = event.data.object;

//     try {
//       const order = await Order.findOne({ paymentIntentId: paymentIntent.id });

//       if (!order) {
//         console.error('Order not found for paymentIntent:', paymentIntent.id);
//         return res.status(404).send('Order not found');
//       }

//       order.paymentStatus = 'paid';
//       order.orderStatus = 'on-process';
//       await order.save();

//       console.log('✅ Order updated:', order._id);
//     } catch (err) {
//       console.error('❌ Error updating order:', err.message);
//       return res.status(500).send('Server error');
//     }
//   }

//   res.json({ received: true });
// };
