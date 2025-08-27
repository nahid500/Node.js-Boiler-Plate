import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: String,
  price: { type: Number, required: true },
  imgUrl: String,
  featured: { type: Boolean, default: false },
});

const Product = mongoose.model('Product', productSchema);
export default Product;
