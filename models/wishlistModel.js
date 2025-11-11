const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },

        // If the product is a single item without variety
        isItem: {
          type: Boolean,
          required: true,
          default: true,
        },

        // Optional variety details (for products with sizes)
        variety: {
          size: {
            type: String,
            enum: ["S", "M", "L"],
            required: false, // ✅ Not required anymore
          },
          price: {
            type: Number,
            required: false,
          },
          quantity: {
            type: Number,
            required: false,
          },
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure one product per user (avoid duplicates)
wishlistSchema.index(
  { userId: 1, "products.productId": 1 },
  { unique: true, sparse: true }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
