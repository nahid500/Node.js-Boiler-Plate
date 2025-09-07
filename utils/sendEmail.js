// utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Newsletter Subscription Email (optional)
export const sendSubscriptionEmail = async (toEmail) => {
  try {
    await transporter.sendMail({
      from: `"Chicken Farm" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Thank you for subscribing!',
      text: 'Welcome to our newsletter!',
      html: `<h2>Welcome to Chicken Farm 🐔</h2><p>You’ll now receive updates on our best chicken breeds and offers!</p>`,
    });
  } catch (error) {
    console.error('Newsletter email failed:', error.message);
  }
};

// Send PDF Receipt Email ONLY
export const sendReceiptEmailWithPDF = async ({ toEmail, order, pdfBuffer }) => {
  try {
    await transporter.sendMail({
      from: `"Chicken Farm" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Your Receipt for Order ${order._id}`,
      text: `Thank you for your purchase! Please find your receipt attached.`,
      attachments: [
        {
          filename: `receipt-${order._id}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    console.log('✅ Receipt email sent:', toEmail);
  } catch (error) {
    console.error('❌ Failed to send receipt email:', error.message);
  }
};
