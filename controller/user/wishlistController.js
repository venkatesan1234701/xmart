// controllers/wishlistController.js
const mongoose = require('mongoose');
const Wishlist = require('../../models/wishlistModel');
const Product = require('../../models/productModel');
const User = require('../../models/userSchema')
const bcrypt = require("bcrypt")

const getWishlistPage = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect("/signin");

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search ? req.query.search.trim() : "";

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products.productId",
        select:
          "name images price stock productPic image isBlocked isDeleted category",
        populate: {
          path: "category",
          select: "name isBlocked isDeleted",
        },
      })
      .lean();

    if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
      return res.render("user/wishlist", {
        wishlistObj: [],
        wishlistCount: 0,
        currentPage: 1,
        totalPages: 1,
        searchQuery,
        user: req.session?.user || null,
      });
    }

    const sortedProducts = wishlist.products.sort(
      (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
    );

    const filteredProducts = sortedProducts.filter((item) => {
      const product = item.productId;
      const category = product?.category;
      if (!product) return false;
      if (product.isDeleted || product.isBlocked) return false;
      if (category && (category.isDeleted || category.isBlocked)) return false;
      return true;
    });

    let searchedProducts = filteredProducts;
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchedProducts = filteredProducts.filter((item) =>
        regex.test(item.productId?.name || "")
      );
    }

    const sortedSearch = [
      ...searchedProducts,
      ...filteredProducts.filter(
        (p) => !searchedProducts.some((s) => s.productId._id.equals(p.productId._id))
      ),
    ];

    const totalProducts = sortedSearch.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = sortedSearch.slice(skip, skip + limit);

    const wishlistObj = paginatedProducts.map((item) => {
      const product = item.productId || {};
      let img =
        product.images?.[0] ||
        product.productPic?.[0] ||
        product.image ||
        "/images/no-image.jpg";

      if (img && !img.startsWith("http") && !img.startsWith("/uploads")) {
        img = `/uploads/${img}`;
      }

      let stockStatus = "In Stock";
      if (product.stock === 0) stockStatus = "Out of Stock";

      return {
        productId: product._id,
        productName: product.name || "Unknown Product",
        productPic: img,
        productPrice: item.variety?.price || product.price || 0,
        productStock: product.stock || 0,
        productVariety: item.variety?.size || "items",
        varietyMeasurement: item.variety?.size || "",
        addedAt: item.addedAt || null,
        stockStatus,
      };
    });

    return res.render("user/wishlist", {
      wishlistObj,
      wishlistCount: totalProducts,
      currentPage: page,
      totalPages,
      searchQuery,
      user: req.session?.user || null,
    });
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).send("Server Error");
  }
};



const addToWishlist = async (req, res) => {
  try {
    // console.log("Wishlist add body:", req.body);
    const { productId, size, qty, price } = req.body;
    const userId = req.session?.user?.id || null; 

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.sizes && product.sizes.length && size) {
      const idx = product.sizes.indexOf(size);
      if (idx === -1)
        return res.status(400).json({ success: false, message: "Invalid size" });
      if ((product.quantities[idx] || 0) <= 0)
        return res.status(400).json({ success: false, message: "Selected size out of stock" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Please log in to use wishlist",
        });
      }
      wishlist = new Wishlist({ userId, products: [] });
    }

    const exists =
      wishlist.products &&
      wishlist.products.some(
        (p) =>
          p.productId.toString() === productId &&
          (p.variety?.size || null) === (size || null)
      );

    if (exists) {
      return res.status(200).json({
        success: false,
        message: "This item is already in your wishlist",
      });
    }

    const entry = {
      productId,
      isItem: !size,
      variety: size ? { size, price: price || 0, quantity: qty || 1 } : {},
    };

    wishlist.products.push(entry);
    await wishlist.save();

    return res.json({ success: true, message: "Added to wishlist" });
  } catch (err) {
    console.error("Add to wishlist error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while adding to wishlist" });
  }
};


const deleteWishlistItem = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const { productId, variety } = req.body; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    wishlist.products = wishlist.products.filter((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = item.variety?.size === variety;
      return !(sameProduct && (variety ? sameSize : true));
    });

    await wishlist.save();

    return res.json({ success: true, message: "Product removed from wishlist " });
  } catch (err) {
    console.error(" Error deleting wishlist item:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const changepassword = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect("/signin");

    const user = await User.findById(userId);

    if (user.loginType === "google") {
      return res.redirect("/user/profile?googleBlock=true");
    }
    res.render("user/change-password");

  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server error");
  }
};


const postchangepass = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.json({ success: false, message: "Not logged in" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    if (user.loginType === "google") {
      return res.json({
        success: false,
        message: "Google login users cannot change password"
      });
    }

    const { password, newpassword, cofirmpassword } = req.body;

    if (!password || !newpassword || !cofirmpassword) {
      return res.json({
        success: false,
        message: "Please fill all fields",
        field: "current"
      });
    }

    const correctOld = await bcrypt.compare(password, user.password);
    if (!correctOld) {
      return res.json({
        success: false,
        message: "Old password is incorrect",
        field: "current"
      });
    }

    if (newpassword.length < 8) {
      return res.json({
        success: false,
        message: "New password must be at least 8 characters",
        field: "new"
      });
    }

    if (newpassword !== cofirmpassword) {
      return res.json({
        success: false,
        message: "Passwords do not match",
        field: "confirm"
      });
    }

    const hashed = await bcrypt.hash(newpassword, 10);

    await User.findByIdAndUpdate(userId, { password: hashed });

    return res.json({
      success: true,
      message: "Password updated"
    });

  } catch (err) {
    console.error("Error:", err);
    res.json({ success: false, message: "Server error" });
  }
};



module.exports = { 
  addToWishlist,
  getWishlistPage ,
  deleteWishlistItem,
  changepassword,
  postchangepass
};
