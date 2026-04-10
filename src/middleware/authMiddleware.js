// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

// Main auth middleware
export const authMiddleware = (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
};

// Alias for clarity
export const verifyToken = authMiddleware;

// Role-based middleware
export const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
};