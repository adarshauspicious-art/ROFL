import HostItem from "../models/hostItems.js";
import { uploadToCloudinary } from "../utils/upload.js";



export const getHostItemById = async (req, res) => {
  try {
    const item = await HostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const now = new Date();
    const end = new Date(item.endDate);

    const remainingMs = end - now;

    const daysLeft = Math.max(
      0,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    );

    const isExpired = remainingMs <= 0;

    //  Auto update status
    if (isExpired && item.status !== "expired") {
      item.status = "expired";
      await item.save();
    }

    res.status(200).json({
      success: true,
      data: {
        ...item.toObject(),
        daysLeft,
        isExpired,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Create HostItem
export const createHostItem = async (req, res) => {
  try {
    const {
      itemTitle,
      selectCategory,
      desiredNetPayout,
      selectTimeline,
      description,
      images,
      ownsPrize,
      prizeImage,
    } = req.body;

    if (
      !itemTitle ||
      !selectCategory ||
      !desiredNetPayout ||
      !selectTimeline ||
      !description
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const net = Number(desiredNetPayout);

    //  ---------------- CALCULATIONS FIRST ----------------

    // Ticket Price
    let ticketPrice;
    if (net <= 500) ticketPrice = 5;
    else if (net <= 1000) ticketPrice = 10;
    else if (net <= 4999) ticketPrice = 25;
    else if (net <= 24999) ticketPrice = 50;
    else ticketPrice = 100;

    // Platform Fee
    let platformFee;
    if (net <= 50000) {
      platformFee = 0.1 * net;
    } else if (net <= 100000) {
      platformFee = 0.1 * 50000 + 0.05 * (net - 50000);
    } else {
      platformFee = 0.1 * 50000 + 0.05 * 50000 + 0.025 * (net - 100000);
    }

    const buffer = Math.max(0.05 * net, 10);
    const base = net + platformFee + buffer;

    let pot = base;
    while (true) {
      const newPot = base + 0.035 * pot;
      if (Math.abs(newPot - pot) < 1) break;
      pot = newPot;
    }

    const totalTickets = Math.ceil(pot / ticketPrice);
    const totalPot = totalTickets * ticketPrice;

    const processingFee = parseFloat((0.035 * totalPot).toFixed(2));
    const irsWithholding = parseFloat((0.25 * totalPot).toFixed(2));

    //  -----------------------------------------------------

    const timelineDays = parseInt(selectTimeline);
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + timelineDays);

    if (ownsPrize && !prizeImage) {
      return res.status(400).json({
        success: false,
        message: "Prize image required if you own the prize",
      });
    }

    const userId = req.user.id;

    //  SAVE EVERYTHING IN DB
    const newItem = await HostItem.create({
      itemTitle,
      selectCategory,
      desiredNetPayout: net,
      selectTimeline,
      description,
      images: images || [],
      startDate,
      endDate,
      ownsPrize,
      prizeImage: prizeImage || null,
      userId,
      ticketPrice,
      totalTickets,
      availableTickets: totalTickets,
      totalPot,
    });

    const calculations = {
      desiredNetPayout: net,
      ticketPrice,
      totalTickets,
      totalSpots: totalTickets,
      totalPot,
      platformFee: parseFloat(platformFee.toFixed(2)),
      processingFee,
      irsWithholding,
    };

    res.status(201).json({
      success: true,
      data: { ...newItem.toObject(), calculations },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}   