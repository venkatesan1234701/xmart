const mongoose = require("mongoose");

const productOfferSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  offerPercentage: {
    type: Number,
    required: true,
    min: [1, "Offer percentage must be at least 1%"],
    max: [100, "Offer percentage cannot exceed 100%"],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return this.startDate < value;
      },
      message: "End date must be after start date",
    },
  },
  currentStatus: {
    type: String,
    enum: ["active", "upcoming", "expired"],
    default: "active",
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const ProductOffer = mongoose.models.ProductOffer || mongoose.model("ProductOffer", productOfferSchema);

module.exports = ProductOffer;
