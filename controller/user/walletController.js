

const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Wallet = require("../../models/walletSchema");
const STATUS = require('../../utils/statusCodes');
const AppError = require('../../utils/appError')

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getWalletPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/signin");

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const objectUserId = new mongoose.Types.ObjectId(userId);

    let wallet = await Wallet.findOne({ userId: objectUserId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: objectUserId,
        balance: 0,
        transactions: [],
      });
    }

    const transactions = Array.isArray(wallet.transactions)
      ? wallet.transactions
      : [];

    const sortedTransactions = [...transactions].sort((a, b) => {
      const d1 = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const d2 = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return d2 - d1;
    });

    const totalTransactions = sortedTransactions.length;
    const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalTransactions / limit);

    res.render("user/wallet", {
      wallet,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions,
    });
  } catch (err) {
    console.error("Wallet page error:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).send("Something went wrong on our side!");
  }
};


const createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user?.id;

    if (!userId || !amount || amount <= 0) {
      return res.json({ success: false });
    }

    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "wallet_" + Date.now(),
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create wallet order error:", err);
    res.json({ success: false });
  }
};


const verifyWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;

    const userId = req.session.user?.id;
    if (!userId) return res.json({ success: false });

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.json({ success: false });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    let wallet = await Wallet.findOne({ userId: objectUserId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: objectUserId,
        balance: 0,
        transactions: [],
      });
    }

    const refId = "REF" + Math.floor(100000 + Math.random() * 900000);

await wallet.addTransaction({
  amount: Number(amount),
  type: "Razorpay",
  transactionType: "Credit",
  transactionDetail: "Wallet Top-up",
  transactionId: refId,  
  razorpayPaymentId: razorpay_payment_id, 
  status: "completed",
});


    res.json({ success: true });
  } catch (err) {
    console.error("Verify wallet payment error:", err);
    res.json({ success: false });
  }
};

module.exports = {
  getWalletPage,
  createWalletOrder,
  verifyWalletPayment,
};




