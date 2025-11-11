const AppError = require('../../middleware/errorHandling')
const Category = require("../../models/category")
const mongoose = require("mongoose");
const User = require('../../models/userSchema')
const Order = require('../../models/order')


async function signIn(req, res, next) {
  try {
    const { email, password } = req.body;
    console.log('Login attempt -> Email:', email, 'Password:', password);
    console.log('Env -> Email:', process.env.ADMIN_EMAIL, 'Password:', process.env.ADMIN_PASSWORD);

    if (!email || !password) {
      return res.render('admin/AdminSignup');
    }

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      req.session.isAdminLogged = true; 
      return res.redirect('/admin/dashboard');
    } else {
      return res.render('admin/AdminSignup');
    }
  } catch (error) {
    console.error(error);
    next(new AppError('Sorry...Something went wrong', 500));
  }
}


async function renderSignInPage(req, res, next) {
  try {
    if (req.session.isAdminLogged) {
      return res.redirect('/admin/dashboard')
    } else {
      return res.render('admin/AdminSignup', { message: null })
    }
  } catch (error) {
    next(new AppError('Sorry...Something went wrong', 500))
  }
}


const getOrdersSummary = async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'week';
    const now = new Date();
    let startDate;

    if (timeframe === 'week') {
      const firstDayOfWeek = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
    } else if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const orders = await Order.find({ createdAt: { $gte: startDate, $lte: now } }).lean();

    const ordersByStatus = {
      Delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
      Returned: orders.filter(o => o.orderStatus === 'Returned').length,
      Cancelled: orders.filter(o => o.orderStatus === 'Cancelled').length,
      Pending: orders.filter(o => o.orderStatus === 'Pending').length
    };

    const labels = [];
    const revenuePerDay = [];

    const current = new Date(startDate);
    current.setHours(0,0,0,0)

    while (current <= now) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23,59,59,999);

      const dayOrders = orders.filter(o => {
        const created = new Date(o.createdAt);
        return created >= dayStart && created <= dayEnd;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

      labels.push(`${dayStart.getDate()}/${dayStart.getMonth() + 1}`);
      revenuePerDay.push(dayRevenue);

      current.setDate(current.getDate() + 1);
    }

    res.json({ labels, revenuePerDay, ordersByStatus });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}




// const getDashboard = async (req, res) => {
//   try {
//     const totalOrders = await Order.countDocuments();

//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

//     const validOrdersThisMonth = await Order.find({
//       createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//       orderStatus: { $nin: ["Cancelled", "Returned"] },
//       "paymentDetails.status": "Completed",
//     }).lean()

//     const totalEarnings = validOrdersThisMonth.reduce((sum, order) => {
//       return sum + (order.grandTotal || 0)
//     }, 0)

//     const ordersByStatus = {
//       Delivered: await Order.countDocuments({ orderStatus: "Delivered" }),
//       Pending: await Order.countDocuments({ orderStatus: "Pending" }),
//       Cancelled: await Order.countDocuments({ orderStatus: "Cancelled" }),
//       Returned: await Order.countDocuments({ orderStatus: "Returned" }),
//     }

//     const totalUsers = await User.countDocuments();

//     const labels = [];
//     const revenuePerDay = [];

//     for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
//       const day = new Date(d);
//       labels.push(`${day.getDate()}/${day.getMonth() + 1}`);
//       const dayRevenue = validOrdersThisMonth
//         .filter(o => o.createdAt.toDateString() === day.toDateString())
//         .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
//       revenuePerDay.push(dayRevenue);
//     }

//     res.render("admin/dashboard", {
//       totalOrders,
//       totalEarnings,
//       ordersByStatus,
//       totalUsers,
//       labels,
//       revenuePerDay
//     });
//   } catch (err) {
//     console.error("Error loading dashboard:", err);
//     res.status(500).send("Server Error");
//   }
// }




const getDashboard = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ orderStatus: "Delivered" });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const deliveredOrdersThisMonth = await Order.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      orderStatus: "Delivered",
      "paymentDetails.status": "Completed",
    }).lean();

    const totalEarnings = deliveredOrdersThisMonth.reduce((sum, order) => {
      return sum + (order.grandTotal || 0);
    }, 0);

    const ordersByStatus = {
      Delivered: await Order.countDocuments({ orderStatus: "Delivered" }),
      Pending: await Order.countDocuments({ orderStatus: "Pending" }),
      Cancelled: await Order.countDocuments({ orderStatus: "Cancelled" }),
      Returned: await Order.countDocuments({ orderStatus: "Returned" }),
    };

    const totalUsers = await User.countDocuments();

    const labels = [];
    const revenuePerDay = [];

    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);
      labels.push(`${day.getDate()}/${day.getMonth() + 1}`);
      const dayRevenue = deliveredOrdersThisMonth
        .filter(o => o.createdAt.toDateString() === day.toDateString())
        .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      revenuePerDay.push(dayRevenue);
    }

    res.render("admin/dashboard", {
      totalOrders,
      totalEarnings,
      ordersByStatus,
      totalUsers,
      labels,
      revenuePerDay
    });
  } catch (err) {
    console.error("Error loading dashboard:", err)
    res.status(500).send("Server Error");
  }
}






// const getDashboard = async (req, res) => {
//   try {
//     // ------------------------
//     // ✅ Total Users & Orders
//     // ------------------------
//     const totalUsers = await User.countDocuments();
//     const totalOrders = await Order.countDocuments();

//     // ------------------------
//     // ✅ Current Month Date Range
//     // ------------------------
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

//     // ------------------------
//     // ✅ Delivered & Pending Orders This Month
//     // ------------------------
//     const monthlyOrders = await Order.find({
//       createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//       orderStatus: { $in: ['Delivered', 'Pending'] }, // Only Delivered & Pending
//     }).lean();

//     // ------------------------
//     // ✅ Revenue Per Day for Chart
//     // ------------------------
//     const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
//     const revenuePerDay = Array(7).fill(0);

//     // ------------------------
//     // ✅ Monthly Delivered Orders & Total Earnings
//     // ------------------------
//     const deliveredOrders = monthlyOrders.filter(o => o.orderStatus === 'Delivered');
//     let totalEarnings = 0;

//     deliveredOrders.forEach(order => {
//       const day = order.createdAt.getDay();
//       const orderTotal = order.products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
//       revenuePerDay[day] += orderTotal;
//       totalEarnings += orderTotal;
//     });

//     // ------------------------
//     // ✅ Orders Count by Status (All Orders)
//     // ------------------------
//     const ordersByStatus = {
//       Delivered: await Order.countDocuments({ orderStatus: 'Delivered' }),
//       Pending: await Order.countDocuments({ orderStatus: 'Pending' }),
//       Cancelled: await Order.countDocuments({ orderStatus: 'Cancelled' }),
//       Returned: await Order.countDocuments({ orderStatus: 'Returned' }),
//     };

//     // ------------------------
//     // ✅ Render Dashboard with All Data
//     // ------------------------
//     res.render('admin/dashboard', {
//       totalUsers,
//       totalOrders,
//       totalEarnings,
//       ordersByStatus,
//       labels,
//       revenuePerDay
//     });

//   } catch (err) {
//     console.error('Error loading dashboard:', err);
//     res.status(500).send('Server Error');
//   }
// };





async function renderProductsPage(req, res, next) {
  try {
    if (req.session.isAdminLogged) {
      const categories = await Category.find();
      return res.render('admin/products', { categories });
    } else {
      return res.redirect('/admin/login');
    }
  } catch (error) {
    next(new AppError('Sorry...Something went wrong', 500));
  }
}


async function renderProductsPage(req, res) {
  try {
    const categories = await Category.find()
    res.render("admin/products", { categories })
  } catch (err) {
    console.error("Error fetching categories:", err)
    res.status(500).send("Server Error")
  }
}



// const getSalesReport = async (req, res) => {
//   try {
//     // Fetch all orders with user info
//     const orders = await Order.find()
//       .populate("userId", "firstName")
//       .lean();

//     const flattenedOrders = [];
//     let totalOrderRevenue = 0;
//     let totalDiscount = 0;

//     orders.forEach(order => {
//       order.products.forEach(product => {
//         flattenedOrders.push({
//           userName: order.userId?.firstName || "Unknown",
//           orderDate: order.createdAt.toISOString().split("T")[0],
//           productName: product.name,
//           quantity: product.quantity,
//           grandTotal: order.grandTotal,
//           paymentMethod: order.paymentDetails.method,
//           discount: product.discount || 0 // if you store discount per product
//         });
//       });
//       totalOrderRevenue += order.grandTotal;
//       totalDiscount += order.products.reduce((sum, p) => sum + (p.discount || 0), 0); // total discount
//     });

//     res.render("admin/sales-report", {
//       orders: flattenedOrders,
//       totalOrderRevenue,
//       totalDiscount
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server Error");
//   }
// };





const getSalesReport = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "Delivered" })
      .populate("userId", "firstName")
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .lean();

    const flattenedOrders = [];
    let totalDiscount = 0;
    let totalOrderRevenue = 0;

    orders.forEach(order => {
      const orderCoupon = order.couponDiscount || 0;

      order.products.forEach(product => {
        const sizeIndex = ["S", "M", "L"].indexOf(product.selectedSize);
        const productPrice = product.productId?.prices[sizeIndex] || 0;

        const totalMRP = productPrice * product.quantity;

        const paidAmount = product.totalPrice;

        const productDiscount = Math.max(totalMRP - paidAmount, 0);

        const discountWithCoupon = productDiscount + (orderCoupon / order.products.length);

        totalDiscount += discountWithCoupon;
        totalOrderRevenue += paidAmount;

        flattenedOrders.push({
          userName: order.userId?.firstName || "Unknown",
          orderDate: new Date(order.createdAt).toISOString().split("T")[0],
          productName: product.productId?.name || product.name,
          quantity: product.quantity,
          productMRP: totalMRP,
          productPaid: paidAmount,
          discount: discountWithCoupon,
          grandTotal: order.grandTotal,
          paymentMethod: order.paymentDetails.method
        });
      });
    });

    const lastSixProducts = flattenedOrders.slice(-6);

    res.render("admin/sales-report", {
      orders: lastSixProducts,
      totalDiscount,
      totalOrderRevenue
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}


const renderCustomers = async (req, res, next) => {
  try {
    if (!req.session.isAdminLogged) return res.redirect('/admin/login');

    let page = parseInt(req.query.page) || 1;
    const limit = 6;

   
    const totalCustomers = await User.countDocuments({ isVerified: true });
    const totalPages = Math.ceil(totalCustomers / limit);

    const customers = await User.find({ isVerified: true }) 
      .sort({ createdAt: -1 }) 
      .skip((page - 1) * limit)
      .limit(limit);


    res.render('admin/customers', {
      title: 'Customer List',
      users: customers, 
      currentPage: page,
      totalPages,
      totalCustomers
    });
  } catch (error) {
    next(new AppError('Server Error', 500));
  }
}








const toggleBlockUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).send("User not found")

    user.isBlocked = !user.isBlocked; 
    await user.save();

    res.json({ success: true, isBlocked: user.isBlocked })
  } catch (err) {
    next(err);
  }
}




const earchCustomers = async (req, res) => {
  try {
    const query = req.query.search?.trim() || "";

    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } }
      ]
    });

    return res.json({ success: true, users });
  } catch (err) {
    console.error("Search Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

async function adminLogout(req, res, next) {
  try {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          console.error('Admin session destroy error:', err);
          return next(new AppError('Logout failed. Please try again.', 500));
        }

        res.clearCookie('connect.sid', { path: '/', httpOnly: true });
        res.redirect('/admin/login');
      });
    } else {
      res.redirect('/admin/login');
    }
  } catch (error) {
    console.error('Admin logout error:', error);
    next(new AppError('Something went wrong during admin logout', 500));
  }
}







module.exports = {
  signIn,
  renderSignInPage,
  adminLogout,
  renderProductsPage,
  renderCustomers,
  toggleBlockUser,
  earchCustomers,
  getDashboard,
  getOrdersSummary,
  getSalesReport
}
