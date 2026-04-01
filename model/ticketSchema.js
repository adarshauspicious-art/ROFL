import mongoose from "mongoose";
const ticketSchema = new mongoose.Schema(
  {
    userId: String,
    itemTitle: String,
    selectCategory: String,
    desiredNetPayout: Number,
    description: String,
    price: Number,
    totalStock: Number,
    availableStock: Number,

    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);
export default mongoose.model("Ticket", ticketSchema);
