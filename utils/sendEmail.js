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

export const sendSubscriptionEmail = async (toEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `"Chicken Farm" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Thank you for subscribing!',
      text: 'Welcome to our newsletter. You’ll now receive updates on our best chicken breeds and offers!',
      html: `<h2>Welcome to Chicken Farm 🐔</h2><p>You’ll now receive updates on our best chicken breeds and offers!</p>`,
    });

    // console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Email sending failed:', error.message);
  }
};
