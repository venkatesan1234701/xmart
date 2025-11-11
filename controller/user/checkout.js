

const { v4: uuidv4 } = require("uuid");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv");
const Order = require("../../models/order")
const Product = require("../../models/productModel")
const Cart = require("../../models/card");
const Address = require("../../models/address");
const Wallet = require("../../models/walletSchema")
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema ")

dotenv.config()





const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const checkout = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/signin");

    const { selectedAddress, paymentMethod } = req.body;

    const address = await Address.findOne({ _id: selectedAddress, userId });
    if (!address) return res.status(400).send("Invalid address selected");

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      strictPopulate: false,
    });
    if (!cart || cart.products.length === 0)
      return res.status(400).send("Cart is empty");

    const subTotal = cart.subtotal || 0;
    const discount = cart.coupon?.discount || 0;
    const shippingCost = cart.shippingCost || 40;
    const grandTotal = cart.grandTotal || subTotal - discount + shippingCost;

    // 🪙 Wallet Payment Logic
    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) return res.status(400).send("Wallet not found");

      if (wallet.balance < grandTotal) {
        return res.render("user/order-failed", {
          orderId: "N/A",
          grandTotal,
          paymentMethod: "Wallet",
          message: "Insufficient wallet balance",
        });
      }

      // ✅ Deduct amount
      wallet.balance -= grandTotal;
      await wallet.save();

      // ✅ Reduce stock
      for (const item of cart.products) {
        const product = item.productId;
        if (!product) continue;
        const sizeIndex = product.sizes.indexOf(item.selectedSize);
        if (sizeIndex === -1) continue;
        const availableQty = product.quantities[sizeIndex];
        if (availableQty < item.quantity)
          return res.status(400).send(`Not enough stock for ${product.name}`);
        product.quantities[sizeIndex] -= item.quantity;
        await product.save();
      }

      const newOrder = new Order({
        userId,
        orderId: "ORD" + Math.floor(100000 + Math.random() * 900000),
        paymentDetails: { method: "Wallet", status: "Completed" },
        subTotal,
        overallDiscountAmount: discount,
        shippingCost,
        grandTotal,
        products: cart.products.map((item) => ({
          productId: item.productId?._id,
          name: item.productId?.name,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.pricePerUnit * item.quantity,
        })),
        shippingAddress: {
          firstName: address.firstName,
          addressType: address.addressType,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          country: address.country,
          zipCode: address.zipCode,
        },
      });

      await newOrder.save();
      await Cart.findOneAndDelete({ userId });

      return res.render("user/order-success", {
        orderId: newOrder.orderId,
        grandTotal,
        paymentMethod: "Wallet",
        address,
      });
    }

    if (paymentMethod === "Razorpay") {
      const options = {
        amount: grandTotal * 100,
        currency: "INR",
        receipt: "order_rcptid_" + Math.floor(Math.random() * 100000),
      };
      const order = await razorpay.orders.create(options);

      return res.render("user/razorpay-checkout", {
        key_id: process.env.RAZORPAY_KEY_ID,
        order,
        grandTotal,
        address,
      });
    }

    for (const item of cart.products) {
      const product = item.productId;
      if (!product) continue;
      const sizeIndex = product.sizes.indexOf(item.selectedSize);
      if (sizeIndex === -1) continue;
      const availableQty = product.quantities[sizeIndex];
      if (availableQty < item.quantity)
        return res.status(400).send(`Not enough stock for ${product.name}`);
      product.quantities[sizeIndex] -= item.quantity;
      await product.save();
    }

    const newOrder = new Order({
      userId,
      orderId: "ORD" + Math.floor(100000 + Math.random() * 900000),
      paymentDetails: {
        method: "Cash on Delivery",
        status: "Pending",
      },
      subTotal,
      overallDiscountAmount: discount,
      shippingCost,
      grandTotal,
      products: cart.products.map((item) => ({
        productId: item.productId?._id,
        name: item.productId?.name,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.pricePerUnit * item.quantity,
      })),
      shippingAddress: {
        firstName: address.firstName,
        addressType: address.addressType,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
      },
    });

    await newOrder.save();
    await Cart.findOneAndDelete({ userId });

    return res.render("user/order-success", {
      orderId: newOrder.orderId,
      grandTotal,
      paymentMethod,
      address,
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    return res.render("user/order-failed", {
      orderId: "N/A",
      grandTotal: 0,
      paymentMethod: "Unknown",
      message: "Something went wrong during checkout",
    });
  }
};



// const getCheckoutPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user) return res.redirect("/signin");

//     const cart = await Cart.findOne({ userId: user.id }).populate({
//       path: "products.productId",
//       model: "Product",
//       select: "name productPic prices sizes",
//     });

//     if (!cart || !cart.products || cart.products.length === 0) {
//       return res.render("user/empty-cart-alert", { user });
//     }

//     const subtotal = cart.products.reduce(
//       (sum, p) => sum + p.pricePerUnit * p.quantity,
//       0
//     );
//     const shippingCost = cart.shippingCost || 40;
//     const grandTotal = subtotal + shippingCost;

//     cart.subtotal = subtotal;
//     cart.grandTotal = grandTotal;
//     await cart.save();

//     const addresses = await Address.find({ userId: user.id, isActive: true })
//     const wallet = await Wallet.findOne({ userId: user.id })

//     res.render("user/checkout", {
//       user,
//       cart,
//       subtotal,
//       shippingCost,
//       grandTotal,
//       addresses,
//       wallet, 
//     });
//   } catch (err) {
//     console.error(" Checkout page error:", err);
//     res.status(500).send("Server error while loading checkout");
//   }
// };




// const checkout = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) return res.redirect("/signin");

//     const { selectedAddress, paymentMethod } = req.body;

//     // ✅ Get user address
//     const address = await Address.findOne({ _id: selectedAddress, userId });
//     if (!address) return res.status(400).send("Invalid address selected");

//     // ✅ Get user's cart
//     const cart = await Cart.findOne({ userId }).populate({
//       path: "products.productId",
//       strictPopulate: false,
//     });
//     if (!cart || cart.products.length === 0)
//       return res.status(400).send("Cart is empty");

//     // ✅ Calculate totals
//     const subTotal = cart.subtotal || 0;
//     const discount = cart.coupon?.discount || 0;
//     const shippingCost = cart.shippingCost || 40;
//     const grandTotal = cart.grandTotal || subTotal - discount + shippingCost;

//     // ✅ If Razorpay selected
//     if (paymentMethod === "Razorpay") {
//       const options = {
//         amount: grandTotal * 100,
//         currency: "INR",
//         receipt: "order_rcptid_" + Math.floor(Math.random() * 100000),
//       };

//       const order = await razorpay.orders.create(options);
//       console.log("✅ Razorpay order created:", order.id);

//       return res.render("user/razorpay-checkout", {
//         key_id: process.env.RAZORPAY_KEY_ID,
//         order,
//         grandTotal,
//         address,
//       });
//     }

//     // ✅ COD or Wallet Payment (direct success)
//     // Stock should be reduced immediately for COD
//     for (const item of cart.products) {
//       const product = item.productId;
//       if (!product) continue;
//       const sizeIndex = product.sizes.indexOf(item.selectedSize);
//       if (sizeIndex === -1) continue;
//       const availableQty = product.quantities[sizeIndex];
//       if (availableQty < item.quantity)
//         return res.status(400).send(`Not enough stock for ${product.name}`);
//       product.quantities[sizeIndex] -= item.quantity;
//       await product.save();
//     }

//     const newOrder = new Order({
//       userId,
//       orderId: "ORD" + Math.floor(100000 + Math.random() * 900000),
//       paymentDetails: {
//         method: paymentMethod,
//         status: paymentMethod === "Cash on Delivery" ? "Pending" : "Completed",
//       },
//       subTotal,
//       overallDiscountAmount: discount,
//       shippingCost,
//       grandTotal,
//       products: cart.products.map((item) => ({
//         productId: item.productId?._id,
//         name: item.productId?.name,
//         selectedSize: item.selectedSize,
//         quantity: item.quantity,
//         pricePerUnit: item.pricePerUnit,
//         totalPrice: item.pricePerUnit * item.quantity,
//       })),
//       shippingAddress: {
//         firstName: address.firstName,
//         addressType: address.addressType,
//         addressLine1: address.addressLine1,
//         addressLine2: address.addressLine2,
//         city: address.city,
//         state: address.state,
//         country: address.country,
//         zipCode: address.zipCode,
//       },
//     });

//     await newOrder.save();
//     await Cart.findOneAndDelete({ userId });

//     return res.render("user/order-success", {
//       orderId: newOrder.orderId,
//       grandTotal,
//       paymentMethod,
//       address,
//     });
//   } catch (error) {
//     console.error("❌ Checkout Error:", error);
//     return res.status(500).send("Something went wrong during checkout");
//   }
// };

// const getCheckoutPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user) {
//       console.log(" No user session found");
//       return res.redirect("/signin");
//     }

//     const cart = await Cart.findOne({ userId: user.id }).populate({
//       path: "products.productId",
//       model: "Product",
//       select: "name productPic prices sizes",
//     });

//     if (!cart || !cart.products || cart.products.length === 0) {
//       return res.render("user/empty-cart-alert", { user });
//     }

//     const subtotal = cart.products.reduce(
//       (sum, p) => sum + p.pricePerUnit * p.quantity,
//       0
//     );
//     const shippingCost = cart.shippingCost || 40;
//     const grandTotal = subtotal + shippingCost;

//     cart.subtotal = subtotal;
//     cart.grandTotal = grandTotal;
//     await cart.save();

//     const addresses = await Address.find({ userId: user.id, isActive: true });

//     res.render("user/checkout", {
//       user,
//       cart,
//       subtotal,
//       shippingCost,
//       grandTotal,
//       addresses,
//       wallet,
//     });
//   } catch (err) {
//     console.error(" Checkout page error:", err);
//     res.status(500).send("Server error while loading checkout");
//   }
// };


const getCheckoutPage = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/signin");

    const cart = await Cart.findOne({ userId: user.id }).populate({
      path: "products.productId",
      model: "Product",
      select: "name productPic prices sizes",
    });

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.render("user/empty-cart-alert", { user });
    }

    const subtotal = cart.products.reduce(
      (sum, p) => sum + p.pricePerUnit * p.quantity,
      0
    );

    const shippingCost = cart.shippingCost || 40;

    const couponDiscount = cart.coupon?.discount || 0;

    const grandTotal = subtotal + shippingCost - couponDiscount;

    cart.subtotal = subtotal;
    cart.grandTotal = grandTotal;
    await cart.save();

    const addresses = await Address.find({ userId: user.id, isActive: true });
    const wallet = await Wallet.findOne({ userId: user.id });

    res.render("user/checkout", {
      user,
      cart,
      subtotal,
      shippingCost,
      couponDiscount,
      grandTotal,
      addresses,
      wallet,
    });
  } catch (err) {
    console.error(" Checkout page error:", err);
    res.status(500).send("Server error while loading checkout");
  }
};


const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.session.user?.id;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.log(" Invalid payment signature");
      return res.render("user/order-failed");
    }

    console.log(" Payment verified successfully");

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      strictPopulate: false,
    });
    const address = await Address.findOne({ userId });
    if (!cart) return res.status(400).send("Cart not found");

    const subTotal = cart.subtotal || 0;
    const discount = cart.coupon?.discount || 0;
    const shippingCost = cart.shippingCost || 40;
    const grandTotal = cart.grandTotal || subTotal - discount + shippingCost;

    
    for (const item of cart.products) {
      const product = item.productId;
      if (!product) continue;
      const sizeIndex = product.sizes.indexOf(item.selectedSize);
      if (sizeIndex === -1) continue;
      const availableQty = product.quantities[sizeIndex];
      if (availableQty < item.quantity)
        return res.status(400).send(`Not enough stock for ${product.name}`);
      product.quantities[sizeIndex] -= item.quantity;
      await product.save();
    }

    const newOrder = new Order({
      userId,
      orderId: "ORD" + Math.floor(100000 + Math.random() * 900000),
      paymentDetails: {
        method: "Razorpay",
        status: "Completed",
        paymentId: razorpay_payment_id,
      },
      subTotal,
      overallDiscountAmount: discount,
      shippingCost,
      grandTotal,
      products: cart.products.map((item) => ({
        productId: item.productId?._id,
        name: item.productId?.name,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.pricePerUnit * item.quantity,
      })),
      shippingAddress: {
        firstName: address.firstName,
        addressType: address.addressType,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
      },
    });

    await newOrder.save();
    await Cart.findOneAndDelete({ userId });

    return res.render("user/order-success", {
      orderId: newOrder.orderId,
      grandTotal,
      paymentMethod: "Razorpay",
      address,
    });

  } catch (error) {
    console.error("Razorpay Verification Error:", error);
    return res.render("user/order-failed");
  }
};


const paymentFailed = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/signin");

    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const address = await Address.findOne({ userId });

    if (!cart || !address) {
      return res.status(400).send("Cart or Address not found");
    }

    const subTotal = cart.subtotal || 0;
    const discount = cart.coupon?.discount || 0;
    const shippingCost = cart.shippingCost || 40;
    const grandTotal = cart.grandTotal || subTotal - discount + shippingCost;

    const failedOrder = new Order({
      userId,
      orderId: "ORD" + Math.floor(100000 + Math.random() * 900000),
      paymentDetails: {
        method: "Razorpay",
        status: "Failed",
        transactionId: null,
      },
      grandTotal,
      orderStatus: "Cancelled",
      products: cart.products.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.pricePerUnit * item.quantity,
      })),
      shippingAddress: {
        firstName: address.firstName,
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
      },
    });

    await failedOrder.save();
    await Cart.findOneAndDelete({ userId });

    return res.render("user/order-failed", {
      orderId: failedOrder.orderId,
      grandTotal,
      paymentMethod: "Razorpay",
      address,
      message: "Payment failed, order cancelled.",
    });
  } catch (error) {
    console.error(" Error handling payment failed:", error);
    return res.render("user/order-failed", {
      orderId: "N/A",
      grandTotal: 0,
      paymentMethod: "Unknown",
      message: "Something went wrong while handling failed payment.",
    });
  }
};




const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/signin");

    const search = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    let filter = { userId };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { orderId: { $regex: searchRegex } },
        { "paymentDetails.status": { $regex: searchRegex } },
      ];

      const parsedDate = new Date(search);
      if (!isNaN(parsedDate.getTime())) {
        const nextDay = new Date(parsedDate);
        nextDay.setDate(parsedDate.getDate() + 1);
        filter.$or.push({
          createdAt: { $gte: parsedDate, $lt: nextDay },
        });
      }
    }

    let orders = await Order.find(filter)
      .populate({
        path: "products.productId",
        select: "name productPic",
      })
      .sort({ createdAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();

      orders = orders.filter(order => {
        const matchProductName = order.products.some(
          p =>
            p.productId?.name &&
            p.productId.name.toLowerCase().includes(searchLower)
        );

        const matchOrderId = order.orderId?.toLowerCase().includes(searchLower);
        const matchStatus = order.paymentDetails?.status?.toLowerCase().includes(searchLower);

        return matchProductName || matchOrderId || matchStatus;
      });
    }

    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const paginatedOrders = orders.slice(skip, skip + limit);

    res.render("user/orders", {
      orders: paginatedOrders,
      search,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error(" Error fetching orders:", error);
    res.status(500).send("Something went wrong while fetching your orders");
  }
};




const cancelSingleItem = async (req, res) => {
  try {
    const { productId, selectedSize } = req.body;
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const productItem = order.products.find(
      (p) =>
        p.productId._id.toString() === productId &&
        p.selectedSize === selectedSize
    );

    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    if (productItem.itemStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Product already cancelled" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found in database" });
    }

    const sizeIndexMap = { S: 0, M: 1, L: 2 };
    const index = sizeIndexMap[selectedSize];
    if (index === undefined) {
      return res.status(400).json({ success: false, message: "Invalid size" });
    }

    product.quantities[index] += productItem.quantity;
    await product.save();

    productItem.itemStatus = "Cancelled";
    await order.save();

    if (
      order.paymentDetails.method === "Razorpay" ||
      order.paymentDetails.method === "Wallet"
    ) {
      const refundAmount = productItem.totalPrice;
      const userId = order.userId;

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: 0,
          transactions: [],
        });
      }

      wallet.transactions.push({
        amount: refundAmount,
        type: "OrderRefund",
        status: "completed",
        transactionType: "Credit",
        transactionDetail: `Refund for cancelled product: ${productItem.productId.name}`,
        transactionId: order._id.toString(),
        isOrderRedirect: false,
        orderId: order._id.toString(),
      })

      wallet.balance += refundAmount;
      await wallet.save();

      console.log(` ₹${refundAmount} refunded to wallet for user ${userId}`);
    }

    const allCancelled = order.products.every((p) => p.itemStatus === "Cancelled");
    if (allCancelled) {
      order.orderStatus = "Cancelled";
      order.paymentDetails.status = "Cancelled"; 
      await order.save();
      console.log(` Entire order ${orderId} cancelled — payment status updated`);
    }

    return res.json({
      success: true,
      message: "Product cancelled successfully, stock restored and refund processed (if applicable)",
    });
  } catch (err) {
    console.error(" Cancel Single Item Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling product",
    });
  }
};



const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const returnOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, selectedSize } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    if (!orderId || !productId || !selectedSize) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const productItem = order.products.find(
      (p) => p.productId._id.toString() === productId && p.selectedSize === selectedSize
    );

    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    if (productItem.itemStatus === "Returned") {
      return res.status(400).json({ success: false, message: "This product is already returned" });
    }

    productItem.itemStatus = "Returned";

    const product = await Product.findById(productId);
    if (product) {
      const sizeIndex = product.sizes.indexOf(selectedSize);
      if (sizeIndex !== -1) {
        product.quantities[sizeIndex] += productItem.quantity;
        await product.save();
      }
    }

    const price =
      Number(productItem.price) ||
      Number(productItem.pricePerUnit) ||
      Number(productItem.productId?.price) ||
      0;
    const qty = Number(productItem.quantity) || 1;
    const refundAmount = price * qty;

    if (isNaN(refundAmount) || refundAmount <= 0) {
      console.error("Invalid refund amount calculation", { price, qty });
      return res.status(400).json({ success: false, message: "Invalid refund amount" });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

    const refundTxn = {
      amount: refundAmount,
      type: "OrderRefund",
      status: "completed",
      transactionType: "Credit",
      transactionDetail: `Refund for returned product: ${productItem.productId.name}`,
      orderId: orderId,
      createdAt: new Date(),
    };

    wallet.transactions.push(refundTxn);
    wallet.balance = Number(wallet.balance || 0) + refundAmount;
    await wallet.save();

    const allReturned = order.products.every(p => p.itemStatus === "Returned");

    order.paymentDetails.status = allReturned ? "Refunded" : "Partially Refunded";

    order.orderStatus = allReturned ? "Returned" : "Returning";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Product returned successfully, refund added to wallet",
      refundAmount,
      newWalletBalance: wallet.balance,
      paymentStatus: order.paymentDetails.status,
      orderStatus: order.orderStatus,
    });

  } catch (err) {
    console.error("Return Item Error:", err);
    res.status(500).json({ success: false, message: "Server error while returning product" });
  }
};





const createRepayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const oldOrder = await Order.findOne({ orderId });
    if (!oldOrder) {
      console.log(" Old order not found for repay");
      return res.json({ success: false, message: "Order not found" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(oldOrder.grandTotal * 100),
      currency: "INR",
      receipt: `repay_${orderId}_${Date.now()}`,
    });

    console.log("Razorpay Repay Order Created:", razorpayOrder.id);

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(" Error creating repay order:", error);
    return res.json({ success: false, message: "Internal Server Error" });
  }
};





const verifyRepayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      oldOrderId,
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.log(" Invalid payment signature for repay");
      return res.render("user/order-failed");
    }

    console.log("Repay payment verified successfully for:", oldOrderId);

    const order = await Order.findOne({ orderId: oldOrderId }).populate({
      path: "products.productId",
      strictPopulate: false,
    });

    if (!order) {
      console.log("Could not find old order to update");
      return res.render("user/order-failed");
    }

    for (const item of order.products) {
      const product = item.productId;
      if (!product) continue;

      const sizeIndex = product.sizes.indexOf(item.selectedSize);
      if (sizeIndex !== -1 && product.quantities[sizeIndex] >= item.quantity) {
        product.quantities[sizeIndex] -= item.quantity;
        await product.save();
      } else {
        console.warn(` Not enough stock for product ${product.name}`);
      }
    }

    order.paymentDetails.status = "Completed";
    order.paymentDetails.paymentId = razorpay_payment_id;
    order.paymentDetails.method = "Razorpay";
    order.orderStatus = "Processing";
    await order.save();

    console.log(" Order updated and stock decremented successfully");

    const address = order.shippingAddress;
    return res.render("user/order-success", {
      orderId: order.orderId,
      grandTotal: order.grandTotal,
      paymentMethod: "Razorpay",
      address,
    });
  } catch (error) {
    console.error(" Error verifying repay payment:", error);
    return res.render("user/order-failed");
  }
};





module.exports = { 
  getCheckoutPage,
  checkout,
  getUserOrders,
  cancelSingleItem,
  returnOrderItem,
  verifyPayment,
  paymentFailed,
  createRepayOrder,
  verifyRepayPayment
 };

