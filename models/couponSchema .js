const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  couponStartDate: {
    type: Date,
    required: false,
  },
  couponExpiryDate: {
    type: Date,
    required: false,
  },
  minimumPurchase: {
    type: Number,
    required: true,
    min: 0,
  },
  maximumDiscount: {
    type: Number,
    required: true,
    min: 0,
  },
  currentStatus: {
    type: String,
    enum: ['active', 'expired', 'upcoming', 'Special'],
    required: true,
    default: 'active',
  },
  isListed: {
    type: Boolean,
    required: true,
    default: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  type: {
    type: String,
    enum: ['Special', 'Normal'],
    default: 'Normal',
  },
},{ timestamps: true });

module.exports = mongoose.model('coupons', couponSchema);