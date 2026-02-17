import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

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

   profileImage: {
    url: String,
    publicId: String,
  },

  otpGeneratedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  resetOTP: String,
  resetOTPExpires: Date,
});

export const User = mongoose.model("User", userSchema);
