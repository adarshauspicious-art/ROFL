import mongoose from "mongoose";
const sellerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // unique
    firstName: String,
    lastName: String,
    businessName: String,
    phoneNumber: String,
    address: String,
    state: String,
    city: String,
    zipCode: String,
    govtIdFront: String,
    govtIdBack: String,
    selfieWithId: String,
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("SellerProfile", sellerSchema);