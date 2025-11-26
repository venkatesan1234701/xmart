




// const mongoose = require("mongoose");

// const walletSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     index: true,
//   },
//   balance: {
//     type: Number,
//     required: true,
//     default: 0,
//     min: 0,
//   },
//   transactions: [
//     {
//       amount: {
//         type: Number,
//         required: true,
//         min: 0,
//       },
//       type: {
//         type: String,
//         enum: ["Razorpay", "OrderPayment", "OrderRefund"],
//         required: true,
//       },
//       status: {
//         type: String,
//         enum: ["pending", "completed", "failed"],
//         default: "completed",
//       },
//       transactionType: {
//         type: String,
//         enum: ["Credit", "Debit"],
//         required: true,
//       },
//       transactionDetail: {
//         type: String,
//         default: "",
//       },
//       transactionId: {
//         type: String,
//         default: null,
//       },
//       isOrderRedirect: {
//         type: Boolean,
//         default: false,
//       },
//       orderId: {
//         type: String,
//         default: null,
//       },
//       createdAt: {
//         type: Date,
//         default: Date.now,
//       },
//     },
//   ],
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// walletSchema.pre("save", function (next) {
//   this.updatedAt = Date.now();
//   next();
// })
// walletSchema.methods.addTransaction = async function (txn) {
//   this.transactions.push(txn);

//   if (txn.transactionType === "Credit") {
//     this.balance += txn.amount;
//   } else if (txn.transactionType === "Debit") {
//     this.balance -= txn.amount;
//     if (this.balance < 0) this.balance = 0;
//   }

//   await this.save();
//   return this;
// };

// const Wallet = mongoose.model("Wallet", walletSchema);

// module.exports = Wallet;






const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  transactions: [
    {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      type: {
        type: String,
        enum: ["Razorpay", "OrderPayment", "OrderRefund", "Referral"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "completed",
      },
      transactionType: {
        type: String,
        enum: ["Credit", "Debit"],
        required: true,
      },
      transactionDetail: {
        type: String,
        default: "",
      },
      transactionId: {
        type: String,
        default: null,
      },
      isOrderRedirect: {
        type: Boolean,
        default: false,
      },
      orderId: {
        type: String,
        default: null,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})
walletSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

walletSchema.methods.addTransaction = async function (txn) {
  this.transactions.push(txn);

  if (txn.transactionType === "Credit") {
    this.balance += txn.amount;
  } else if (txn.transactionType === "Debit") {
    this.balance -= txn.amount;
    if (this.balance < 0) this.balance = 0;
  }

  await this.save();
  return this;
};

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;




