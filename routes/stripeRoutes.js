// routes/stripeRoutes.js
import express from 'express';
import { createPaymentIntent, stripeWebhook } from '../controllers/stripeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-payment-intent', protect, createPaymentIntent);

// Stripe webhook must receive raw body
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
