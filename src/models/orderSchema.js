import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: String,
    itemId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    totalAmount: Number,

    status: {
      type: String,
      enum: ["pending", "paid", "expired"],
      default: "pending",
    },

    stripeSessionId: String,
    expiresAt: Date,
  },
  { timestamps: true }
);


export default mongoose.model("Order", orderSchema);    