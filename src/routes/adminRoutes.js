import express from "express";
import {
  getDashboard,
  getPendingApprovals,
  getSellers,
  updateSellerStatus,
  getAllSellers
} from "../controllers/adminController.js";
import { createHostItem } from "../controllers/hostItem.controller.js";
import { getAllHostItems } from "../controllers/adminController.js";



const router = express.Router();

router.get("/dashboard", getDashboard);
router.get("/get-pending-approvals", getPendingApprovals);
router.get("/all-sellers", getSellers);
router.patch("/update-seller-status/:id", updateSellerStatus);
router.post("/host-items", createHostItem);
router.get("/all-sellers", getAllSellers);
router.get("/items", getAllHostItems);


export default router;