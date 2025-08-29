import Stripe from "stripe";
import Order from "../models/Order.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    console.log("➡️ Received orderId:", orderId);

    // Populate deeply
    const order = await Order.findById(orderId).populate({
      path: "orderItems.product",
      model: "Product",
    });

    if (!order) {
      console.error("❌ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("📦 Populated order:", JSON.stringify(order, null, 2));

    const lineItems = order.orderItems.map((item) => {
      if (!item.product || !item.product.name || !item.product.price) {
        console.error("❌ Invalid product in order:", item);
        throw new Error("Invalid product data in orderItems");
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product.name,
          },
          unit_amount: Math.round(item.product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });

    // Save session ID to order (optional)
    order.paymentIntentId = session.id;
    await order.save();

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("❌ Stripe session creation failed:", error.message);
    res.status(500).json({ message: "Failed to create checkout session", error: error.message });
  }
};
