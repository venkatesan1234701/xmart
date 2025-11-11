const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  productPic: { type: [String], default: [] },

  sizes: {
    type: [String],
    default: ["S", "M", "L"],
    validate: {
      validator: v => v.length === 3,
      message: props => `Sizes array must always have 3 elements`
    }
  },
  prices: {
    type: [Number],
    default: [0, 0, 0],
    validate: {
      validator: v => v.length === 3,
      message: props => `Prices array must have 3 elements matching sizes`
    }
  },
  quantities: {
    type: [Number],
    default: [0, 0, 0],
    validate: {
      validator: v => v.length === 3,
      message: props => `Quantities array must have 3 elements matching sizes`
    }
  },

  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema)
