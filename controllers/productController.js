import Product from '../models/Product.js';
import cloudinary from '../utils/cloudinary.js';

// Upload multiple images to Cloudinary
const streamUploadMultiple = (files) => {
  return Promise.all(
    files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (result) resolve(result.secure_url);
            else reject(error);
          }
        );
        stream.end(file.buffer);
      });
    })
  );
};

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
    const { name, desc, price, featured, eggs, behavior, size, lifespan } = req.body;
    const priceNum = Number(price);
    const featuredBool = featured === 'true' || featured === true;

    if (!name || isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Invalid product data' });
    }

    let imgUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        imgUrls = await streamUploadMultiple(req.files);
      } catch (err) {
        return res.status(500).json({ message: 'Image upload failed', error: err.message });
      }
    }

    const product = new Product({
      name,
      desc,
      price: priceNum,
      imgUrls,
      featured: featuredBool,
      eggs,
      behavior,
      size,
      lifespan,
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, desc, price, featured, eggs, behavior, size, lifespan } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.files && req.files.length > 0) {
      try {
        const newImgUrls = await streamUploadMultiple(req.files);
        product.imgUrls = [...product.imgUrls, ...newImgUrls]; // Append or replace as needed
      } catch (err) {
        return res.status(500).json({ message: 'Image upload failed', error: err.message });
      }
    }

    if (name) product.name = name;
    if (desc) product.desc = desc;
    if (eggs) product.eggs = eggs;
    if (behavior) product.behavior = behavior;
    if (size) product.size = size;
    if (lifespan) product.lifespan = lifespan;

    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'Invalid price value' });
      }
      product.price = priceNum;
    }

    if (featured !== undefined) {
      product.featured = featured === 'true' || featured === true;
    }

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
