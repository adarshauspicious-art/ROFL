import express from "express";
import {
  getSellerDashboard,
  getSellerProfile,
  onboardingSeller,
} from "../controllers/sellerController.js";
import { upload } from "../utils/upload.js"; 
import { createHostItem, getHostItemById } from "../controllers/hostItem.controller.js"; // fix filename

import { authorizeRole } from "../middleware/authMiddleware.js";


const router = express.Router();


router.get(
  "/seller/dashboard",
  authorizeRole("seller"),
  getSellerDashboard,
);

router.get("/me",  getSellerProfile);

router.post("/host-items",  createHostItem);

router.post(
  "/onboarding",
  upload.fields([
    { name: "govtIdFront", maxCount: 1 },
    { name: "govtIdBack", maxCount: 1 },
    { name: "selfieWithId", maxCount: 1 },
  ]),
  onboardingSeller
);

export default router;
