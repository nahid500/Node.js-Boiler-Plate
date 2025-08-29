import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  desc: { type: String },
  price: { type: Number, required: true, min: 0 },
  imgUrls: [{ type: String }], // Array of image URLs
  eggs: { type: String },
  behavior: { type: String },
  size: { type: String },
  lifespan: { type: String },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
