import express, { Router } from "express";
import {
  login,
  logout,
  forgetPassword,
  verifyOtp,
  resetPassword,
  register,
} from "../controllers/auth-controller.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forget-password", forgetPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/register", register);

export default router;