import Order from '../models/Order.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendOrderConfirmationEmail } from '../utils/emailService.js';  // import email function
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create order AND create Stripe checkout session
export const createOrderAndCheckoutSession = async (req, res) => {
  try {
    const { orderItems, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // 1. Create order in DB with paymentStatus 'pending'
    const order = new Order({
      user: req.user._id,
      orderItems,
      totalPrice,
      paymentStatus: 'pending',
      orderStatus: 'pending',
    });

    const createdOrder = await order.save();

    // 2. Create Stripe checkout session
    const line_items = orderItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName || 'Product', // You can send productName from frontend or populate it before
        },
        unit_amount: Math.round(item.price * 100), // price in cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: req.user.email, // Optional: prefill email
      metadata: {
        orderId: createdOrder._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/order-cancelled`,
    });

    // 3. Send Stripe session ID to frontend
    res.status(201).json({ order: createdOrder, sessionId: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get orders of logged-in user
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .populate('orderItems.product', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order and payment status (admin)
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { orderStatus, paymentStatus } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (orderStatus) {
      if (!['pending', 'on-process', 'delivered'].includes(orderStatus)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      order.paymentStatus = paymentStatus;
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get income summary for admin dashboard
export const getIncomeSummary = async (req, res) => {
  try {
    const now = new Date();

    // Daily income last 7 days
    const dailyIncome = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Weekly income last 4 weeks
    const weeklyIncome = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    // Monthly income last 12 months
    const monthlyIncome = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Yearly income last 5 years
    const yearlyIncome = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(now.getFullYear() - 4, 0, 1) },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' } },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    res.json({ dailyIncome, weeklyIncome, monthlyIncome, yearlyIncome });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Stripe webhook handler
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      if (!orderId) {
        console.error('No orderId in session metadata');
        break;
      }

      try {
        const order = await Order.findById(orderId).populate('user');
        if (!order) {
          console.error('Order not found for ID:', orderId);
          break;
        }

        order.paymentStatus = 'paid';
        order.orderStatus = 'on-process';
        order.paymentIntentId = session.payment_intent;

        await order.save();

        // Generate PDF buffer using your PDF utility
        const pdfBuffer = await generatePDF(order);

        // Send email with PDF receipt attached
        await sendReceiptEmailWithPDF({
          toEmail: order.user.email,
          order,
          pdfBuffer,
        });

        console.log(`Order ${orderId} payment completed and PDF receipt email sent.`);
      } catch (err) {
        console.error('Error updating order after payment:', err);
      }
      break;
    }

    case 'checkout.session.expired':
    case 'payment_intent.payment_failed': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error('No orderId in session metadata for failed payment');
        break;
      }

      try {
        const order = await Order.findById(orderId);
        if (!order) {
          console.error('Order not found for ID:', orderId);
          break;
        }

        order.paymentStatus = 'failed';
        order.orderStatus = 'pending';
        await order.save();
        console.log(`Order ${orderId} payment failed.`);
      } catch (err) {
        console.error('Error updating order after failed payment:', err);
      }
      break;
    }

    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};