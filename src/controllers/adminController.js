import seller from "../models/sellerProfile.js";
import SellerProfile from "../models/sellerProfile.js";
import HostItem from "../models/hostItems.js";
import Seller from "../models/sellerProfile.js";
import hostItem from "../models/hostItems.js";
// ✅ DASHBOARD
export const getDashboard = async (req, res) => {
  try {
    const now = new Date();

    const totalSellers = await Seller.countDocuments();
    const pendingApprovals = await Seller.countDocuments({ status: "Pending" });

    const liveItems = await HostItem.countDocuments({
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const activeItemsRaw = await HostItem.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select("itemTitle startDate endDate")
      .limit(10);

    const activeItems = activeItemsRaw.map((item, i) => ({
      srNo: i + 1,
      name: item.itemTitle,
      startDate: item.startDate,
      timeline:
        Math.max(
          0,
          Math.ceil((new Date(item.endDate) - now) / (1000 * 60 * 60 * 24))
        ) + " days",
    }));

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const winnersThisMonth = await HostItem.countDocuments({
      "winner.date": { $gte: firstOfMonth },
    });

    const recentWinnersRaw = await HostItem.find({
      "winner.name": { $exists: true },
    })
      .sort({ "winner.date": -1 })
      .limit(5)
      .select("winner itemTitle");

    const recentWinners = recentWinnersRaw.map((item) => ({
      name: item.winner.name,
      itemTitle: item.itemTitle,
      date: item.winner.date,
    }));

    res.json({
      stats: {
        totalSellers,
        liveItems,
        pendingApprovals,
        winnersThisMonth,
      },
      activeItems,
      recentWinners,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sellers = await SellerProfile.find({ status: "Pending" })
      .populate("userId", "name email")
      .skip(skip)
      .limit(limit);

    const totalSellers = await SellerProfile.countDocuments();

    const formattedSellers = sellers
      .filter((s) => s.userId)
      .map((s) => ({
        id: s._id,
        name: s.userId.name,
        email: s.userId.email,
        submitted: s.status,
        createdAt: s.createdAt,
        attachment: {
          govtIdFront: s.attachment?.govtIdFront || null,
          govtIdBack: s.attachment?.govtIdBack || null,
          selfieWithId: s.attachment?.selfieWithId || null,
        },
      }));

    res.json({
      id: "pendingSellers",
      sellers: formattedSellers,
      page,
      totalPages: Math.ceil(totalSellers / limit),
      totalSellers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

  export const getSellers = async (req, res) => {
    try {
      const { status } = req.query;
      const now = new Date();

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      let sellersRaw = await Seller.find({ status })
        .populate("userId", "email")
        .limit(50);

      let sellers = [];

      if (status === "Approved") {
        sellers = sellersRaw.map((seller, index) => ({
          srNo: index + 1,
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.userId?.email || "N/A",
          joined: seller.createdAt,
          itemsListed: seller.itemsListed || 0,
          timeline:
            Math.max(
              0,
              Math.ceil(
                (now - new Date(seller.createdAt)) / (1000 * 60 * 60 * 24)
              )
            ) + " days",
          action: "View / Block",
        }));
      } else if (status === "Pending") {
        sellers = sellersRaw.map((seller) => ({
          _id: seller._id,
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.userId?.email || "N/A",
          submitted: seller.createdAt,
          attachments: seller.documents || [],
          action: "Approve / Reject",
        }));
      } else if (status === "Rejected") {
        sellers = sellersRaw.map((seller) => ({
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.userId?.email || "N/A",
          blockedOn: seller.updatedAt,
          adminNotes: seller.adminNotes || "N/A",
          action: "Unblock",
        }));
      }

      res.json({ sellers });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

export const updateSellerStatus = async (req, res) => {
  try {
    const { status } = req.body; // "Approved" or "Rejected"
    const { id } = req.params;

    // Validate status
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Update seller profile
    const updatedSeller = await SellerProfile.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).populate("userId", "name email");

    if (!updatedSeller) { 
      return res.status(404).json({ error: "Seller not found" });
    }

    res.json({
      message: `Seller has been ${status.toLowerCase()}`,
      seller: updatedSeller,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}


// GET /all-sellers?status=Approved/Rejected/Blocked
export const getAllSellers = async (req, res) => {
  try {
    const { status } = req.query; // e.g., "Rejected"

    if (!status) return res.status(400).json({ error: "Status query is required" });

    // Split by comma for multiple statuses
    const statusArray = status.split(",");

    const sellers = await SellerProfile.find({ status: { $in: statusArray } })
      .populate("userId", "name email");

    res.json({ sellers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// get the list of all host items with optional status filter (Live, Sold Out, Expired)
export const getAllHostItems = async (req, res) => {
  try {
    const query = {};

    // Optional: filter by status if you add a status field later
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Fetch host items, newest first
    const items = await hostItem.find(query)
      .populate("userId", "name email") // optional: populate seller info
      .sort({ createdAt: -1 })
      .lean();

    // Map items to a format suitable for frontend table
    const mappedItems = items.map((item) => ({
      id: item._id,
      name: item.itemTitle,
      sellerName: item.userId?.name || "Unknown",
      fmv: item.desiredNetPayout,
      ticketPrice: item.ticketPrice,
      slotsFilled: item.totalTickets - item.availableTickets,
      // totalSlots: item.totalTickets,
      timeLeft: item.endDate
        ? Math.max(0, Math.ceil((item.endDate - new Date()) / (1000 * 60 * 60 * 24))) + " days"
        : "N/A",
      status: item.availableTickets === 0
        ? "Sold Out"
        : new Date() > item.endDate
        ? "Expired"
        : "Live",
    }));

    res.status(200).json({ success: true, items: mappedItems });
  } catch (err) {
    console.error("Error fetching host items:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};