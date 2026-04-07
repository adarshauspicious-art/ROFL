import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hostItem",
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  quantity: Number,
  totalAmount: Number,
  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "delivered"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);