const User = require("../../models/userSchema")
const mongoose = require("mongoose");
const Address = require('../../models/address')
const Category = require('../../models/category')
const Product = require("../../models/productModel")
const CategoryOffer = require("../../models/categoryOffer.js");
const Cart = require('../../models/card');
const ProductOffer = require("../../models/productOfferModel.js")
const Review = require("../../models/reviewModel.js");
const { models } = require("mongoose")




// const getShopPage = async (req, res) => {
//   try {
//     const user = req.session.user || null;
//     const perPage = 12;
//     const page = parseInt(req.query.page) || 1;
//     const sort = req.query.sort || 'newest';
//     const query = req.query.query || ''; 
//     const categoryFilter = req.query.category || 'all'; 

//     let sortOption = { createdAt: -1 };
//     if (sort === 'lowToHigh') sortOption = { 'prices.0': 1 };
//     if (sort === 'highToLow') sortOption = { 'prices.0': -1 };
//     if (sort === 'nameAToZ') sortOption = { name: 1 };
//     if (sort === 'nameZToA') sortOption = { name: -1 };

//     const categories = await Category.find({ 
//       isBlocked: false, 
//       isDeleted: false 
//     }).lean();

//     let productFilter = { 
//       isDeleted: false 
//     };

//     if (query && query.trim().length >= 2) {
//       productFilter.name = { 
//         $regex: query.trim(), 
//         $options: "i" 
//       };
//     }

//     if (categoryFilter && categoryFilter !== 'all') {
//       productFilter.category = categoryFilter;
//     }

//     let products = await Product.find(productFilter)
//       .populate({ 
//         path: 'category', 
//         match: { isBlocked: false, isDeleted: false } 
//       })
//       .sort(sortOption)
//       .lean();

//     products = products.filter(p => 
//       p.category && 
//       p.name.toLowerCase() !== 'siva'
//     );

//     const now = new Date();
//     const activeProductOffers = await ProductOffer.find({
//       currentStatus: 'active',
//       isListed: true,
//       startDate: { $lte: now },
//       endDate: { $gte: now }
//     }).lean()

//     const activeCategoryOffers = await CategoryOffer.find({
//       status: 'list',
//       isListed: true,
//       startDate: { $lte: now },
//       endDate: { $gte: now }
//     }).lean()

//     const productsWithOffer = products.map(product => {
//       const productOffer = activeProductOffers.find(
//         o => o.product.toString() === product._id.toString()
//       );
      
//       let categoryOffer = null;
//       if (product.category) {
//         categoryOffer = activeCategoryOffers.find(
//           c => c.category.toString() === product.category._id.toString()
//         );
//       }

//       let finalOffer = null;
//       if (productOffer && categoryOffer) {
//         finalOffer = productOffer.offerPercentage >= categoryOffer.offerPercentage 
//           ? productOffer 
//           : categoryOffer;
//       } else if (productOffer) {
//         finalOffer = productOffer;
//       } else if (categoryOffer) {
//         finalOffer = categoryOffer;
//       }

//       return { 
//         ...product, 
//         offer: finalOffer 
//       };
//     });

//     const totalProducts = productsWithOffer.length;
//     const pages = Math.ceil(totalProducts / perPage);
//     const paginatedProducts = productsWithOffer.slice(
//       (page - 1) * perPage, 
//       page * perPage
//     );

//     let searchMessage = "Browse our products";
//     let noProductsMessage = "No products available";
    
//     if (query.trim()) {
//       searchMessage = `Showing results for "${query}"`;
//       if (totalProducts === 0) {
//         noProductsMessage = `No products found for "${query}"`;
//       }
//     }

//     if (categoryFilter !== 'all') {
//       const selectedCategory = categories.find(c => c._id.toString() === categoryFilter);
//       if (selectedCategory) {
//         searchMessage = `Products in ${selectedCategory.name}`;
//       }
//     }

//     res.render('user/shop', {
//       user,
//       products: paginatedProducts,
//       allProductsCount: totalProducts,       
//       categories,
//       current: page,
//       pages,
//       sort,
//       query: query || '',                    
//       categoryFilter,                         
//       searchMessage,                         
//       noProducts: totalProducts === 0,       
//       noProductsMessage,                     
//       hasSearch: !!query.trim(),             
//       hasCategoryFilter: categoryFilter !== 'all' 
//     });

//   } catch (err) {
//     console.error("getShopPage error:", err);
//     res.status(500).render('user/error', { 
//       error: 'Shop page failed to load. Please try again.' 
//     });
//   }
// }


const getShopPage = async (req, res) => {
  try {
    const user = req.session.user || null;

    const perPage = 12;
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'newest';
    const query = (req.query.query || '').trim();
    const categoryFilter = req.query.category || 'all';
    let sortOption = { createdAt: -1 }

    if (sort === 'lowToHigh') sortOption = { 'prices.0': 1 };
    if (sort === 'highToLow') sortOption = { 'prices.0': -1 };
    if (sort === 'nameAToZ') sortOption = { name: 1 };
    if (sort === 'nameZToA') sortOption = { name: -1 };

    const categories = await Category.find({
      isBlocked: false,
      isDeleted: false
    }).lean();

    let productFilter = { isDeleted: false };

    if (query.length >= 2) {
      productFilter.name = { $regex: query, $options: 'i' };
    }

    if (categoryFilter !== 'all') {
      productFilter.category = categoryFilter;
    }
    const totalProducts = await Product.countDocuments(productFilter);
    const pages = Math.ceil(totalProducts / perPage);

    let products = await Product.find(productFilter)
      .populate({
        path: 'category',
        match: { isBlocked: false, isDeleted: false }
      })
      .sort(sortOption) 
      .skip((page - 1) * perPage)
      .limit(perPage)
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
      const productOffer = activeProductOffers.find(
        o => o.product.toString() === product._id.toString()
      );

      let categoryOffer = null;
      if (product.category) {
        categoryOffer = activeCategoryOffers.find(
          c => c.category.toString() === product.category._id.toString()
        );
      }

      let finalOffer = null;
      if (productOffer && categoryOffer) {
        finalOffer =
          productOffer.offerPercentage >= categoryOffer.offerPercentage
            ? productOffer
            : categoryOffer;
      } else if (productOffer) {
        finalOffer = productOffer;
      } else if (categoryOffer) {
        finalOffer = categoryOffer;
      }

      return {
        ...product,
        offer: finalOffer
      };
    })
    let searchMessage = 'Browse our products';
    let noProductsMessage = 'No products available';

    if (query) {
      searchMessage = `Showing results for "${query}"`;
      if (totalProducts === 0) {
        noProductsMessage = `No products found for "${query}"`;
      }
    }

    if (categoryFilter !== 'all') {
      const selectedCategory = categories.find(
        c => c._id.toString() === categoryFilter
      );
      if (selectedCategory) {
        searchMessage = `Products in ${selectedCategory.name}`;
      }
    }
    res.render('user/shop', {
      user,
      products: productsWithOffer,
      categories,
      current: page,
      pages,
      sort,
      query,
      categoryFilter,
      searchMessage,
      noProducts: productsWithOffer.length === 0,
      noProductsMessage,
      hasSearch: !!query,
      hasCategoryFilter: categoryFilter !== 'all'
    })
  } catch (err) {
    console.error('getShopPage error:', err);
    res.status(500).render('user/error', {
      error: 'Shop page failed to load. Please try again.'
    });
  }
};


const getSingleProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

       if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.render("user/error")
    }

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
}




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

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const userId = req.user.id;
    const quantity = Math.min(parseInt(qty) || 1, 8);
    const unitPrice = parseFloat(pricePerUnit);

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const sizeIndex = product.sizes.indexOf(size);
    if (sizeIndex === -1) {
      return res.json({ success: false, message: "Invalid size selected" });
    }

    const availableQty = product.quantities[sizeIndex];

    if (quantity > availableQty) {
      return res.json({ success: false, message: `Only ${availableQty} items available` });
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      return res.json({ success: false, message: "Invalid price per unit" });
    }

    const originalPrice = unitPrice;

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

    const existingProduct = cart.products.find(
      p => p.productId.toString() === productId && p.selectedSize === size
    );

    if (existingProduct) {
      const newQty = existingProduct.quantity + quantity;

      if (existingProduct.quantity >= 8) {
        return res.json({ success: false, message: "Max 8 per product " });
      }

      if (newQty > 8) {
        return res.json({
          success: false,
          message: `You can add only ${8 - existingProduct.quantity} more`
        });
      }

      if (newQty > availableQty) {
        return res.json({
          success: false,
          message: `Only ${availableQty} items available`
        });
      }

      existingProduct.quantity = newQty;
      existingProduct.pricePerUnit = existingProduct.originalPrice;
    }

    else {
      cart.products.push({
        productId: product._id,
        quantity,
        selectedSize: size,

        originalPrice: originalPrice,

        pricePerUnit: originalPrice,

        productDiscount: 0
      });
    }

    cart.subtotal = cart.products.reduce(
      (sum, p) => sum + p.pricePerUnit * p.quantity,
      0
    );

    cart.grandTotal = cart.subtotal + cart.shippingCost;

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
}





const searchProducts = async (req, res) => {
  try {
    const { query = "", category } = req.query;

    if (!query.trim() || query.trim().length < 2) {
      return res.json([]);
    }
    let filter = {
      name: { $regex: query.trim(), $options: "i" }, 
      isDeleted: false
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .select('name category price quantity _id')
      .limit(10)
      .lean();

    const filteredProducts = products.filter(prod => 
      prod.name.toLowerCase() !== 'siva'
    );

    res.json(filteredProducts);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ products: [] });
  }
};




const getProfilePage = async (req, res) => {
  try {
     const googleBlock = req.query.googleBlock
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect("/signin");

    const user = await User.findById(sessionUser.id).lean();
    if (!user) return res.redirect("/signin");

    const addresses = await Address.find({ 
      userId: sessionUser.id,
      isActive: true 
    }).lean();

    res.render("user/profile", { user, addresses,googleBlock });
  } catch (err) {
    console.error("Profile Page Error:", err);
    res.status(500).send("Server Error");
  }
}




const getEditProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/signin");
    }
    const userId = req.session.user.id;
    if (!userId) return res.redirect("/signin")

    const user = await User.findById(userId).lean()
    if (!user) return res.redirect("/signin")

    res.render("user/editProfile", { user })

  } catch (err) {
    console.error(err);
    res.redirect("/signin")
  }
}


const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ success: false, msg: "Not logged in" });

    const { firstName, secondName, phone } = req.body;

    if (!firstName || !secondName || !phone) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ success: false, msg: "Phone must be 10 digits" });
    }

    const exists = await User.findOne({ phone, _id: { $ne: userId } });
    if (exists) {
      return res.status(400).json({ success: false, msg: "Phone number already exists" });
    }

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
      phone: updatedUser.phone
    };

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};


// const uploadProfileImage = async (req, res) => {
//   try {
//     const userId = req.session.user.id;

//     if (!req.file) {
//       console.log("No file uploaded");
//       return res.redirect("/user/profile");
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { profile: "/uploads/products/" + req.file.filename },
//       { new: true }
//     );

//     req.session.user.profile = updatedUser.profile;

//     res.redirect("/user/profile");
//   } catch (err) {
//     console.error("Profile Image Upload Error:", err);
//     res.redirect("/user/profile");
//   }
// };


const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.session.user.id;

    if (!req.file) {
      console.log("No file uploaded");
      return res.redirect("/user/profile");
    }

    const imagePath = "/uploads/products/" + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profile: imagePath },
      { new: true }
    )
    req.session.user.profile = imagePath;

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
