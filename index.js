import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import  "dotenv/congig";
import { User } from "./model/users.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true, // important for cookies
  })
);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);


const transporter = nodemailer.createTransport({
  host: "smtp.mail.yahoo.com",
  port: 465,
  secure: true,
  auth: {
    user: "your_yahoo_email@yahoo.com",
    pass: "your_yahoo_app_password"
  }
});

app.use(express.json());

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

mongoose
  .connect("mongodb://127.0.0.1:27017/rofl")
  .then(() => console.log("MongoDB Connected 🚀"))
  .catch((err) => console.log(err));

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
      name:`${firstName} ${lastName}`,
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


    user.resetOTP = otp;
    await user.save();

    // SEND REAL EMAIL
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    });

    res.json({
      success: true,
      message: "OTP sent to your email"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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