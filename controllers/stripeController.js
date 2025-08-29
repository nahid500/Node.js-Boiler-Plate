import Stripe from 'stripe';
import Order from '../models/Order.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
export const createCheckoutSession = async (req, res) => {
  try {
    const { orderItems, customerEmail } = req.body;

    const line_items = orderItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${process.env.CLIENT_URL}/success`,
      // success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      // cancel_url: `${process.env.CLIENT_URL}/cancel`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        userId: req.user._id.toString(),
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      {
        const session = event.data.object;

        // Payment was successful, update the order
        try {
          // Find order by userId and paymentIntentId if saved earlier,
          // but since we only have metadata.userId and session.id,
          // we must save the order here or match accordingly.

          // For this example, assume order created earlier with paymentIntentId = session.payment_intent

          const order = await Order.findOne({ paymentIntentId: session.payment_intent });

          if (order) {
            order.paymentStatus = 'paid';
            order.orderStatus = 'on-process';
            await order.save();
            console.log(`Order ${order._id} marked as paid and on-process.`);
          } else {
            console.log(`Order not found for paymentIntent ${session.payment_intent}`);
          }
        } catch (error) {
          console.error('Error updating order after payment success', error);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      {
        const paymentIntent = event.data.object;
        try {
          const order = await Order.findOne({ paymentIntentId: paymentIntent.id });

          if (order) {
            order.paymentStatus = 'failed';
            order.orderStatus = 'pending'; // or keep as pending
            await order.save();
            console.log(`Order ${order._id} marked as failed payment.`);
          } else {
            console.log(`Order not found for failed paymentIntent ${paymentIntent.id}`);
          }
        } catch (error) {
          console.error('Error updating order after payment failure', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
};
