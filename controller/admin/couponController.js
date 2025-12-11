const Coupon = require('../../models/couponSchema ');

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
    res.status(500).send("Failed to load coupons");
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
      return res.status(400).json({ success: false, message: "Expiry date cannot be before start date" });
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

    return res.status(201).json({ success: true, message: "Coupon added successfully" });

  } catch (error) {
    // console.error("Error adding coupon:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    return res.status(500).json({
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
    } = req.body;

    if (new Date(couponExpiryDate) < new Date(couponStartDate)) {
      return res.status(400).json({ success: false, message: "Expiry date cannot be before start date" });
    }

    const existing = await Coupon.findOne({
      _id: { $ne: req.params.id },
      couponCode: { $regex: `^${couponCode}$`, $options: "i" }
    });
if (existing) {
  return res.status(400).json({
    success: false,
    error: "Coupon code already exists"
  });
}


    const updated = await Coupon.findByIdAndUpdate(
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

    if (!updated) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updated
    });

  } catch (error) {
    console.error("Error updating coupon:", error);

   if (error.code === 11000) {
  return res.status(400).json({
    success: false,
    error: "Coupon code already exists"
  });
}


    res.status(500).json({ success: false, message: "Failed to update coupon" });
  }
}



const deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
};

const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coupon" });
  }
};


module.exports = {
    addCoupon,
    getCoupons,
    deleteCoupon,
    updateCoupon,
    getCouponById
}