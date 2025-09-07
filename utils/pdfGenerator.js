// utils/pdfGenerator.js
import PDFDocument from 'pdfkit';

export const generateReceiptPDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(20).text('Chicken Farm - Order Receipt', { align: 'center' });
      doc.moveDown();

      // Order info
      doc.fontSize(12).text(`Order ID: ${order._id}`);
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`);
      doc.text(`Order Status: ${order.orderStatus}`);
      doc.text(`Payment Status: ${order.paymentStatus}`);
      doc.moveDown();

      // Customer info (if available)
      if (order.user && order.user.name) {
        doc.text(`Customer: ${order.user.name}`);
        doc.text(`Email: ${order.user.email}`);
        doc.moveDown();
      }

      // Table header
      doc.font('Helvetica-Bold');
      doc.text('Qty', 50, doc.y, { width: 50 });
      doc.text('Product', 100, doc.y, { width: 250 });
      doc.text('Unit Price', 350, doc.y, { width: 100, align: 'right' });
      doc.text('Total', 450, doc.y, { width: 100, align: 'right' });
      doc.moveDown();
      doc.font('Helvetica');

      // Items
      order.orderItems.forEach(item => {
        doc.text(item.quantity, 50, doc.y, { width: 50 });
        doc.text(item.product?.name || 'Product', 100, doc.y, { width: 250 });
        doc.text(`$${item.price.toFixed(2)}`, 350, doc.y, { width: 100, align: 'right' });
        doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 450, doc.y, { width: 100, align: 'right' });
        doc.moveDown();
      });

      doc.moveDown();
      doc.font('Helvetica-Bold');
      doc.text(`Total Price: $${order.totalPrice.toFixed(2)}`, { align: 'right' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
