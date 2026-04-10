dotenv.config(); 
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import nodemailer from "nodemailer";
// Middleware
import { authMiddleware } from "./src/middleware/authMiddleware.js";
import verifyToken from "./src/middleware/verifyToken.js";
import authorizeRole from "./src/middleware/authorizeRole.js";

// Models
import { User } from "./src/models/users.js";
import { Image } from "./src/models/Image.js";
import WebUser from "./src/models/webUsers.js";
import SellerProfile from "./src/models/sellerProfile.js";
import Seller from "./src/models/sellerProfile.js";
import Ticket from "./src/models/ticketSchema.js";
import product from "./src/models/product.js";
import Order from "./src/models/orderSchema.js";
import HostItem from "./src/models/hostItems.js";

// Routes
import authRoutes from "./src/routes/authRoutes.js";
import hostItemsRoutes from "./src/routes/hostItemsRoutes.js";
import sellerRoutes from "./src/routes/sellerRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import webAuthRoutes from "./src/routes/webAuthRoutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

// ================= MIDDLEWARE =================
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true,
  }),
);

// Logging requests
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl); 
  next();
});

// ================= ROUTES =================
app.use("/api/seller",verifyToken, sellerRoutes);        // seller APIs
app.use("/api/admin", adminRoutes);      // admin APIs
app.use("/api/web", webAuthRoutes);          // web auth/login routes
app.use("/api/auth", authRoutes);            // general auth routes

// Optional test route
app.get("/", (req, res) => res.send("ROFL Backend is running! 🚀"));

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(400).json({ error: err.message });
});

// ================= DATABASE =================
mongoose
  .connect("mongodb://127.0.0.1:27017/rofl")
  .then(() => console.log("MongoDB is Connected  🚀"))
  .catch((err) => console.log(err));

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`ROFL Server running on port ${PORT} 🚀`);
});