import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Blocked"],
      default: "Pending",
    },
    rejectionReason: {
      type: String,
    },
    firstName: String,
    lastName: String,
    businessName: String,
    email: String,
    phoneNumber: String,
    address: String,
    state: String,
    city: String,
    zipCode: String,
    attachment: { 
      url: String,
      publicId: String,
      govtIdFront: String,
      govtIdBack: String,
      selfieWithId: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("SellerProfile", sellerSchema);
