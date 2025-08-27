import Subscriber from '../models/Subscriber.js';
import { sendSubscriptionEmail } from '../utils/sendEmail.js';

export const subscribeUser = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const existing = await Subscriber.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Already subscribed' });

    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();

    await sendSubscriptionEmail(email);

    res.status(200).json({ message: 'Subscribed and email sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Subscription failed' });
  }
};

export const unsubscribeUser = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const removed = await Subscriber.findOneAndDelete({ email });
    if (!removed) return res.status(404).json({ message: 'Email not found' });

    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unsubscription failed' });
  }
};
