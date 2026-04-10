import mongoose from "mongoose";
import HostItem from "../models/hostItems.js";
import Order from "../models/orderSchema.js";
import Seller from "../models/sellerProfile.js";
import SellerProfile from "../models/sellerProfile.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import users from "../models/webUsers.js";
import { User } from "../models/users.js";
import { uploadToCloudinary } from "../utils/upload.js";
// ===============================
// 🔹 SELLER DASHBOARD
// ===============================
export const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?._id;

    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const totalItems = await HostItem.countDocuments({
      userId: sellerId,
    });

    const soldItems = await Order.aggregate([
      { $match: { sellerId: sellerId } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);

    const earnings = await Order.aggregate([
      {
        $match: {
          sellerId: sellerId,
          status: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const shipped = await Order.countDocuments({
      sellerId: sellerId,
      status: "shipped",
    });

    const payouts = await Payout.aggregate([
      { $match: { sellerId: sellerId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalItems,
      soldItems: soldItems[0]?.total || 0,
      earnings: earnings[0]?.total || 0,
      shipped,
      payouts: payouts[0]?.total || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ===============================
// 🔹 GET SELLER PROFILE (/api/seller/me)
// ===============================
export const getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.json({ seller });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===============================
// 🔹 SELLER ONBOARDING
// ===============================

// export const onboardingSeller = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.role !== "seller") {
//       return res.status(403).json({
//         message: "Only sellers can complete onboarding",
//       });
//     }

//     let seller = await SellerProfile.findOne({ userId });
//     if (!seller) seller = new SellerProfile({ userId });

//     const {
//       firstName,
//       lastName,
//       businessName,
//       email,
//       phoneNumber,
//       address,
//       state,
//       city,
//       zipCode,
//     } = req.body;

//     Object.assign(seller, {
//       firstName,
//       lastName,
//       businessName,
//       email,
//       phoneNumber,
//       address,
//       state,
//       city,
//       zipCode,
//     });

//     if (!seller.attachment) seller.attachment = {};

//     const uploadToCloudinary = (filePath, publicId) =>
//       new Promise((resolve, reject) => {
//         cloudinary.uploader.upload(
//           filePath,
//           {
//             folder: "onBoarding_images",
//             public_id: publicId,
//           },
//           (err, result) => {
//             if (err) return reject(err);
//             resolve(result.secure_url);
//           },
//         );
//       });

//     if (req.files?.govtIdFront) {
//       seller.attachment.govtIdFront = await uploadToCloudinary(
//         req.files.govtIdFront[0].path,
//         `govtIdFront_${userId}_${Date.now()}`,
//       );
//     }

//     if (req.files?.govtIdBack) {
//       seller.attachment.govtIdBack = await uploadToCloudinary(
//         req.files.govtIdBack[0].path,
//         `govtIdBack_${userId}_${Date.now()}`,
//       );
//     }

//     if (req.files?.selfieWithId) {
//       seller.attachment.selfieWithId = await uploadToCloudinary(
//         req.files.selfieWithId[0].path,
//         `selfieWithId_${userId}_${Date.now()}`,
//       );
//     }

//     await seller.save();

//     if (!user.profileCompleted) {
//       user.profileCompleted = true;
//       await user.save();
//     }

//     return res.status(200).json({
//       message: "Profile saved successfully",
//       seller,
//       user,
//     });
//   } catch (err) {
//     console.error("Onboarding error:", err);
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };

export const  onboardingSeller = async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "seller")
        return res
          .status(403)
          .json({ message: "Only sellers can complete onboarding" });

      let seller = await SellerProfile.findOne({ userId });
      if (!seller) seller = new SellerProfile({ userId });

      // Save text fields
      const {
        firstName,
        lastName,
        businessName,
        email,
        phoneNumber,
        address,
        state,
        city,
        zipCode,
      } = req.body;
      Object.assign(seller, {
        firstName,
        lastName,
        businessName,
        email,
        phoneNumber,
        address,
        state,
        city,
        zipCode,
      });

      if (!seller.attachment) seller.attachment = {};

      // Helper to upload file to Cloudinary
      const uploadToCloudinary = (filePath, publicId) =>
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload(
            filePath,
            {
              folder: "onBoarding_images",
              public_id: publicId,
            },
            (err, result) => {
              if (err) return reject(err);
              resolve(result.secure_url);
            },
          );
        });

      // Upload files if they exist
      if (req.files.govtIdFront) {
        seller.attachment.govtIdFront = await uploadToCloudinary(
          req.files.govtIdFront[0].path,
          `govtIdFront_${userId}_${Date.now()}`,
        );
      }
      if (req.files.govtIdBack) {
        seller.attachment.govtIdBack = await uploadToCloudinary(
          req.files.govtIdBack[0].path,
          `govtIdBack_${userId}_${Date.now()}`,
        );
      }
      if (req.files.selfieWithId) {
        seller.attachment.selfieWithId = await uploadToCloudinary(
          req.files.selfieWithId[0].path,
          `selfieWithId_${userId}_${Date.now()}`,
        );
      }

      await seller.save();

      if (!user.profileCompleted) {
        user.profileCompleted = true; // 🔹 ye sirf frontend logic ke liye flag
        await user.save();
      }

      return res
        .status(200)
        .json({ message: "Profile saved successfully", seller, user });
    } catch (err) {
      console.error("Onboarding error:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  };


