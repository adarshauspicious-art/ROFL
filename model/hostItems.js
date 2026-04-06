import mongoose from "mongoose";

const hostItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

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

    // 🧠 ADD THESE FIELDS 👇
    ticketPrice: {
      type: Number,
      required: true,
    },

    totalTickets: {
      type: Number,
      required: true,
    },

    availableTickets: {
      type: Number,
      required: true,
    },

    totalPot: {
      type: Number,
    },

    // -----------------------

    selectTimeline: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: [],

    startDate: {
      type: Date,
      default: Date.now,
    },

    ownsPrize: {
      type: Boolean,
      default: false,
    },

    prizeImage: {
      type: String,
      default: null,
    },

    endDate: {
      type: Date,
    },

    winner: {
      name: String,
      date: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("hostItem", hostItemSchema);
