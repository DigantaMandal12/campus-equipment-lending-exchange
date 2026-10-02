const connectDB = require("../config/db");

const User = require("../models/User");
const Equipment = require("../models/Equipment");

async function getAdminDashboardData() {
  await connectDB();

  const [
    totalUsers,
    totalLenders,
    totalBorrowers,
    totalEquipment,
    availableEquipment
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({
      role: "LENDER"
    }),

    User.countDocuments({
      role: "BORROWER"
    }),

    Equipment.countDocuments(),

    Equipment.countDocuments({
      status: "AVAILABLE",
      availableQuantity: {
        $gt: 0
      }
    })
  ]);

  return {
    totalUsers,
    totalLenders,
    totalBorrowers,
    totalEquipment,
    availableEquipment,

    activeBorrowings: 0,
    pendingRequests: 0,
    pendingDeposits: 0,
    overdueTransactions: 0,
    reportedDamage: 0
  };
}

async function getLenderDashboardData(
  lenderId
) {
  await connectDB();

  const [
    myEquipment,
    availableEquipment,
    unavailableEquipment
  ] = await Promise.all([
    Equipment.countDocuments({
      owner: lenderId
    }),

    Equipment.countDocuments({
      owner: lenderId,
      status: "AVAILABLE",
      availableQuantity: {
        $gt: 0
      }
    }),

    Equipment.countDocuments({
      owner: lenderId,
      $or: [
        {
          status: "UNAVAILABLE"
        },
        {
          availableQuantity: 0
        }
      ]
    })
  ]);

  return {
    myEquipment,
    availableEquipment,
    unavailableEquipment,

    pendingRequests: 0,
    activeLoans: 0,
    returnedEquipment: 0,
    earnings: 0,
    pendingDeposits: 0
  };
}

async function getBorrowerDashboardData(
  borrowerId
) {
  await connectDB();

  const [
    recommendedEquipment,
    availableEquipment
  ] = await Promise.all([
    Equipment.find({
      status: "AVAILABLE",
      availableQuantity: {
        $gt: 0
      }
    })
      .sort({
        createdAt: -1
      })
      .limit(6)
      .populate(
        "owner",
        "name department trustScore"
      )
      .lean(),

    Equipment.countDocuments({
      status: "AVAILABLE",
      availableQuantity: {
        $gt: 0
      }
    })
  ]);

  const user =
    await User.findById(
      borrowerId
    ).select(
      "name email role trustScore department year"
    ).lean();

  return {
    user,
    recommendedEquipment,
    availableEquipment,

    activeBorrowings: 0,
    pendingRequests: 0,
    dueSoon: 0,
    depositPending: 0,
    ratingCount: 0
  };
}

module.exports = {
  getAdminDashboardData,
  getLenderDashboardData,
  getBorrowerDashboardData
};