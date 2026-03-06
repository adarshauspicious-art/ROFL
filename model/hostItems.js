import mongoose from "mongoose";

const hostItemSchema = new mongoose.Schema(
  {
    itemTitle: {
      type: String,
      required: true,
    },
    selectCategory: {
      type: String,
      required: true,
    },
    desiredNetPayout: {
      type: Number,
      required: true,
    },
    selectTimeline: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true, createdAt: true },
);
export default mongoose.model("hostItem", hostItemSchema);
