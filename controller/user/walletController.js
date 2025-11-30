
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Wallet = require("../../models/walletSchema");

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

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId });
    }

    const sortedTransactions = wallet.transactions
      .sort((a, b) => b.createdAt - a.createdAt);

    const totalTransactions = sortedTransactions.length;

    const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);

    const totalPages = Math.ceil(totalTransactions / limit);

    res.render("user/wallet", {
      wallet,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions
    });

  } catch (err) {
    console.error("Wallet page error:", err);
    res.status(500).send("Server Error");
  }
};



const createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      console.log(" No user session found");
      return res.json({ success: false, message: "User not logged in" });
    }

    if (!amount || amount <= 0) {
      console.log(" Invalid amount received:", amount);
      return res.json({ success: false, message: "Invalid amount" });
    }

    console.log(" Creating Razorpay wallet order for:", amount);

    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "wallet_" + Date.now(),
    });

    console.log(" Razorpay order created:", order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(" Error creating Razorpay order:", error);
    res.json({ success: false, message: error.message });
  }
}





const verifyWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const userId = req.session.user?.id;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      console.log(" Invalid Razorpay signature!");
      return res.render("user/order-failed");
    }

    console.log("Wallet payment verified successfully");

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) wallet = await Wallet.create({ userId });

    wallet.balance += parseFloat(amount);
    wallet.transactions.push({
      amount,
      type: "Razorpay",
      transactionType: "Credit",
      transactionDetail: "Wallet Top-up",
      transactionId: razorpay_payment_id,
      status: "completed",
    });

    await wallet.save();

    return res.render("user/wallet-success", {
      message: `₹${amount} added to your wallet successfully!`,
    });
  } catch (error) {
    console.error(" Wallet verification error:", error);
    return res.render("user/order-failed");
  }
};




module.exports = {
  getWalletPage,
  createWalletOrder,
  verifyWalletPayment,
};





