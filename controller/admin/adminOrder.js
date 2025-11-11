const Order = require("../../models/order");
const User = require("../../models/userSchema");



const getAllOrders = async (req, res) => {
  try {
    if (!req.session.isAdminLogged) {
      return res.redirect("/admin/login");
    }

    const perPage = 5;
    const page = parseInt(req.query.page) || 1;

    const search = req.query.search ? req.query.search.trim() : "";

    let query = {};

    if (search) {
      const regex = new RegExp(search, "i")
      query = {
        $or: [
          { "shippingAddress.firstName": regex },
          { orderStatus: regex },
        ],
      };
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

    if (search) {
      const lower = search.toLowerCase();
      orders.sort((a, b) => {
        const aMatch =
          a.shippingAddress?.firstName?.toLowerCase() === lower ? -1 : 1;
        const bMatch =
          b.shippingAddress?.firstName?.toLowerCase() === lower ? -1 : 1;
        return aMatch - bMatch;
      });
    }

    res.render("admin/orders", {
      orders,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (err) {
    console.error(" Error fetching admin orders:", err);
    res.status(500).send("Server error while fetching orders");
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
      return res.status(404).render("admin/404", { message: "Order not found" });
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
          status: item.itemStatus,
        };
      }),
    };

    res.render("admin/singleorder", { order: formattedOrder });
  } catch (err) {
    console.error("Error loading single order:", err);
    res.status(500).render("admin/500", {
      message: "Server error while loading order details",
    });
  }
};




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
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    order.orderStatus = status;

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
      message: `Order status updated to '${status}' successfully`,
      updatedStatus: status,
      paymentStatus: order.paymentDetails.status,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ success: false, message: "Server error while updating order status" });
  }
};




module.exports = {
     getAllOrders,
     getSingleOrder,
     updateOrderStatus,
    
     };
