import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // optional, if you want
  profileImage: {
    url: String,
    publicId: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Image = mongoose.model("Image", ImageSchema);
