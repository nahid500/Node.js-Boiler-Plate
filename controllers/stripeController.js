import Stripe from "stripe";
import Order from "../models/Order.js";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    const order = await Order.findById(orderId).populate("orderItems.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    // Prepare line items for Stripe checkout
    const lineItems = order.orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.name,
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/order/cancel`,
    });

    // Save Stripe session ID to order for reference
    order.paymentIntentId = session.id;
    await order.save();

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe session creation failed:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const order = await Order.findById(session.metadata.orderId);
      if (!order) {
        console.error("Order not found for session:", session.id);
        return res.status(404).send("Order not found");
      }

      order.paymentStatus = "paid";
      order.orderStatus = "on-process";
      await order.save();

      console.log("✅ Order updated:", order._id);
    } catch (err) {
      console.error("❌ Error updating order:", err.message);
      return res.status(500).send("Server error");
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
