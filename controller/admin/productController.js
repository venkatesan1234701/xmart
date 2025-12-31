const Product = require("../../models/productModel");
const  Category = require('../../models/category')
const path = require("path");
const { postEditCategory } = require("./category");

const mongoose = require("mongoose");



const renderProductsPage = async (req, res) => {
  try {
    const perPage = 4;
    const page = parseInt(req.query.page) || 1;

    // const totalProducts = await Product.countDocuments({ isDeleted: false });
    // const products = await Product.find({ isDeleted: false })
    //   .sort({ createdAt: -1 })
    //   .skip((page - 1) * perPage)
    //   .limit(perPage)
    //   .lean();

 const totalProducts = await Product.countDocuments();

const products = await Product.find()
  .sort({ createdAt: -1 })
  .skip((page - 1) * perPage)
  .limit(perPage)
  .lean();

    const categories = await Category.find().sort({ name: 1 }).lean();

    const totalPages = Math.ceil(totalProducts / perPage);

    res.render("admin/products", {
      products,
      categories,
      currentPage: page,
      totalPages,
      totalProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};




const addProduct = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if(!category) return res.status(400).json({ success: false, message: "Category is required" })
    if(!name || !name.trim()) return res.status(400).json({ success: false, message: "Product name is required" })
        const existingProduct = await Product.findOne({
      category,
      name: { $regex: `^${name.trim()}$`, $options: "i" }
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in this category"
      });
    }

    const sizes = ["S","M","L"];
    const prices = [];
    const quantities = [];

    sizes.forEach((size, idx) => {
      const price = req.body.prices && req.body.prices[idx] ? Number(req.body.prices[idx]) : 0;
      const qty = req.body.quantities && req.body.quantities[idx] ? Number(req.body.quantities[idx]) : 0;
      prices.push(price);
      quantities.push(qty);
    });

    const images = [];
    ["image0","image1","image2"].forEach(f => {
      if(req.files && req.files[f] && req.files[f][0]){
        images.push("/uploads/products/" + req.files[f][0].filename);
      }
    });

    const newProduct = new Product({
      name: name.trim(),
      description: description?.trim() || "",
      category,
      sizes,
      prices,
      quantities,
      productPic: images
    });

    await newProduct.save();
    res.json({ success: true, message: "Product added successfully" });

  } catch(err){
    console.error("Add Product Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}




const getAddProductPage = async (req, res) => {
  try {
    const categories = await Category.find({
      isDeleted: false,
      isBlock: false,       
    })
    .sort({ name: 1 })
    .lean();

    res.render("admin/addProduct", { categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};



const searchProducts = async (req, res) => {
  try {
    const query = req.query.query || "";

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const products = await Product.find({
      name: { $regex: query, $options: "i" }, 
      isDeleted: false
    });

    if (!products || products.length === 0) {
      return res.json([])
    }


    const productsWithCategory = await Promise.all(products.map(async (prod) => {
      const cat = await Category.findById(prod.category);
      return {
        _id: prod._id,
        name: prod.name,
        categoryName: cat ? cat.name : "Unknown",
        price: prod.price,
        quantity: prod.quantity,
        weight: prod.weight,
        size: prod.size,
        description: prod.description,
        productPic: prod.productPic
      };
    }));

    res.json(productsWithCategory);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};


const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    const categories = await Category.find().lean();
    if(!product) return res.status(404).send("Product not found");

    res.json({ product, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching product");
  }
};






const updateProduct = async (req, res) => {
  try {
    const { name, description, category, sizes, prices, quantities } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      const duplicate = await Product.findOne({
      _id: { $ne: productId },
      category,
      name: { $regex: `^${name.trim()}$`, $options: "i" }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in this category"
      });
    }

    product.name = name.trim();
    product.description = description?.trim() || "";
    product.category = category;

    product.prices = [0, 0, 0];
    product.quantities = [0, 0, 0];

    if (Array.isArray(sizes)) {
      sizes.forEach((s, i) => {
        const idx = product.sizes.indexOf(s);
        if (idx > -1) {
          product.prices[idx] = Number(prices[i] || 0);
          product.quantities[idx] = Number(quantities[i] || 0);
        }
      });
    }

    if (!product.productPic) product.productPic = [];
    ["image0", "image1", "image2"].forEach((f, idx) => {
      if (req.files[f]) product.productPic[idx] = "/uploads/products/" + req.files[f][0].filename;
    });
    for (let i = 0; i < 3; i++) if (!product.productPic[i]) product.productPic[i] = "";

    await product.save();
    res.json({ success: true, message: "Product updated!" });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ success: false, message: "Server Error" })
  }
}






// const deleteProduct = async (req, res) => {
//   try {
//     // await Product.findByIdAndDelete(req.params.id);
//     await Product.findByIdAndUpdate(req.params.id, { isDeleted: true })
//     res.redirect("/admin/products");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server Error");
//   }
// };


const toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    product.isDeleted = !product.isDeleted;
    await product.save();

    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};



module.exports = { 
  renderProductsPage, 
  addProduct ,
  getAddProductPage,
  searchProducts,
  getProductById,
  updateProduct,
  toggleProductStatus
}
