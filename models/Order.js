// In models/Order.js
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Add these fields:
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },

  orderItems: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],

  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cod', 'stripe'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['pending', 'on-process', 'delivered'], default: 'pending' },
  
  paymentIntentId: { type: String }, // Stripe Payment Intent ID
}, { timestamps: true });
