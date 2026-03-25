import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
// file upload imports
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
//------------------------------------------------------------------------------------
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "./middleware/authMiddleware.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "./model/users.js";
import { Image } from "./model/Image.js";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import verifyToken from "./middleware/verifyToken.js";
import authorizeRole from "./middleware/authorizeRole.js";
import WebUser from "./model/webUsers.js";
import hostItem from "./model/hostItems.js";
import SellerProfile from "./model/sellerProfile.js";
import Seller from "./model/sellerProfile.js";
dotenv.config();
const router = express.Router();
//==============================  ===========================================================================================

console.log("Cloudinary config:", cloudinary.config());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//=======================================================================================================================

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true, // important for cookies
  }),
);

const transporter = nodemailer.createTransport({
  //    NODEMAILER TRANSPORTER
  service: "gmail", // Gmail service (Nodemailer will use the correct SMTP host/port)
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail app password
  },
});

app.use(express.urlencoded({ extended: true }));

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

mongoose
  .connect("mongodb://127.0.0.1:27017/rofl")
  .then(() => console.log("MongoDB is Connected  🚀"))
  .catch((err) => console.log(err));

//==========================CLOUDINARY===============================================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const uploadDir = "uploads";
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// const uploadPath = path.join(__dirname, "uploads/images");
// fs.mkdirSync(uploadPath, { recursive: true });

// app.use("/upload", express.static(path.join(__dirname, "uploads")));

// const storage = multer.diskStorage({
//   // MULTER STORAGE
//   destination: (req, file, cb) => {
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     crypto.randomBytes(12, (err, bytes) => {
//       if (err) return cb(err);
//       const filename = bytes.toString("hex") + path.extname(file.originalname);
//       cb(null, filename);
//     });
//   },
// });

const uploadPath = path.join(__dirname, "uploads");
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    crypto.randomBytes(12, (err, bytes) => {
      if (err) return cb(err);
      cb(null, bytes.toString("hex") + path.extname(file.originalname));
    });
  },
});

const fileFilter = (req, file, cb) => {
  //  FILTER => IMAGE ONLY
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  // FILER SIZE OF IMAGE
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

//==============================CLOUDINARY END=================================================================

//==============================RATE LIMITER ========================================================
app.set("trust proxy", 1);

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
//   message: "Too many requests, please try again later.",
// });

// Applying globally
// app.use(limiter);

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
// });

//=============================ROUTES STARTS FROM HERE ================================================

app.get("/", (req, res) => {
  res.send("ROFL  Backend is running! 🚀");
});

app.get("/api/seller/me", authMiddleware, async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.json({ seller });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
    });

    // Generate JWT Token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      message: "User created successfully",

      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // fetch all users from DB
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Generated OTP:", otp); // Log OTP

    user.resetOTP = otp;
    user.otpGeneratedAt = new Date();
    await user.save();
    console.log("User after saving OTP:", user); // Log the user object

    // SEND REAL EMAIL
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your ROFL Password Reset Code",
      html: `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:auto; padding:20px; border:1px solid #e0e0e0; border-radius:8px;">
    
    <h2 style="color:#1a73e8;">Hello ${user.name} ,</h2>
    
    <p>We received a request to reset the password for your ROFL account. Use the OTP below to verify your identity and reset your password:</p>
    
    <div style="background:#f4f4f4; padding:15px; border-radius:5px; text-align:center; font-size:24px; font-weight:bold; margin:20px 0;">
      ${otp}
    </div>
    
    <p>This OTP will expire in <strong>10 minutes</strong>.</p>
    
    <p>If you did not request a password reset, please ignore this email. Your account is safe.</p>
    
    <hr style="border:none; border-top:1px solid #e0e0e0; margin:20px 0;">
    
    <p style="font-size:12px; color:#777;">
      For your security, never share your OTP with anyone. ROFL will never ask for your password or OTP over email.
    </p>
    
    <p style="margin-top:20px;">
      Thanks,<br/>
      The ROFL Team
    </p>

    <!-- Footer Section -->
    <hr style="border:none; border-top:1px solid #e0e0e0; margin:25px 0;">

    <div style="text-align:center; font-size:12px; color:#999;">
      <img src=https://res.cloudinary.com/du4y3qam1/image/upload/v1771308377/profile_pics/sn8poe8jn6u4e58tnqlf.png
           alt="ROFL Logo" 
           style="width:120px; margin-bottom:10px;" />
      
      <p style="margin:5px 0;">
        © 2026 ROFL. All rights reserved.
      </p>
      
      <p style="margin:5px 0;">
        <a href="mailto:adarshauspicious@gmail.com" 
           style="color:#1a73e8; text-decoration:none;">
           Contact Us
        </a>
      </p>
    </div>
  </div>
`,
    });

    console.log("Email sent successfully:", info.response);

    res.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.resetOTP) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.otpGeneratedAt) {
      return res.status(400).json({ message: "OTP generation time missing" });
    }

    if (Date.now() - new Date(user.otpGeneratedAt).getTime() > 10 * 60 * 1000) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    user.resetOTP = null;
    user.otpGeneratedAt = null;
    await user.save();

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error in /verify-otp:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Optional cleanup fields
    user.resetOTP = null;
    user.otpGeneratedAt = null;

    await user.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

app.post(
  "/user/profile-image",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pics",
      });

      // delete old image or cloudiary se bhi krega
      if (user.profileImage?.publicId) {
        await cloudinary.uploader.destroy(user.profileImage.publicId);
      }

      // update userrpofile
      user.profileImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };

      await user.save();

      res.json({
        message: "Profile image updated successfully",
        imageUrl: result.secure_url,
        savedInDb: user.profileImage,
      });
    } catch (err) {
      console.error("PROFILE IMAGE ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

app.get("/user/me", verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id).select(
      "name email profileImage",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GET /user/me ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/dashboard", verifyToken, authorizeRole("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

app.get("/api/admin/sellers/pending-approvals", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch SellerProfiles and populate User info
    const sellers = await SellerProfile.find({ status: "Pending" })
      .populate("userId", "name email") // only get name and email
      .skip(skip)
      .limit(limit);

    const totalSellers = await SellerProfile.countDocuments();

    // Format response
    const formattedSellers = sellers
      .filter((s) => s.userId) // skip if userId is null
      .map((s) => ({
        id: s._id,
        name: s.userId.name,
        email: s.userId.email,
        submitted: s.status, // Pending / Approved / Rejected
        createdAt: s.createdAt, // SellerProfile submission date
        attachment: {
          govtIdFront: s.attachment?.govtIdFront || null,
          govtIdBack: s.attachment?.govtIdBack || null,
          selfieWithId: s.attachment?.selfieWithId || null,
        },
      }));

    res.json({
      id: "pendingSellers",
      sellers: formattedSellers,
      page,
      totalPages: Math.ceil(totalSellers / limit),
      totalSellers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/sellers/:id/status", async (req, res) => {
  try {
    const { status } = req.body; // "Approved" or "Rejected"
    const { id } = req.params;

    // Validate status
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Update seller profile
    const updatedSeller = await SellerProfile.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).populate("userId", "name email");

    if (!updatedSeller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    res.json({
      message: `Seller has been ${status.toLowerCase()}`,
      seller: updatedSeller,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get(
  "/seller/dashboard",
  verifyToken,
  authorizeRole("seller"),
  (req, res) => {
    res.json({ message: "Welcome Seller" });
  },
);

app.post("/web/user-register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }
    const existingUser = await WebUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User aleady exists",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match ",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await WebUser.create({
      email,
      password: hashedPassword,
    });
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

//============================== LOGIN and LOGOUT ROUTE's ==================================================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    let seller = null;
    if (user.role === "seller") {
      seller = await SellerProfile.findOne({ userId: user._id });

      // ✅ Ensure profileCompleted is sent
      user.profileCompleted = seller ? true : false; // agar seller profile exist karta hai, matlab submit ho gaya
    }

    res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", path: "/" });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted, // 🔹 yahi frontend check karega
      },
      seller,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/web/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: " Email and Password are required",
      });
    }
    const user = await WebUser.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    path: "/", // this is crucial
  });
  res.status(200).json({ message: "Logged out successfully" });
});
//============================== HOSTITEMS EITHER BY THE ADMIN OR BY THE SELLER ==================================================
app.post("/host-items", async (req, res) => {
  try {
    const {
      itemTitle,
      selectCategory,
      desiredNetPayout,
      selectTimeline,
      description,
      images,
      ownsPrize,
      prizeImage,
    } = req.body;

    if (
      !itemTitle ||
      !selectCategory ||
      !desiredNetPayout ||
      !selectTimeline ||
      !description
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const timelineDays = parseInt(selectTimeline); // automatically gets 7, 15, 21, 30

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + timelineDays);
    if (req.body.ownsPrize && !req.body.prizeImage) {
      return res.status(400).json({
        success: false,
        message: "Prize image required if you own the prize",
      });
    }

    const newItem = await hostItem.create({
      itemTitle,
      selectCategory,
      desiredNetPayout: Number(desiredNetPayout),
      selectTimeline,
      description,
      images: images || [],
      startDate,
      endDate,
      ownsPrize: req.body.ownsPrize, // ✅ add this
      prizeImage: req.body.prizeImage || null, // ✅ add this
    });

    const net = newItem.desiredNetPayout;

    // Step 1: Ticket Price
    let ticketPrice;
    if (net <= 500) {
      ticketPrice = 5;
    } else if (net <= 1000) {
      ticketPrice = 10;
    } else if (net <= 4999) {
      ticketPrice = 25;
    } else if (net <= 24999) {
      ticketPrice = 50;
    } else {
      ticketPrice = 100;
    }

    // Step 2: Platform Fee
    let platformFee;
    if (net <= 50000) {
      platformFee = 0.1 * net;
    } else if (net <= 100000) {
      platformFee = 0.1 * 50000 + 0.05 * (net - 50000);
    } else {
      platformFee = 0.1 * 50000 + 0.05 * 50000 + 0.025 * (net - 100000);
    }

    // Step 3: Buffer
    const buffer = Math.max(0.05 * net, 10);

    // Step 4: Base
    const base = net + platformFee + buffer;

    // Step 5: Processing Fee Loop
    let pot = base;
    while (true) {
      const newPot = base + 0.035 * pot;
      if (Math.abs(newPot - pot) < 1) break;
      pot = newPot;
    }

    // Step 6: Total Tickets (Spots)
    const totalTickets = Math.ceil(pot / ticketPrice);
    const totalPot = totalTickets * ticketPrice;

    // Step 7: Remaining Fees
    const processingFee = parseFloat((0.035 * totalPot).toFixed(2));
    const irsWithholding = parseFloat((0.25 * totalPot).toFixed(2));

    const calculations = {
      desiredNetPayout: net,
      ticketPrice,
      totalTickets, // ✅ added total tickets
      totalSpots: totalTickets, // optional if you still want spots
      totalPot,
      platformFee: parseFloat(platformFee.toFixed(2)),
      processingFee,
      irsWithholding,
    };

    res.status(201).json({
      success: true,
      data: { ...newItem.toObject(), calculations },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//============================== SELLER ONBOARDING ROUTE ==================================================

// app.post("/api/seller/onBoarding", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Fetch the user
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.role !== "seller") {
//       return res
//         .status(403)
//         .json({ message: "Only sellers can complete onboarding" });
//     }

//     // Find or create seller profile
//     let seller = await SellerProfile.findOne({ userId });
//     if (!seller) {
//       seller = new SellerProfile({ userId });
//     }

//     // Update seller fields from request body
//     Object.assign(seller, req.body);

//     // Ensure attachment object exists
//     if (!seller.attachment) seller.attachment = {};

//     // Save govt ID strings
//     if (req.body.govtIdFront) seller.attachment.govtIdFront = req.body.govtIdFront;
//     if (req.body.govtIdBack) seller.attachment.govtIdBack = req.body.govtIdBack;
//     if (req.body.selfieWithId) seller.attachment.selfieWithId = req.body.selfieWithId;

//     await seller.save();

//     // Mark profile as completed in User model
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
//     return res.status(500).json({ message: "Server error" });
//   }
// });
app.post(
  "/api/seller/onBoarding",
  authMiddleware,
  upload.fields([
    { name: "govtIdFront", maxCount: 1 },
    { name: "govtIdBack", maxCount: 1 },
    { name: "selfieWithId", maxCount: 1 },
  ]),
  async (req, res) => {
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
  },
);
//============================== SELLER ONBOARDING ROUTE ==================================================

app.use((err, req, res, next) => {
  res.status(400).json({
    error: err.message,
  });
});

app.listen(5000, () => {
  console.log("ROFL Server is running on port 5000 🚀");
});
