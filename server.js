import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';

dotenv.config();

const app = express();

app.use(cors());

// Important: Use raw body parser *only* for Stripe webhook route
app.use('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

// Middleware to assign rawBody for Stripe webhook verification
app.use('/api/stripe/webhook', (req, res, next) => {
  req.rawBody = req.body;
  next();
});

// For all other routes (including the rest of Stripe routes) parse JSON normally
app.use(express.json());

// Routes

app.get('/', (req, res) => {
  res.send('API is running 🚀');
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stripe', stripeRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));
