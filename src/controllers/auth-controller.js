import { User } from "../models/users.js";
import SellerProfile from "../models/sellerProfile.js"; // adjust path if needed
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../config/emailConfig.js"; // keep as is for now
import dotenv from "dotenv";
import nodemailer from "nodemailer";




// LOGIN (Admin + Seller)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

    let seller = null;
    if (user.role === "seller") {
      seller = await SellerProfile.findOne({ userId: user._id });
      user.profileCompleted = seller ? true : false;
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
      seller,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};  


export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ message: "Logged out successfully" });
};


export const forgetPassword = async (req, res) => {
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
  }


export const verifyOtp = async (req, res) => {
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetOTP = null;
    user.otpGeneratedAt = null;

    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !email || !password) {
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
};


