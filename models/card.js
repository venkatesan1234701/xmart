

const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      set: (value) => Math.round(value),
    },
    shippingCost: { type: Number, required: true, default: 40 },
    grandTotal: {
      type: Number,
      required: true,
      set: (value) => Math.round(value),
    },

    coupon: {
      name: { type: String, default: null },
      discount: { type: Number, default: 0 },
      isMax: { type: Boolean, default: false },
      maxPurchase: { type: Number, default: 0 },
    },

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },

        quantity: { type: Number, required: true },

        selectedSize: {
          type: String,
          enum: ['S', 'M', 'L'],
          required: true,
        },

        originalPrice: { type: Number, required: true },

        pricePerUnit: { type: Number, required: true },
        productDiscount: { type: Number, default: 0 },
      },
    ],

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', CartSchema);
