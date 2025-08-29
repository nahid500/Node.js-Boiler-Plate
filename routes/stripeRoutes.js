import express from 'express';
import {
  createCheckoutSession,
  stripeWebhook,
} from '../controllers/stripeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Removed: createPaymentIntent (no longer used)
// router.post('/create-payment-intent', protect, createPaymentIntent);

// ✅ Use Checkout Session instead
router.post('/create-checkout-session', protect, createCheckoutSession);

// Stripe webhook must receive raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
