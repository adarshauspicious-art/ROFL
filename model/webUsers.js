import mongoose from "mongoose";

const webUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  
  password: {
    type: String,
    required: true,
  },


}, {createdAt: true, timestamps: true });

export default mongoose.model("WebUser", webUserSchema);