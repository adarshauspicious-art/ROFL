import mongoose from "mongoose";
const ticketSchema = new mongoose.Schema(
  {
    title: {
      userId: String,
      ticketes: Number,
      amount: Number,
      status: String,
    },
  },
  { timestamps: true },
);
export default mongoose.model("Ticket", ticketSchema);
