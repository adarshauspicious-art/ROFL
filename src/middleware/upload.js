import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadPath = path.join(process.cwd(), "uploads");

// ✅ Ensure folder exists
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

// ✅ Only images allowed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export default upload;