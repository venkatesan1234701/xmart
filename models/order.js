

const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    paymentDetails: {
      method: {
        type: String,
        enum: ["Razorpay", "Cash on Delivery", "Wallet"],
        required: true,
      },
      transactionId: {
        type: String,
        default: null,
      },
      status: {
        type: String,
        enum: [
          "Pending",
          "Completed",
          "Failed",
          "Refunded",
          "Cancelled",
          "Partially Refunded",
        ],
        default: "Pending",
      },
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    coupon: {
      name: { type: String, default: null },
      discount: { type: Number, default: 0 }, 
      isMax: { type: Boolean, default: false },
      maxPurchase: { type: Number, default: 0 },
    },

    orderStatus: {
      type: String,
      enum: [
        "payment faild",
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returning",
        "Returned",
      ],
      default: "Pending",
    },

    // products: [
    //   {
    //     productId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Product",
    //       required: true,
    //     },
    //     name: { type: String, required: true },
    //     selectedSize: {
    //       type: String,
    //       enum: ["S", "M", "L"],
    //       required: true,
    //     },
    //     quantity: { type: Number, required: true },
    //     pricePerUnit: { type: Number, required: true },
    //     totalPrice: { type: Number, required: true },

    //     itemStatus: {
    //       type: String,
    //       enum: [
    //         "Pending",
    //         "Processing",
    //         "Shipped",
    //         "Delivered",
    //         "Cancelled",
    //         "Return Requested",
    //         "Returning",
    //         "Returned",
    //       ],
    //       default: "Pending",
    //     },
    //   },
    // ],


    products: [
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: String,
    selectedSize: String,
    quantity: Number,
    pricePerUnit: Number,
    totalPrice: Number,

    itemStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
        "Returning",
        "Returned",
      ],
      default: "Pending",
    },

    returnReason: {
      type: String,
      default: null,
    },
    returnRequestedAt: {
      type: Date,
      default: null,
    }
  }
],

    shippingAddress: {
      firstName: { type: String, required: true },
      addressLine1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zipCode: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
