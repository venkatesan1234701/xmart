const mongoose = require("mongoose");
const Cart = require("../../models/card");
const Product = require("../../models/productModel");
const Wishlist = require("../../models/wishlistModel");
const Coupon = require("../../models/couponSchema ")

const applyCoupon = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    const { couponCode } = req.body;
    if (!couponCode || !couponCode.trim()) {
      return res.status(400).json({ success: false, message: "Enter a coupon code" });
    }

    const coupon = await Coupon.findOne({
      couponCode: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
      isListed: true
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    const now = new Date();
    if (
      (coupon.couponStartDate && now < coupon.couponStartDate) ||
      (coupon.couponExpiryDate && now > coupon.couponExpiryDate)
    ) {
      return res.status(400).json({ success: false, message: "Coupon is not active now" });
    }

    if (coupon.currentStatus !== "active") {
      return res.status(400).json({ success: false, message: "Coupon is not active" });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const subtotal = cart.subtotal || 0;
    const shipping = cart.shippingCost || 40;

    if (subtotal < coupon.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase should be ₹${coupon.minimumPurchase} to use this coupon`,
      });
    }

    let discount = (subtotal * coupon.discountPercentage) / 100;
    let isMax = false;
    if (discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
      isMax = true;
    }

    const grandTotal = Math.max(subtotal + shipping - discount, 0);

    cart.coupon = {
      name: coupon.couponCode,
      discount,
      isMax,
      maxPurchase: coupon.maximumDiscount,
    };
    cart.grandTotal = grandTotal;
    await cart.save();

    return res.status(200).json({
      success: true,
      message: `Coupon applied successfully! You saved ₹${discount.toFixed(2)}.`,
      newGrandTotal: grandTotal,
      discount,
      couponCode: coupon.couponCode,
    });

  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ success: false, message: "Server error while applying coupon" });
  }
};



const getCartPage = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const cart = await Cart.findOne({ userId: user.id }).populate({
      path: "products.productId",
      model: "Product",
      select: "name productPic prices sizes",
    });

    const cartItems =
      cart && cart.products && cart.products.length > 0
        ? cart.products.map((item) => ({
            name: item.productId?.name || "Unknown Product",
            image: item.productId?.productPic?.[0] || "/assets/images/default.jpg",
            size: item.selectedSize,
            quantity: item.quantity,
            price: item.pricePerUnit,
            total: item.pricePerUnit * item.quantity,
            id: item.productId?._id,
          }))
        : [];

    const subtotal = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const serviceFee = subtotal > 0 ? 50 : 0;

    let grandTotal = subtotal + serviceFee;

    let coupon = { name: null, discount: 0, isMax: false, maxPurchase: 0 };

    if (cart?.coupon?.name) {
      const appliedCoupon = await Coupon.findOne({
        couponCode: cart.coupon.name,
      });

      const couponUsedByUser =
        appliedCoupon &&
        appliedCoupon.user &&
        appliedCoupon.user.toString() === user.id;

      if (!appliedCoupon || appliedCoupon.currentStatus === "expired" || couponUsedByUser) {
        cart.coupon = { name: null, discount: 0, isMax: false, maxPurchase: 0 };
        await cart.save();
      } else {
        coupon = cart.coupon;
        grandTotal = subtotal + serviceFee - coupon.discount;
      }
    }

    // ✅ Load all valid coupons
    const coupons = await Coupon.find({ isListed: true, isDeleted: false });

    const message =
      req.flash && req.flash("message").length
        ? req.flash("message")[0]
        : { type: "", text: "" };

    res.render("user/card", {
      user,
      cart: cart || { products: [], subtotal, grandTotal, coupon },
      cartItems,
      subtotal,
      serviceFee,
      grandTotal,
      coupon,
      coupons,
      isEmpty: cartItems.length === 0,
      message,
    });

  } catch (error) {
    console.error("💥 Error loading cart page:", error);
    res.status(500).send("Server Error - Cannot load cart page");
  }
};





// const getCartPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user) {
//       return res.redirect("/login");
//     }

//     const cart = await Cart.findOne({ userId: user.id }).populate({
//       path: "products.productId",
//       model: "Product",
//       select: "name productPic prices sizes",
//     });

//     const cartItems =
//       cart && cart.products && cart.products.length > 0
//         ? cart.products.map((item) => ({
//             name: item.productId?.name || "Unknown Product",
//             image: item.productId?.productPic?.[0] || "/assets/images/default.jpg",
//             size: item.selectedSize,
//             quantity: item.quantity,
//             price: item.pricePerUnit,
//             total: item.pricePerUnit * item.quantity,
//             id: item.productId?._id,
//           }))
//         : [];

//     const subtotal = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
//     const serviceFee = subtotal > 0 ? 50 : 0;

//     let grandTotal = subtotal + serviceFee;

//     let coupon = { name: null, discount: 0, isMax: false, maxPurchase: 0 };

//     if (cart?.coupon?.name) {
//       const appliedCoupon = await Coupon.findOne({
//         couponCode: cart.coupon.name,
//       });

//       const couponUsedByUser =
//         appliedCoupon &&
//         appliedCoupon.user &&
//         appliedCoupon.user.toString() === user.id;

//       if (!appliedCoupon || appliedCoupon.currentStatus === "expired" || couponUsedByUser) {
//         cart.coupon = { name: null, discount: 0, isMax: false, maxPurchase: 0 };
//         await cart.save();
//       } else {
//         coupon = cart.coupon;
//         grandTotal = subtotal + serviceFee - coupon.discount;
//       }
//     }

//     // ✅ FIX: Define coupons here
//     const coupons = await Coupon.find({ isListed: true, isDeleted: false });

//     const message =
//       req.flash && req.flash("message").length
//         ? req.flash("message")[0]
//         : { type: "", text: "" };

//     res.render("user/card", {
//       user,
//       cart: cart || { products: [], subtotal, grandTotal, coupon },
//       cartItems,
//       subtotal,
//       serviceFee,
//       grandTotal,
//       coupon,
//       coupons, // ✅ now defined correctly
//       isEmpty: cartItems.length === 0,
//       message,
//     });

//   } catch (error) {
//     console.error("💥 Error loading cart page:", error);
//     res.status(500).send("Server Error - Cannot load cart page");
//   }
// };



const moveToCart = async (req, res) => {
  try {
    const { productId, size, qty } = req.body;
    const quantity = parseInt(qty) || 1;

    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
        redirectUrl: "/signin",
      });
    }

    const userId = req.session.user.id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      console.log("⚠️ Invalid Product ID received:", productId);
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.log("⚠️ Product not found:", productId);
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const sizeIndex = product.sizes.indexOf(size);
    if (sizeIndex === -1) {
      return res.json({ success: false, message: "Invalid size selected" });
    }

    const availableQty = product.quantities[sizeIndex];
    const pricePerUnit = product.prices[sizeIndex];

    if (quantity > availableQty) {
      return res.json({
        success: false,
        message: `Only ${availableQty} items available`,
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        subtotal: 0,
        shippingCost: 40,
        grandTotal: 0,
        products: [],
      });
    }

    const existingIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.selectedSize === size
    );

    if (existingIndex > -1) {
      cart.products[existingIndex].quantity += quantity;
    } else {
      cart.products.push({
        productId: product._id,
        quantity,
        selectedSize: size,
        pricePerUnit,
        productDiscount: 0,
      });
    }

    const subtotal = cart.products.reduce(
      (acc, p) => acc + p.quantity * p.pricePerUnit - (p.productDiscount || 0),
      0
    );
    cart.subtotal = subtotal;
    cart.grandTotal = subtotal + cart.shippingCost;

    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId: product._id } } }
    );

    console.log(" Product moved from wishlist to cart successfully");

    return res.json({
  success: true,
  message: "Product moved to cart successfully",
  redirectUrl: "/user/card",
});

  } catch (err) {
    console.error(" MoveToCart Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while moving to cart",
    });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const { productId, selectedSize, action } = req.body;
    if (!productId || !selectedSize || !action) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const cartItem = cart.products.find(
      (p) => p.productId.toString() === productId && p.selectedSize === selectedSize
    );
    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const sizeIndex = productDoc.sizes.indexOf(selectedSize);
    const availableQty = productDoc.quantities[sizeIndex];

    if (action === "increase") {
      if (cartItem.quantity >= 8) {
        return res.status(400).json({ success: false, message: "Max limit 8 reached per product" });
      }
      if (cartItem.quantity + 1 > availableQty) {
        return res.status(400).json({ success: false, message: `Only ${availableQty} items available` });
      }
      cartItem.quantity += 1;
    }

    if (action === "decrease") {
      if (cartItem.quantity <= 1) {
        return res.status(400).json({ success: false, message: "Min limit 1 reached" });
      }
      cartItem.quantity -= 1;
    }

    cart.subtotal = cart.products.reduce(
      (sum, p) => sum + p.pricePerUnit * p.quantity,
      0
    );
    cart.grandTotal = cart.subtotal + cart.shippingCost;

    await cart.save();

    res.json({
      success: true,
      message: "Quantity updated successfully",
      availableQty,
      cart,
    });

  } catch (err) {
    console.error("Quantity update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





const removeFromCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const { productId, selectedSize } = req.params;
    if (!productId || !selectedSize) {
      return res.status(400).json({ success: false, message: "Product ID or size missing" });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.products = cart.products.filter(
      (p) => !(p.productId.toString() === productId && p.selectedSize === selectedSize)
    )
    
    cart.subtotal = cart.products.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0);
    cart.grandTotal = cart.subtotal + cart.shippingCost;

    await cart.save();

    res.json({ success: true, message: "Product removed from cart", cart });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



module.exports = { 
  getCartPage ,
  updateCartQuantity,
  removeFromCart,
  moveToCart,
  applyCoupon
};
