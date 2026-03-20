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
  status: {
    enum: ['active', 'inactive', 'banned'],
    type: String,
    default: 'active'
  }


}, {createdAt: true, timestamps: true });

export default mongoose.model("WebUser", webUserSchema);