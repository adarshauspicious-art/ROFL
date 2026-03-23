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
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    firstName: String,
    lastName: String,
    businessName: String,
    phoneNumber: String,
    address: String,
    state: String,
    city: String,
    zipCode: String,
    attachment: {
      url: { type: String },
      publicId: { type: String },
      govtIdFront: { type: String },
      govtIdBack: { type: String },
      selfieWithId: { type: String },
    },
  },
  { timestamps: true },
);

export default mongoose.model("SellerProfile", sellerSchema);
