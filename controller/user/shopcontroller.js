const User = require("../../models/userSchema")
const mongoose = require("mongoose");
const Address = require('../../models/address')
const Otp = require("../../models/otpSchema")
const Referral = require("../../models/referralSchema")
const nodemailer = require("nodemailer")
const Category = require('../../models/category')
const Product = require("../../models/productModel")
const CategoryOffer = require("../../models/categoryOffer.js");
const Cart = require('../../models/card');
const ProductOffer = require("../../models/productOfferModel.js")
const Review = require("../../models/reviewModel.js");
const { models } = require("mongoose")






const getShopPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    const perPage = 8;
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'newest';

    let sortOption = { createdAt: -1 };
    if (sort === 'lowToHigh') sortOption = { 'prices.0': 1 };
    if (sort === 'highToLow') sortOption = { 'prices.0': -1 };
    if (sort === 'nameAToZ') sortOption = { name: 1 };
    if (sort === 'nameZToA') sortOption = { name: -1 };

    const categories = await Category.find({ isBlocked: false, isDeleted: false }).lean();

    let products = await Product.find({ isDeleted: false })
      .populate({ path: 'category', match: { isBlocked: false, isDeleted: false } })
      .sort(sortOption)
      .lean();

    products = products.filter(p => p.category);

    const now = new Date();

    const activeProductOffers = await ProductOffer.find({
      currentStatus: 'active',
      isListed: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    const activeCategoryOffers = await CategoryOffer.find({
      status: 'list',
      isListed: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    const productsWithOffer = products.map(product => {
      const productOffer = activeProductOffers.find(o => o.product.toString() === product._id.toString());
      let categoryOffer = null;

      if (product.category) {
        categoryOffer = activeCategoryOffers.find(c => c.category.toString() === product.category._id.toString());
      }

      let finalOffer = null;
      if (productOffer && categoryOffer) {
        finalOffer = productOffer.offerPercentage >= categoryOffer.offerPercentage ? productOffer : categoryOffer;
      } else if (productOffer) {
        finalOffer = productOffer;
      } else if (categoryOffer) {
        finalOffer = categoryOffer;
      }

      return { ...product, offer: finalOffer };
    });

    const totalProducts = productsWithOffer.length;
    const pages = Math.ceil(totalProducts / perPage);
    const paginatedProducts = productsWithOffer.slice((page - 1) * perPage, page * perPage);

    res.render('user/shop', {
      user,
      products: paginatedProducts,
      categories,
      current: page,
      pages,
      sort
    });

  } catch (err) {
    console.error("getShopPage error:", err);
    res.status(500).send('Server Error');
  }
};







const getSingleProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId)
      .populate("category")
      .lean();

    if (!product || product.isDeleted) return res.redirect("/shop");
    if (!product.category || product.category.isBlocked || product.category.isDeleted)
      return res.redirect("/shop");

    const productOffer = await ProductOffer.findOne({
      product: productId,
      currentStatus: "active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    const categoryOffer = await CategoryOffer.findOne({
      category: product.category._id,
      status: "list",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    let firstIndex = product.quantities.findIndex(q => q > 0);
    if (firstIndex === -1) firstIndex = 0;

    const originalPrice = product.prices[firstIndex] || 0;

    let appliedOffer = null;
    if (productOffer && categoryOffer) {
      appliedOffer =
        productOffer.offerPercentage >= categoryOffer.offerPercentage
          ? productOffer
          : categoryOffer;
    } else if (productOffer) {
      appliedOffer = productOffer;
    } else if (categoryOffer) {
      appliedOffer = categoryOffer;
    }

    const offerPrice = appliedOffer
      ? Math.floor(originalPrice - (originalPrice * appliedOffer.offerPercentage / 100))
      : originalPrice;

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isDeleted: false,
    }).limit(5).lean();

    const reviews = await Review.find({ product: productId })
      .populate("user", "firstName profileImage")
      .lean();

    res.render("user/singleProduct", {
      product,
      products: relatedProducts,
      user: req.session.user || null,
      reviews: reviews || [],
      offer: appliedOffer,
      originalPrice,
      offerPrice,
      firstIndex,
    });

  } catch (err) {
    console.error("Error in getSingleProductPage:", err);
    res.redirect("/shop");
  }
};




const getCartTotals = async (req, res) => {
  try {

    const userId = req.session?.user?.id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const cart = await Cart.findOne({ userId })
      .populate("products.productId", "name productPic sizes prices");

    if (!cart) {
      return res.json({
        success: true,
        subtotal: 0,
        grandTotal: 0,
        products: []
      });
    }

    const subtotal = cart.products.reduce((acc, p) => {
      const price = p.pricePerUnit || 0;
      const discount = p.productDiscount || 0;
      return acc + (price * p.quantity) - discount;
    }, 0);

    const grandTotal = subtotal + cart.shippingCost;

    res.json({
      success: true,
      subtotal: Math.round(subtotal),
      grandTotal: Math.round(grandTotal),
      products: cart.products.map(item => ({
        _id: item.productId?._id,
        name: item.productId?.name,
        image: item.productId?.productPic?.[0],
        size: item.selectedSize,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.quantity * item.pricePerUnit
      }))
    });

  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};







const addToCart = async (req, res) => {
  try {
    const { productId, qty, size, pricePerUnit } = req.body;
    const quantity = Math.min(parseInt(qty) || 1, 8);
    const unitPrice = parseFloat(pricePerUnit);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Login required" });
    }
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) return res.json({ success: false, message: "Product not found" });

    const sizeIndex = product.sizes.indexOf(size);
    if (sizeIndex === -1) return res.json({ success: false, message: "Invalid size selected" });

    const availableQty = product.quantities[sizeIndex];
    if (quantity > availableQty) return res.json({ success: false, message: `Only ${availableQty} items available` });
    if (isNaN(unitPrice) || unitPrice <= 0) return res.json({ success: false, message: "Invalid price per unit" });

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        subtotal: 0,
        shippingCost: 40,
        grandTotal: 0,
        products: []
      });
    }

    const existingProduct = cart.products.find(p =>
      p.productId.toString() === productId && p.selectedSize === size
    );

    if (existingProduct) {
      const newQty = existingProduct.quantity + quantity;
      if (newQty > availableQty) {
        return res.json({ success: false, message: `Only ${availableQty} items available` });
      }
      existingProduct.quantity = newQty;
      existingProduct.pricePerUnit = unitPrice;
    } else {
      cart.products.push({
        productId: product._id,
        quantity,
        selectedSize: size,
        pricePerUnit: unitPrice,
        productDiscount: 0
      });
    }

    cart.subtotal = cart.products.reduce((acc, p) => acc + (p.quantity * p.pricePerUnit), 0);
    cart.grandTotal = cart.subtotal + (cart.shippingCost || 0);

    await cart.save();

    return res.json({
      success: true,
      message: "Product added to cart",
      availableQuantity: availableQty,
      cart
    });

  } catch (err) {
    console.error("AddToCart Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};






const searchProducts = async (req, res) => {
  try {
    const { query = "", category } = req.query;

    if (!query.trim()) return res.json([]);

    let filter = {
      name: { $regex: `^${query}`, $options: "i" },
      isDeleted: false
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    let products = await Product.find(filter).limit(50);

    if (query.trim().toLowerCase().startsWith('v')) {
      products = products.filter(prod => prod.name.toLowerCase() !== 'siva');
    }

    res.json(products)

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error", products: [] })
  }
}

const getProfilePage = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect("/signin");

    const user = await User.findById(sessionUser.id).lean();
    if (!user) return res.redirect("/signin");

    const addresses = await Address.find({ 
      userId: sessionUser.id,
      isActive: true 
    }).lean();

    res.render("user/profile", { user, addresses });
  } catch (err) {
    console.error("Profile Page Error:", err);
    res.status(500).send("Server Error");
  }
}



const getEditProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    if (!userId) return res.redirect("/signin");

    const user = await User.findById(userId).lean();
    if (!user) return res.redirect("/signin");

    res.render("user/editProfile", { user });
  } catch (err) {
    console.error(err);
    res.redirect("/user/profile");
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/signin");

    const { firstName, secondName, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, secondName, phone },
      { new: true }
    );

    req.session.user = {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      secondName: updatedUser.secondName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profile: updatedUser.profile
    };

    res.redirect("/user/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/user/edit-profile");
  }
};


const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!req.file) {
      console.log("No file uploaded");
      return res.redirect("/user/profile");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profile: "/uploads/products/" + req.file.filename },
      { new: true }
    );

    req.session.user.profile = updatedUser.profile;

    res.redirect("/user/profile");
  } catch (err) {
    console.error("Profile Image Upload Error:", err);
    res.redirect("/user/profile");
  }
};





module.exports = {
    getShopPage,
    getSingleProductPage,
    addToCart,
    searchProducts,
    getProfilePage,
    getEditProfile,
    updateProfile,
    uploadProfileImage,
    getCartTotals
}
