const mongoose = require("mongoose");
const Cart = require("../../models/card");
const Product = require("../../models/productModel");
const Wishlist = require("../../models/wishlistModel");
// const Coupon = require("../../models/couponSchema ")
const Coupon = require("../../models/couponSchema ");
const Order = require("../../models/order")


// const applyCoupon = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Please log in first"
//       });
//     }

//     const { couponCode } = req.body;
//     if (!couponCode || !couponCode.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Enter a coupon code"
//       });
//     }

//     const coupon = await Coupon.findOne({
//       couponCode: { $regex: new RegExp(`^${couponCode.trim()}$`, "i") },
//       isListed: true,
//       currentStatus: "active"
//     });

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid coupon code"
//       });
//     }

//     const now = new Date();
//     if (
//       (coupon.couponStartDate && now < coupon.couponStartDate) ||
//       (coupon.couponExpiryDate && now > coupon.couponExpiryDate)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon is not active now"
//       });
//     }

//     const cart = await Cart.findOne({ userId: user.id });
//     if (!cart || cart.products.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Your cart is empty"
//       });
//     }

//     let originalSubtotal = 0;
//     cart.products.forEach(item => {
//       originalSubtotal += item.originalPrice * item.quantity;
//     });

//     if (originalSubtotal < coupon.minimumPurchase) {
//       return res.status(400).json({
//         success: false,
//         message: `Minimum purchase should be ₹${coupon.minimumPurchase} to use this coupon`
//       });
//     }

//     let discount = Math.round((originalSubtotal * coupon.discountPercentage) / 100);
//     let isMax = false;

//     if (discount > coupon.maximumDiscount) {
//       discount = coupon.maximumDiscount;
//       isMax = true;
//     }

//     let distributed = 0;

//     cart.products.forEach(item => {
//       const contribution = (item.originalPrice * item.quantity) / originalSubtotal;

//       const productDiscount = Math.round(discount * contribution);

//       const perItemDiscount = productDiscount / item.quantity;

//       item.productDiscount = productDiscount;
//       item.pricePerUnit = Math.round(item.originalPrice - perItemDiscount);

//       distributed += productDiscount;
//     });

//     const diff = discount - distributed;
//     if (diff !== 0 && cart.products.length > 0) {
//       const item = cart.products[0];
//       item.productDiscount += diff;

//       const perItemDiscount = item.productDiscount / item.quantity;
//       item.pricePerUnit = Math.round(item.originalPrice - perItemDiscount);
//     }

//     let newSubtotal = 0;
//     cart.products.forEach(p => {
//       newSubtotal += p.pricePerUnit * p.quantity;
//     });

//     cart.subtotal = Math.round(newSubtotal);

//     cart.grandTotal = cart.subtotal + (cart.shippingCost || 40);

//     cart.coupon = {
//       name: coupon.couponCode,
//       discount,
//       isMax,
//       maxPurchase: coupon.maximumDiscount
//     };

//     await cart.save();

//     return res.status(200).json({
//       success: true,
//       message: `Coupon applied successfully! You saved ₹${discount}.`,
//       newGrandTotal: cart.grandTotal,
//       discount,
//       couponCode: coupon.couponCode
//     });

//   } catch (error) {
//     console.error("Error applying coupon:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while applying coupon"
//     });
//   }
// };




const applyCoupon = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first"
      });
    }

    const { couponCode } = req.body;
    if (!couponCode || !couponCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Enter a coupon code"
      });
    }

    const coupon = await Coupon.findOne({
      couponCode: { $regex: new RegExp(`^${couponCode.trim()}$`, "i") },
      isListed: true,
      currentStatus: "active"
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code"
      });
    }

    const now = new Date();
    if (
      (coupon.couponStartDate && now < coupon.couponStartDate) ||
      (coupon.couponExpiryDate && now > coupon.couponExpiryDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not active now"
      });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty"
      });
    }

    /* 🔹 ORIGINAL SUBTOTAL */
    let originalSubtotal = 0;
    cart.products.forEach(item => {
      originalSubtotal += item.originalPrice * item.quantity;
    });

    if (originalSubtotal < coupon.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase should be ₹${coupon.minimumPurchase} to use this coupon`
      });
    }

    /* 🔹 DISCOUNT */
    let discount = Math.round(
      (originalSubtotal * coupon.discountPercentage) / 100
    );
    let isMax = false;

    if (discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
      isMax = true;
    }

    /* 🔹 PRODUCT LEVEL DISTRIBUTION (OLD LOGIC SAME) */
    let distributed = 0;

    cart.products.forEach(item => {
      const contribution =
        (item.originalPrice * item.quantity) / originalSubtotal;

      const productDiscount = Math.round(discount * contribution);
      const perItemDiscount = productDiscount / item.quantity;

      item.productDiscount = productDiscount;
      item.pricePerUnit = Math.round(
        item.originalPrice - perItemDiscount
      );

      distributed += productDiscount;
    });

    const diff = discount - distributed;
    if (diff !== 0 && cart.products.length > 0) {
      const item = cart.products[0];
      item.productDiscount += diff;

      const perItemDiscount = item.productDiscount / item.quantity;
      item.pricePerUnit = Math.round(
        item.originalPrice - perItemDiscount
      );
    }

 

    cart.subtotal = originalSubtotal;
    cart.grandTotal =
      originalSubtotal - discount + (cart.shippingCost || 40);

    cart.coupon = {
      name: coupon.couponCode,
      discount,
      isMax,
      maxPurchase: coupon.maximumDiscount
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: `Coupon applied successfully! You saved ₹${discount}.`,
      newGrandTotal: cart.grandTotal,
      discount,
      couponCode: coupon.couponCode
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while applying coupon"
    });
  }
};




// const getCartPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user) return res.redirect("/signin");

//     let cart = await Cart.findOne({ userId: user.id }).populate({
//       path: "products.productId",
//       model: "Product",
//       select: "name productPic prices sizes",
//     });

//     if (!cart) {
//       cart = new Cart({
//         userId: user.id,
//         products: [],
//         subtotal: 0,
//         shippingCost: 40,
//         grandTotal: 40,
//         coupon: {
//           name: null,
//           discount: 0,
//           isMax: false,
//           maxPurchase: 0,
//         },
//       });
//       await cart.save();
//     }


//     if (cart.coupon?.name) {
//       cart.products.forEach((item) => {
//         const originalPrice =
//           Number(item.pricePerUnit) + Number(item.productDiscount);

//         item.pricePerUnit = originalPrice;
//         item.productDiscount = 0;
//       });

//       let newSubtotal = 0;
//       cart.products.forEach((p) => {
//         newSubtotal += Number(p.pricePerUnit);
//       });
//       cart.subtotal = Number(newSubtotal.toFixed(2));

//       cart.grandTotal = Number(
//         (cart.subtotal + (cart.shippingCost || 40)).toFixed(2)
//       );

//       cart.coupon = {
//         name: null,
//         discount: 0,
//         isMax: false,
//         maxPurchase: 0,
//       };

//       await cart.save();
//     }

//     const cartItems =
//       cart.products.length > 0
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

//     const subtotal = cart.subtotal;
//     const serviceFee = cart.shippingCost || 40;
//     const grandTotal = cart.grandTotal;

//     const now = new Date();

//     const coupons = await Coupon.find({
//       isListed: true,
//       currentStatus: "active",
//       couponStartDate: { $lte: now },
//       couponExpiryDate: { $gte: now },
//     });

//     res.render("user/card", {
//       user,
//       cart,
//       cartItems,
//       subtotal,
//       serviceFee,
//       grandTotal,
//       coupon: cart.coupon,
//       coupons,
//       isEmpty: cartItems.length === 0,
//       message: { type: "", text: "" },
//     });

//   } catch (error) {
//     console.error("Error loading cart page:", error);
//     res.status(500).send("Server Error - Cannot load cart page");
//   }
// };



/////////////////////////////////////////////                           its currct get card page 


const getCartPage = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/signin");

    let cart = await Cart.findOne({ userId: user.id }).populate({
      path: "products.productId",
      model: "Product",
      select: "name productPic prices sizes isBlocked isDeleted category",
      populate: {
        path: "category",
        select: "isBlocked isDeleted"
      }
    });

    if (!cart) {
      cart = await Cart.create({
        userId: user.id,
        products: [],
        subtotal: 0,
        shippingCost: 40,
        grandTotal: 40,
        coupon: {
          name: null,
          discount: 0,
          isMax: false,
          maxPurchase: 0,
        },
      });
    }

    // 🔹 RESET COUPON
    if (cart.coupon?.name) {
      cart.products.forEach(item => {
        item.pricePerUnit = item.originalPrice;
        item.productDiscount = 0;
      });

      cart.subtotal = cart.products.reduce(
        (sum, p) => sum + p.originalPrice * p.quantity,
        0
      );

      cart.grandTotal = cart.subtotal + (cart.shippingCost || 40);

      cart.coupon = {
        name: null,
        discount: 0,
        isMax: false,
        maxPurchase: 0
      };

      await cart.save();
    }

    // 🔴 REMOVE ONLY INVALID ITEMS
    let messageText = "";

    cart.products = cart.products.filter(item => {
      const product = item.productId;

      // PRODUCT ISSUE
      if (!product || product.isBlocked || product.isDeleted) {
        messageText = "This product is not available";
        return false; // ❌ remove this item
      }

      // CATEGORY ISSUE
      if (
        product.category &&
        (product.category.isBlocked || product.category.isDeleted)
      ) {
        messageText = "This category is not available";
        return false; // ❌ remove this item
      }

      return true; // ✅ keep this item
    });

    // 🔹 RECALCULATE TOTALS AFTER REMOVE
    cart.subtotal = cart.products.reduce(
      (sum, item) => sum + item.pricePerUnit * item.quantity,
      0
    );

    cart.grandTotal = cart.subtotal + (cart.shippingCost || 40);
    await cart.save();

    // 🔹 USED COUPONS
    const usedCoupons = await Order.find({ userId: user.id })
                                   .distinct("coupon.name");
    const filteredUsedCoupons = usedCoupons.filter(c => c !== null);

    // 🔹 CART ITEMS
    const cartItems = cart.products.map(item => ({
      name: item.productId?.name || "Unknown Product",
      image: item.productId?.productPic?.[0] || "/assets/images/default.jpg",
      size: item.selectedSize,
      quantity: item.quantity,
      price: item.pricePerUnit,
      total: item.pricePerUnit * item.quantity,
      id: item.productId?._id,
    }));

    const now = new Date();

    const coupons = await Coupon.find({
      isListed: true,
      currentStatus: "active",
      couponStartDate: { $lte: now },
      couponExpiryDate: { $gte: now },
    });

    // 🔹 FINAL RENDER
    res.render("user/card", {
      user,
      cart,
      cartItems,
      subtotal: cart.subtotal,
      serviceFee: cart.shippingCost || 40,
      grandTotal: cart.grandTotal,
      coupon: cart.coupon,
      coupons,
      usedCoupons: filteredUsedCoupons,
      isEmpty: cartItems.length === 0,
      message: {
        type: messageText ? "error" : "",
        text: messageText
      }
    });

  } catch (error) {
    console.error("Error loading cart page:", error);
    res.status(500).send("Server Error - Cannot load cart page");
  }
};




const moveToCart = async (req, res) => {
  try {
    const { productId, size } = req.body;

    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
        redirectUrl: "/signin",
      })
    }
    const userId = req.session.user.id;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      })
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const sizeIndex = product.sizes.indexOf(size);
    if (sizeIndex === -1) {
      return res.json({ success: false, message: "Invalid size selected" });
    }

    const pricePerUnit = product.prices[sizeIndex];

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
    )
    if (existingIndex > -1) {
      await Wishlist.updateOne(
        { userId },
        { $pull: { products: { productId: product._id } } }
      );

      return res.json({
        success: true,
        message: "Product already in cart",
        redirectUrl: "/user/card",
      })
    }
    cart.products.push({
      productId: product._id,
      quantity: 1,
      selectedSize: size,
      pricePerUnit,
      originalPrice: product.prices[sizeIndex],
      productDiscount: 0,
    });

    const subtotal = cart.products.reduce(
      (acc, p) => acc + p.quantity * p.pricePerUnit - (p.productDiscount || 0),
      0
    );

    cart.subtotal = subtotal;
    cart.grandTotal = subtotal + cart.shippingCost;

    await cart.save()

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId: product._id } } }
    )

    return res.json({
      success: true,
      message: "Moved to cart successfully",
      redirectUrl: "/user/card",
    });

  } catch (err) {
    console.error("MoveToCart Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while moving to cart",
    });
  }
};



///////////////////////////////                       its move to card 

// const moveToCart = async (req, res) => {
//   try {
//     const { productId, size, qty } = req.body;
//     const quantity = parseInt(qty) || 1;

//     if (!req.session.user || !req.session.user.id) {
//       return res.status(401).json({
//         success: false,
//         message: "Please login first",
//         redirectUrl: "/signin",
//       });
//     }

//     const userId = req.session.user.id;

//     if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
//       console.log(" Invalid Product ID received:", productId);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid product ID",
//       });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       console.log(" Product not found:", productId);
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     const sizeIndex = product.sizes.indexOf(size);
//     if (sizeIndex === -1) {
//       return res.json({ success: false, message: "Invalid size selected" });
//     }

//     const availableQty = product.quantities[sizeIndex];
//     const pricePerUnit = product.prices[sizeIndex];

//     if (quantity > availableQty) {
//       return res.json({
//         success: false,
//         message: `Only ${availableQty} items available`,
//       });
//     }

//     let cart = await Cart.findOne({ userId });
//     if (!cart) {
//       cart = new Cart({
//         userId,
//         subtotal: 0,
//         shippingCost: 40,
//         grandTotal: 0,
//         products: [],
//       });
//     }

//     const existingIndex = cart.products.findIndex(
//       (p) =>
//         p.productId.toString() === productId &&
//         p.selectedSize === size
//     );

//     if (existingIndex > -1) {
//       cart.products[existingIndex].quantity += quantity;
//     } else {
//       cart.products.push({
//         productId: product._id,
//         quantity,
//         selectedSize: size,
//         pricePerUnit,
//         productDiscount: 0,
//       });
//     }

//     const subtotal = cart.products.reduce(
//       (acc, p) => acc + p.quantity * p.pricePerUnit - (p.productDiscount || 0),
//       0
//     );
//     cart.subtotal = subtotal;
//     cart.grandTotal = subtotal + cart.shippingCost;

//     await cart.save();

//     await Wishlist.updateOne(
//       { userId },
//       { $pull: { products: { productId: product._id } } }
//     );

//     console.log(" Product moved from wishlist to cart successfully");

//     return res.json({
//   success: true,
//   message: "Product moved to cart successfully",
//   redirectUrl: "/user/card",
// })

//   } catch (err) {
//     console.error(" MoveToCart Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while moving to cart",
//     });
//   }
// };




const checkLatestStock = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.id) {
      return res.json({ success: false });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart) {
      return res.json({ success: false });
    }

    let forceUpdate = false;

    for (let item of cart.products) {

      const productDoc = await Product.findById(item.productId);
      if (!productDoc) continue;

      const sizeIndex = productDoc.sizes.indexOf(item.selectedSize);
      const latestStock = productDoc.quantities[sizeIndex];

      if (item.quantity > latestStock) {
        item.quantity = latestStock;
        forceUpdate = true;
      }
    }

    await cart.save();

    return res.json({
      success: true,
      forceUpdate
    });

  } catch (err) {
    console.log("Stock check error:", err);
    res.json({ success: false });
  }
};


const updateCartQuantity = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "User not logged in"
      });
    }

    const { productId, selectedSize, action } = req.body;
    if (!productId || !selectedSize || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing data"
      });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const cartItem = cart.products.find(
      p => p.productId.toString() === productId && p.selectedSize === selectedSize
    );
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart"
      });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const sizeIndex = productDoc.sizes.indexOf(selectedSize);
    const availableQty = productDoc.quantities[sizeIndex];

    if (cartItem.quantity > availableQty) {
      cartItem.quantity = availableQty;
      await cart.save();

      return res.json({
        success: false,
        forceUpdate: true,
        message: `Stock updated. Only ${availableQty} available`,
        newQty: availableQty
      });
    }

    if (action === "increase") {
      if (cartItem.quantity >= 8) {
        return res.json({
          success: false,
          message: "Max limit 8 reached"
        });
      }
      if (cartItem.quantity + 1 > availableQty) {
        return res.json({
          success: false,
          message: `Only ${availableQty} items available`
        });
      }
      cartItem.quantity += 1;
    }

    if (action === "decrease") {
      if (cartItem.quantity <= 1) {
        return res.json({
          success: false,
          message: "Min quantity is 1"
        });
      }
      cartItem.quantity -= 1;
    }

    if (cart.coupon?.name) {
      cart.coupon = {
        name: null,
        discount: 0,
        isMax: false,
        maxPurchase: 0
      };

      cart.products.forEach(item => {
        item.pricePerUnit = item.originalPrice;
        item.productDiscount = 0;
      });
    }

    cart.subtotal = cart.products.reduce(
      (sum, p) => sum + p.originalPrice * p.quantity,
      0
    );

    cart.grandTotal = cart.subtotal + (cart.shippingCost || 40);

    await cart.save();

    return res.json({
      success: true,
      updatedQty: cartItem.quantity,
      availableQty,
      couponRemoved: true
    });

  } catch (err) {
    console.error("Quantity update error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error occurred"
    });
  }
};

// const updateCartQuantity = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user || !user.id) {
//       return res.status(401).json({ success: false, message: "User not logged in" });
//     }

//     const { productId, selectedSize, action } = req.body;
//     if (!productId || !selectedSize || !action) {
//       return res.status(400).json({ success: false, message: "Missing data" });
//     }

//     const cart = await Cart.findOne({ userId: user.id });
//     if (!cart) {
//       return res.status(404).json({ success: false, message: "Cart not found" });
//     }

//     const cartItem = cart.products.find(
//       (p) => p.productId.toString() === productId && p.selectedSize === selectedSize
//     );
//     if (!cartItem) {
//       return res.status(404).json({ success: false, message: "Product not in cart" });
//     }

//     const productDoc = await Product.findById(productId);
//     if (!productDoc) {
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     const sizeIndex = productDoc.sizes.indexOf(selectedSize);
//     const availableQty = productDoc.quantities[sizeIndex];

//     if (cartItem.quantity > availableQty) {
//       cartItem.quantity = availableQty;
//       await cart.save();

//       return res.status(200).json({
//         success: false,
//         forceUpdate: true,
//         message: `Stock updated by admin. Only ${availableQty} available now.`,
//         newQty: availableQty
//       });
//     }

//     if (action === "increase") {
//       if (cartItem.quantity >= 8) {
//         return res.status(400).json({
//           success: false,
//           message: "Max limit 8 reached per product"
//         });
//       }
//       if (cartItem.quantity + 1 > availableQty) {
//         return res.status(400).json({
//           success: false,
//           message: `Only ${availableQty} items available`
//         });
//       }
//       cartItem.quantity += 1;
//     }

//     if (action === "decrease") {
//       if (cartItem.quantity <= 1) {
//         return res.status(400).json({
//           success: false,
//           message: "Min quantity is 1"
//         });
//       }
//       cartItem.quantity -= 1;
//     }

//     cart.subtotal = cart.products.reduce(
//       (sum, p) => sum + p.pricePerUnit * p.quantity,
//       0
//     );
//     cart.grandTotal = cart.subtotal + cart.shippingCost;

//     await cart.save();

//     return res.json({
//       success: true,
//       updatedQty: cartItem.quantity,
//       availableQty
//     });

//   } catch (err) {
//     console.error("Quantity update error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error occurred"
//     });
//   }
// }



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



// const validateBeforeCheckout = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user || !user.id) {
//       return res.json({ success: false, message: "Please login to continue" });
//     }

//     const cart = await Cart.findOne({ userId: user.id });
//     if (!cart || cart.products.length === 0) {
//       return res.json({ success: false, message: "Your cart is empty" });
//     }

//     for (let item of cart.products) {

//       const product = await Product.findById(item.productId);
//       if (!product) {
//         return res.json({ success: false, message: "Some product no longer exists" });
//       }

//       const sizeIndex = product.sizes.indexOf(item.selectedSize);
//       const availableQty = product.quantities[sizeIndex];

//       if (item.quantity > availableQty) {
//         return res.json({
//           success: false,
//           message: `Stock updated! Only ${availableQty} items available for ${product.productName}`
//         });
//       }
//     }

//     return res.json({ success: true });

//   } catch (err) {
//     console.error("Checkout Validate Error:", err);
//     return res.json({
//       success: false,
//       message: "Server Error"
//     });
//   }
// };



const validateBeforeCheckout = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || !user.id) {
      return res.json({
        success: false,
        message: "Please login to continue"
      });
    }

    const cart = await Cart.findOne({ userId: user.id });
    if (!cart || cart.products.length === 0) {
      return res.json({
        success: false,
        message: "Your cart is empty"
      });
    }

    for (let item of cart.products) {

      const product = await Product.findById(item.productId)
        .populate("category");

      if (!product) {
        return res.json({
          success: false,
          message: " This product is not available"
        });
      }

      if (product.isBlocked === true || product.isDeleted === true) {
        return res.json({
          success: false,
          message: "This product is not available"
        });
      }

      if (
        product.category &&
        (product.category.isBlocked === true ||
         product.category.isDeleted === true)
      ) {
        return res.json({
          success: false,
          message: "This category is not available"
        });
      }

      const sizeIndex = product.sizes.indexOf(item.selectedSize);
      const availableQty = product.quantities[sizeIndex];

      if (item.quantity > availableQty) {
        return res.json({
          success: false,
          message: "Selected quantity not available"
        });
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Checkout Validate Error:", err);
    return res.json({
      success: false,
      message: "Server Error"
    });
  }
};


const cancelCoupon = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    cart.products.forEach((item) => {
      item.pricePerUnit = Number(item.originalPrice); 
      item.productDiscount = 0;
    });

    cart.subtotal = cart.products.reduce(
      (sum, item) => sum + item.pricePerUnit * item.quantity,
      0
    );

    cart.grandTotal = cart.subtotal + (cart.shippingCost || 40);

    cart.coupon = {
      name: null,
      discount: 0,
      isMax: false,
      maxPurchase: 0
    };

    await cart.save();

    return res.json({
      success: true,
      subtotal: cart.subtotal,
      grandTotal: cart.grandTotal,
      products: cart.products
    });

  } catch (err) {
    console.error("Cancel coupon error:", err);
    return res.json({ success: false, message: "Error canceling coupon" });
  }
};




// const cancelCoupon = async (req, res) => {
//   try {
//     const userId = req.session.user.id;
//     const cart = await Cart.findOne({ userId });

//     if (!cart) {
//       return res.json({ success: false, message: "Cart not found" });
//     }

//     cart.products.forEach((item) => {
//       const originalPrice = Number(item.pricePerUnit) + Number(item.productDiscount);

//       item.pricePerUnit = Number(originalPrice.toFixed(2))
//       item.productDiscount = 0;                              
//     })
//     let newSubtotal = 0;
//     cart.products.forEach((p) => {
//       newSubtotal += Number(p.pricePerUnit);
//     });

//     cart.subtotal = Number(newSubtotal.toFixed(2));

//     cart.grandTotal = Number((cart.subtotal + cart.shippingCost).toFixed(2));

//     cart.coupon = {
//       name: null,
//       discount: 0,
//       isMax: false,
//       maxPurchase: 0
//     };

//     await cart.save();

//     return res.json({
//       success: true,
//       subtotal: cart.subtotal,
//       grandTotal: cart.grandTotal,
//       products: cart.products
//     });

//   } catch (err) {
//     console.error("Cancel coupon error:", err);
//     return res.json({ success: false, message: "Error canceling coupon" });
//   }
// };



module.exports = { 
  getCartPage ,
  updateCartQuantity,
  removeFromCart,
  moveToCart,
  applyCoupon,
  checkLatestStock,
  validateBeforeCheckout,
  cancelCoupon
};
