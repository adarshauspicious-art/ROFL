import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import "dotenv/config";
import { User } from "./model/users.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import nodemailer from "nodemailer";
import multer from "multer";



//=========================================================================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//=======================================================================================================================


dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true, // important for cookies
  })
);

const transporter = nodemailer.createTransport({
  service: "gmail", // Gmail service (Nodemailer will use the correct SMTP host/port)
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail app password
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

mongoose
.connect("mongodb://127.0.0.1:27017/rofl")
.then(() => console.log("MongoDB Connected 🚀"))
.catch((err) => console.log(err));



//=========================================================================================================================
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename:  (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

// ========================
// IMAGE ONLY FILTER
// ========================
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});
//=========================================================================================================================



app.get("/", (req, res) => {
  res.send("ROFL  Backend is running! 🚀");
});

app.get("/me", authMiddleware, async (req, res) => {
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
      { expiresIn: "1d" }
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

app.get("/api/users", authMiddleware, async (req, res) => {
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
      
      <p style="font-size:12px; color:#777;">For your security, never share your OTP with anyone. ROFL will never ask for your password or OTP over email.</p>
      
      <p style="margin-top:20px;">Thanks,<br/>
      The ROFL Team</p>
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



// ======================================================================================================================

// Upload single image
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({
    message: "Image uploaded successfully",
    fileName: req.file.filename,
    fileUrl: `http://localhost:3000/uploads/${req.file.filename}`
  });
});


// Upload multiple images
// app.post("/upload-multiple", upload.array("images", 3), (req, res) => {
//   res.json({
//     message: "Images uploaded successfully",
//     files: req.files.map(file => ({
//       fileName: file.filename,
//       fileUrl: `http://localhost:3000/uploads/${file.filename}`
//     }))
//   });
// });

// ========================
// ERROR HANDLER (MULTER + GENERAL)
// ========================
app.use((err, req, res, next) => {
  res.status(400).json({
    error: err.message
  });
});
// i have tried to upload the photo but its not working right now at the movement 

//============================================================================================================================================








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
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
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
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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




//    Server Listening
app.listen(5000, () => {
  console.log("ROFL Server is running on port 5000 🚀");
});
