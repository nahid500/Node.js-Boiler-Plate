import express from 'express';
import { subscribeUser, unsubscribeUser } from '../controllers/newsletterController.js';

const router = express.Router();

router.post('/subscribe', subscribeUser);
router.post('/unsubscribe', unsubscribeUser);

export default router;
