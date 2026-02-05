import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // optional, if you want

  createdAt: {
    type: Date,
    default: Date.now,
  },
  
});

export const Image = mongoose.model("Image", imageSchema);
