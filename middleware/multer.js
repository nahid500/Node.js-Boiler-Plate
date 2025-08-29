import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('File is not an image'), false);
};

const upload = multer({ storage, fileFilter });
export default upload;
