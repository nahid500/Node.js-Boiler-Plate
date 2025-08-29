import Order from '../models/Order.js';

// User places an order
// export const createOrder = async (req, res) => {
//   try {
//     const { orderItems, totalPrice } = req.body;

//     if (!orderItems || orderItems.length === 0) {
//       return res.status(400).json({ message: 'No order items' });
//     }

//     const order = new Order({
//       user: req.user._id,
//       orderItems,
//       totalPrice,
//       paymentStatus: 'pending',
//       orderStatus: 'pending',
//     });

//     const createdOrder = await order.save();
//     res.status(201).json(createdOrder);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// User places an order
export const createOrder = async (req, res) => {
  try {
    const { orderItems, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const order = new Order({
      user: req.user._id,
      orderItems,
      totalPrice,
      paymentStatus: 'pending',
      orderStatus: 'pending',
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// User fetches own orders
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

// Admin fetches all orders
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

// Admin updates order & payment status
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
