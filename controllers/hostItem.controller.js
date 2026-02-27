import HostItem from "../models/hostItems.js";


// 🔹 Calculation Function
const calculateItem = (item) => {
  const totalSpots = 50; // You can later store this in DB
  const ticketPrice = Math.ceil(item.desiredNetPayout / totalSpots);

  const totalPot = ticketPrice * totalSpots;
  const platformFee = totalPot * 0.1;
  const processingFee = totalPot * 0.036;
  const irsWithholding = totalPot * 0.25;

  return {
    totalSpots,
    ticketPrice,
    totalPot,
    platformFee,
    processingFee,
    irsWithholding
  };
};


// 🔹 CREATE ITEM
export const createHostItem = async (req, res) => {
  try {
    const newItem = await HostItem.create(req.body);

    res.status(201).json({
      success: true,
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// 🔹 GET ITEM WITH CALCULATIONS
export const getHostItemById = async (req, res) => {
  try {
    const item = await HostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    const calculations = calculateItem(item);

    res.status(200).json({
      success: true,
      data: {
        ...item._doc,
        calculations
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
