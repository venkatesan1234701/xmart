const Review = require("../../models/reviewModel.js");
const mongoose = require("mongoose");

const addReview = async (req, res) => {
  try {
    const userId = req.user?.id; 
    if (!userId) return res.json({ success: false, message: "Login required" });

    const { productId, rating, comment } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId))
      return res.json({ success: false, message: "Invalid product" });

    if (!rating || rating < 1 || rating > 5)
      return res.json({ success: false, message: "Rating must be 1-5" });

    if (!comment || comment.trim() === "")
      return res.json({ success: false, message: "Comment required" });

   
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      await existingReview.save();
      await existingReview.populate("user", "firstName secondName");
      return res.json({ success: true, review: existingReview, message: "Review updated" });
    }

    const review = await Review.create({ product: productId, user: userId, rating, comment });
    await review.populate("user", "firstName secondName");

    res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
};


const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params; 

    if (!mongoose.Types.ObjectId.isValid(id)) return res.json({ reviews: [] });

    const reviews = await Review.find({ product: id })
      .populate("user", "firstName secondName")
      .lean();

    res.json({ reviews });
  } catch (err) {
    console.error(err);
    res.json({ reviews: [] });
  }
};

module.exports = { addReview, getProductReviews };
