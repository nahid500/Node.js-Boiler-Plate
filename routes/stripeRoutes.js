// paymentRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createOrderAndCheckoutSession,
  stripeWebhook,
} from '../controllers/orderController.js'; // Using orderController here for brevity

const router = express.Router();

// Create order and Stripe checkout session
router.post('/create-checkout-session', protect, createOrderAndCheckoutSession);

// Stripe webhook (no auth, raw body needed)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

export default router;
