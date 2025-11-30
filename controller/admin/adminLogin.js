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
    }).lean()

    const totalEarnings = deliveredOrdersThisMonth.reduce((sum, order) => {
      return sum + (order.grandTotal || 0);
    }, 0)

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
    console.error("Error loading dashboard:", err);
    res.status(500).send("Server Error");
  }
};









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

    const addedOrderIds = new Set();

    orders.forEach(order => {
      let totalMRP = 0;

      order.products.forEach(product => {
        const sizeIndex = ["S", "M", "L"].indexOf(product.selectedSize);
        const productPrice = product.productId?.prices[sizeIndex] || 0;
        totalMRP += productPrice * product.quantity;
      })
      const orderDiscount = totalMRP - order.grandTotal;
      totalDiscount += orderDiscount;

      
      if (!addedOrderIds.has(order._id.toString())) {
        totalOrderRevenue += (order.grandTotal || 0);
        addedOrderIds.add(order._id.toString());
      }
      order.products.forEach(product => {
        const sizeIndex = ["S", "M", "L"].indexOf(product.selectedSize);
        const productPrice = product.productId?.prices[sizeIndex] || 0;
        const productMRP = productPrice * product.quantity;

        flattenedOrders.push({
          userName: order.userId?.firstName || "Unknown",
          orderDate: new Date(order.createdAt).toISOString().split("T")[0],
          productName: product.productId?.name || "",
          quantity: product.quantity,
          productMRP: productMRP,
          productPaid: product.totalPrice,
          grandTotal: order.grandTotal,
          discount: orderDiscount,  
          paymentMethod: order.paymentDetails.method
        });
      });
    });

    const totalEarnings = totalOrderRevenue;

    res.render("admin/sales-report", {
      orders: flattenedOrders,
      totalDiscount,
      totalOrderRevenue,
      totalEarnings
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};





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
