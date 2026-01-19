const Order = require("../../models/order");
const User = require("../../models/userSchema");
const STATUS = require('../../utils/statusCodes');
const AppError = require('../../utils/appError')
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productModel")

// const getAllOrders = async (req, res) => {
//   try {
//     if (!req.session.isAdminLogged) {
//       return res.redirect("/admin/login");
//     }

//     const perPage = 5;
//     const page = parseInt(req.query.page) || 1;

//     const search = req.query.search ? req.query.search.trim() : "";

//     let query = {};

//     if (search) {
//       const regex = new RegExp(search, "i")
//       query = {
//         $or: [
//           { "shippingAddress.firstName": regex },
//           { orderStatus: regex },
//         ],
//       };
//     }

//     const totalOrders = await Order.countDocuments(query);
//     const totalPages = Math.ceil(totalOrders / perPage);

//     const orders = await Order.find(query)
//       .populate("userId", "name email phone")
//       .populate("products.productId", "name images productPic")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * perPage)
//       .limit(perPage)
//       .lean();

//     if (search) {
//       const lower = search.toLowerCase();
//       orders.sort((a, b) => {
//         const aMatch =
//           a.shippingAddress?.firstName?.toLowerCase() === lower ? -1 : 1;
//         const bMatch =
//           b.shippingAddress?.firstName?.toLowerCase() === lower ? -1 : 1;
//         return aMatch - bMatch;
//       });
//     }

//     res.render("admin/orders", {
//       orders,
//       currentPage: page,
//       totalPages,
//       search,
//     });
//   } catch (err) {
//     console.error(" Error fetching admin orders:", err);
//     res.status(STATUS.INTERNAL_SERVER_ERROR).send("Server error while fetching orders");
//   }
// }

const getAllOrders = async (req, res) => {
  try {
    if (!req.session.isAdminLogged) {
      return res.redirect("/admin/login");
    }

    const perPage = 5;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search ? req.query.search.trim() : "";

    let query = {
      orderStatus: { $ne: "Cancelled" }
    };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { "shippingAddress.firstName": regex },
        { orderStatus: regex },
      ];
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / perPage);

    const orders = await Order.find(query)
      .populate("userId", "name email phone")
      .populate("products.productId", "name images productPic")
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    res.render("admin/orders", {
      orders,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (err) {
    console.error("Error fetching admin orders:", err);
    res
      .status(STATUS.INTERNAL_SERVER_ERROR)
      .send("Server error while fetching orders");
  }
};


const cancelReturnOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.products = order.products.map(item => {
      if (
        item.itemStatus &&
        item.itemStatus.toLowerCase().trim() === "returning"
      ) {
        item.itemStatus = "Delivered";
      }
      return item;
    })
    order.orderStatus = "Delivered";

    await order.save();

    res.json({
      success: true,
      message: "Return cancelled. Order marked as Delivered."
    });

  } catch (error) {
    console.error("Cancel Return Error:", error);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
  }
};


const getSingleOrder = async (req, res) => {
  try {
    if (!req.session.isAdminLogged) {
      return res.redirect("/admin/login");
    }

    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("products.productId", "name images productPic image")
      .lean();

    if (!order) {
      return res.status(STATUS.NOT_FOUND).render("admin/404", { message: "Order not found" });
    }

    const toNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val));

    const formattedOrder = {
      ...order,
      createdDate: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString()
        : "N/A",
      paymentDetails: {
        method: order.paymentDetails?.method || "N/A",
        status: order.paymentDetails?.status || "Pending",
      },
      subTotal: toNumber(order.subTotal),
      shippingCost: toNumber(order.shippingCost),
      grandTotal: toNumber(order.grandTotal),

      user: {
        name:
          order.shippingAddress?.firstName ||
          order.userId?.name ||
          "Unknown Customer",
        email: order.userId?.email || "N/A",
        phone: order.userId?.phone || "N/A",
      },

      shippingAddress: order.shippingAddress,

      products: order.products.map((item) => {
        let img =
          item.productId?.images?.[0] ||
          item.productId?.productPic?.[0] ||
          item.productId?.image ||
          "/images/default-product.jpg";

        return {
          name: item.productId?.name || item.name || "Unnamed Product",
          image: img,
          quantity: item.quantity,
          size: item.selectedSize,
          pricePerUnit: toNumber(item.pricePerUnit),
          totalPrice: toNumber(item.totalPrice),
          itemStatus: item.itemStatus || "Pending", 
           returnReason: item.returnReason || null,
        };
      }),
    };

    res.render("admin/singleorder", { order: formattedOrder });
  } catch (err) {
    // console.error("Error loading single order:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).render("admin/500", {
      message: "Order not found",
    });
  }
};



const approveAllReturns = async (req, res) => {
  try {
    console.log("APPROVE RETURNS HIT:", req.params.orderId);
    
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("products.productId");
    
    if (!order) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }

    const returningItems = order.products.filter(item => 
      item.itemStatus?.toString().toLowerCase().trim() === 'returning'  
    );


    if (returningItems.length === 0) {
      return res.json({ success: true, message: "No returning items found" });
    }

    let totalRefund = 0;

    for (const item of returningItems) {
      // console.log(" product item:", item.productId?.name, item.selectedSize);
      
      item.itemStatus = "Returned";
      
      const price = Number(item.price) || Number(item.pricePerUnit) || Number(item.productId?.price) || 0;
      const qty = Number(item.quantity) || 1;
      const refundAmount = price * qty;
      
      totalRefund += refundAmount;

      if (item.productId && refundAmount > 0) {
        const product = await Product.findById(item.productId._id);
        if (product) {
          const sizeIndex = product.sizes.indexOf(item.selectedSize);
          if (sizeIndex !== -1) {
            product.quantities[sizeIndex] += qty;
            await product.save();
          }
        }
      }
    }


    if (totalRefund > 0) {
      const userId = order.userId;
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
      }

       const refundTransactionId = "REF" + Math.floor(100000 + Math.random() * 900000)

      wallet.transactions.push({
        amount: totalRefund,
        type: "OrderRefund",
        status: "completed",
        transactionType: "Credit",
        transactionDetail: `Refund for ${returningItems.length} returned items - Order ${orderId}`,
        orderId: orderId,
        transactionId: refundTransactionId,
        createdAt: new Date()
      });
      
      wallet.balance += totalRefund;
      console.log('return amount',wallet.balance )
      await wallet.save();
    }

    const allReturned = order.products.every(p => p.itemStatus === "Returned");
    if (allReturned) {
      order.orderStatus = "Returned";
      if (order.paymentDetails) order.paymentDetails.status = "Refunded";
    } else {
      order.orderStatus = "Returning";
      if (order.paymentDetails) order.paymentDetails.status = "Partially Refunded";
    }

    await order.save();

    res.json({
      success: true,
      message: `${returningItems.length} items approved! ₹${totalRefund} refunded`,
      totalRefund,
      processedCount: returningItems.length
    });

  } catch (err) {
    console.error("Approve Returns ERROR:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
}



const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returning",
      "Returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    order.orderStatus = status;

    order.products.forEach((item) => {
      const itemLockedStatuses = ["Cancelled", "Delivered", "Returned"];

      if (!itemLockedStatuses.includes(item.itemStatus)) {
        item.itemStatus = status;
      }
    });

    if (status === "Delivered") {
      order.paymentDetails.status = "Completed";
    } else if (status === "Cancelled") {
      order.paymentDetails.status = "Cancelled";
    } else if (status === "Returned") {
      order.paymentDetails.status = "Refunded";
    }

    await order.save();

    return res.json({
      success: true,
      message: `Order updated to '${status}', product items updated conditionally`,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    res
      .status(STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error updating status" });
  }
};






module.exports = {
     getAllOrders,
     getSingleOrder,
     updateOrderStatus,
     approveAllReturns,
     cancelReturnOrder
     };
