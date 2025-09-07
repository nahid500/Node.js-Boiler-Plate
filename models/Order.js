import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Customer contact details
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },

  orderItems: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },  // Price at time of order
    },
  ],

  totalPrice: { type: Number, required: true },

  paymentMethod: {
    type: String,
    enum: ['cod', 'stripe'],
    default: 'cod',
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },

  orderStatus: {
    type: String,
    enum: ['pending', 'on-process', 'delivered'],
    default: 'pending',
  },

  paymentIntentId: { type: String }, // Stripe Payment Intent ID

}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
