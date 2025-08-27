import Product from '../models/Product.js';
import cloudinary from '../utils/cloudinary.js';

// Helper to upload image buffer to Cloudinary
const streamUpload = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'products' },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {

    // console.log('Received body:', req.body);  
    // console.log('Received file:', req.file);  

    let img = '';

    if (req.file) {
      const result = await streamUpload(req.file.buffer);
      // console.log('Cloudinary upload result:', result);

      img = result.secure_url;
    }

    const { name, desc, price, featured } = req.body;
    const product = new Product({
      name,
      desc,
      price,
      imgUrl: img,
      featured,
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, desc, price, featured } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.file) {
      const result = await streamUpload(req.file.buffer);
      product.img = result.secure_url;
    }

    product.name = name ?? product.name;
    product.desc = desc ?? product.desc;
    product.price = price ?? product.price;
    product.featured = featured ?? product.featured;

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
