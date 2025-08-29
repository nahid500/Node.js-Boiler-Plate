import express from 'express';
import {
  createOrderAndCheckoutSession,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  getIncomeSummary,
  stripeWebhook,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import expressRaw from 'express'; // For webhook raw body parsing

const router = express.Router();

// User routes
router.post('/', protect, createOrderAndCheckoutSession); // Create order + Stripe checkout session
router.get('/myorders', protect, getUserOrders);

// Admin routes
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.get('/income/summary', protect, admin, getIncomeSummary);

// Stripe webhook - no auth, raw body parser needed
router.post(
  '/webhook',
  expressRaw.raw({ type: 'application/json' }),
  stripeWebhook
);

export default router;
