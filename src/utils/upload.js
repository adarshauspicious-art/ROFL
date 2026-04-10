import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Local uploads folder
const uploadPath = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadPath, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    crypto.randomBytes(12, (err, bytes) => {
      if (err) return cb(err);
      cb(null, bytes.toString("hex") + path.extname(file.originalname));
    });
  },
});

// Only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

// Multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// Helper to upload to Cloudinary
export const uploadToCloudinary = (filePath, folder, publicId) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, public_id: publicId },
      (err, result) => {
        if (err) return reject(err);
        fs.unlink(filePath, () => {}); // delete local file after upload
        resolve(result.secure_url);
      }
    );
  });