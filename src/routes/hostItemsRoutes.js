import express from "express";
import { createHostItem, getHostItemById } from "../controllers/hostItem.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

router.post("/", authMiddleware, upload.fields([{ name: "prizeImage", maxCount: 1 }]), createHostItem);
router.get("/:id", getHostItemById);

export default router;  