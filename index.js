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

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const uploadPath = path.join(__dirname, "uploads/images");
fs.mkdirSync(uploadPath, { recursive: true });

app.use("/upload", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  // MULTER STORAGE
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(12, (err, bytes) => {
      if (err) return cb(err);
      const filename = bytes.toString("hex") + path.extname(file.originalname);
      cb(null, filename);
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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later.",
});

// Applying globally
app.use(limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

//=============================ROUTES STARTS FROM HERE ================================================

app.get("/", (req, res) => {
  res.send("ROFL  Backend is running! 🚀");
});

app.get("/me", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
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

app.post("/user/profile-image",verifyToken,upload.single("image"),async (req, res) => {
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

app.get("/admin/dashboard",verifyToken,authorizeRole("admin"),(req, res) => {
    res.json({ message: "Welcome Admin" });
  },
);

app.get( "/seller/dashboard", verifyToken, authorizeRole("seller"),(req, res) => {
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
      }
    });
    
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate
    if (!email || !password) {
      return res
      .status(400)
      .json({ message: "Email and password are required" });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, // include role
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });

    // If successful then
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // send role to frontend
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/web/login",loginLimiter, async (req,res) =>{
  try{
    const {email, password} = req.body;
    if(!email || !password){
      return res.status(400).json({
        message: " Email and Password are required"
      })
    }
    const user = await WebUser.findOne({email});
    if(!user){
      return res.status(400).json({
        message: "Invalid email or password"
      })
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      return res.status(400).json({
        message: "Invalid email or password"
      })
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
  }
  catch(err){
    res.status(500).json({
      message: "Server error",
      error: err.message,
    })
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


app.post("/host-items", async (req, res) => {
  try {
    const { itemTitle, selectCategory, desiredNetPayout, selectTimeline, description } = req.body;

    if (!itemTitle || !selectCategory || !desiredNetPayout || !selectTimeline || !description) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const newItem = await hostItem.create({
      itemTitle,
      selectCategory,
      desiredNetPayout: Number(desiredNetPayout),
      selectTimeline,
      description
    });

    const net = newItem.desiredNetPayout; // ✅ Only this comes from user

    // Step 1: Ticket Price derived from net
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

    // Step 2: Platform Fee derived from net
    let platformFee;
    if (net <= 50000) {
      platformFee = 0.10 * net;
    } else if (net <= 100000) {
      platformFee = (0.10 * 50000) + (0.05 * (net - 50000));
    } else {
      platformFee = (0.10 * 50000) + (0.05 * 50000) + (0.025 * (net - 100000));
    }

    // Step 3: Buffer derived from net
    const buffer = Math.max(0.05 * net, 10);

    // Step 4: Base Pot
    const base = net + platformFee + buffer;

    // Step 5: Iterative Processing Fee
    let pot = base;
    while (true) {
      const newPot = base + (0.035 * pot);
      if (Math.abs(newPot - pot) < 1) break;
      pot = newPot;
    }

    // Step 6: Total Spots and Total Pot
    const totalSpots = Math.ceil(pot / ticketPrice);
    const totalPot = totalSpots * ticketPrice;

    // Step 7: Remaining fees derived from totalPot
    const processingFee = parseFloat((0.035 * totalPot).toFixed(2));
    const irsWithholding = parseFloat((0.25 * totalPot).toFixed(2));

    const calculations = {
      desiredNetPayout: net,       // from user
      ticketPrice,                 // calculated
      totalSpots,                  // calculated
      totalPot,                    // calculated
      platformFee: parseFloat(platformFee.toFixed(2)),  // calculated
      processingFee,               // calculated
      irsWithholding,              // calculated
    };

    res.status(201).json({
      success: true,
      data: { ...newItem.toObject(), calculations }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});






app.use((err, req, res, next) => {
  res.status(400).json({
    error: err.message,
  });
});

app.listen(5000, () => {
  console.log("ROFL Server is running on port 5000 🚀");
});
