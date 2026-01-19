const Coupon = require('../../models/couponSchema ');
const STATUS = require('../../utils/statusCodes');
const AppError = require('../../utils/appError')
const getCoupons = async (req, res) => {
  try {
    if (!req.session.isAdminLogged) {
      return res.redirect("/admin/login");
    }
    const now = new Date();
    await Coupon.updateMany(
      { couponExpiryDate: { $lt: now }, currentStatus: { $ne: "expired" } },
      { $set: { currentStatus: "expired" } }
    )
    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    let query = {};

   if (searchQuery) {
  const numericSearch = Number(searchQuery.replace("%", ""));
  const isNumeric = !isNaN(numericSearch);

  query.$or = [
    { couponCode: { $regex: searchQuery, $options: "i" } },
    { couponName: { $regex: searchQuery, $options: "i" } },
  ];

  if (isNumeric) {
    query.$or.push({ discount: numericSearch })
  }
}

    const totalCoupons = await Coupon.countDocuments(query);

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("admin/coupons", {
      coupons,
      search: searchQuery,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading coupons:", error);
    res.status(STATUS.INTERNAL_SERVER_ERROR).send("Failed to load coupons");
  }
};



const addCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      discountPercentage,
      minimumPurchase,
      maximumDiscount,
      couponStartDate,
      couponExpiryDate,
      currentStatus,
    } = req.body;

    if (new Date(couponExpiryDate) < new Date(couponStartDate)) {
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: "Expiry date cannot be before start date" });
    }

    const existingCoupon = await Coupon.findOne({
  couponCode: { $regex: `^${couponCode}$`, $options: "i" }
});

if (existingCoupon) {
  return res.status(STATUS.BAD_REQUEST).json({
    success: false,
    message: "Coupon code already exists"
  });
}

    const newCoupon = new Coupon({
      couponCode,
      discountPercentage,
      minimumPurchase,
      maximumDiscount,
      couponStartDate,
      couponExpiryDate,
      currentStatus,
    });

    await newCoupon.save();

    return res.status(STATUS.CREATED).json({ success: true, message: "Coupon added successfully" });

  } catch (error) {
    // console.error("Error adding coupon:", error);

    if (error.code === 11000) {
      return res.status(STATUS.BAD_REQUEST).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error, please try again"
    });
  }
};


const updateCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      discountPercentage,
      minimumPurchase,
      maximumDiscount,
      couponStartDate,
      couponExpiryDate,
      currentStatus,
    } = req.body
    
    if (new Date(couponExpiryDate) < new Date(couponStartDate)) {
      return res.status(STATUS.BAD_REQUEST).json({
        success: false,
        message: "Expiry date cannot be before start date",
      });
    }

    const existingCoupon = await Coupon.findOne({
      _id: { $ne: req.params.id },
      couponCode: { $regex: `^${couponCode}$`, $options: "i" },
    });

    if (existingCoupon) {
      return res.status(STATUS.BAD_REQUEST).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        couponCode,
        discountPercentage,
        minimumPurchase,
        maximumDiscount,
        couponStartDate,
        couponExpiryDate,
        currentStatus,
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(STATUS.NOT_FOUND).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(STATUS.OK).json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });

  } catch (error) {
    console.error("Error updating coupon:", error);

    if (error.code === 11000) {
      return res.status(STATUS.BAD_REQUEST).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
};


const deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(STATUS.NOT_FOUND).json({ error: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete coupon" });
  }
};

const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(STATUS.NOT_FOUND).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch coupon" });
  }
};


module.exports = {
    addCoupon,
    getCoupons,
    deleteCoupon,
    updateCoupon,
    getCouponById
}