const Category = require("../../models/category");
const slugify = require("slugify");
const mongoose = require("mongoose");



const renderCategories = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 4;

    const totalCategories = await Category.countDocuments({ isBlocked: false });
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find({ isBlocked: false })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("admin/categories", {
      categories,
      currentPage: page,
      totalPages,
      totalCategories
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}





const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }) 
                                    .sort({ createdAt: -1 });
    res.render("admin/categories", { categories });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};




const addCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description || name.trim() === "" || description.trim() === "") {
    return res.status(400).json({ success: false, message: "Name and description are required" });
  }

  try {
    const existing = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
      description: description.trim(),
    });

    await category.save();

    return res.json({
      success: true,
      message: "Category added successfully",
      category,
    });
  } catch (error) {
    console.error("Add Category Error:", error.message);

    return res
      .status(500)
      .json({ success: false, message: "Server error, please try again" });
  }
};



// const addCategory = async (req, res) => {
//   const { name, description } = req.body;

//   if (!name || !description || name.trim() === "" || description.trim() === "") {
//     return res.status(400).json({ success: false, message: "Name and description are required" });
//   }

//   try {
//     const existing = await Category.findOne({ name });
//     if (existing) {
//       return res.status(400).json({ success: false, message: "Category already exists" });
//     }

//     const category = new Category({ name, description });
//     await category.save()

//     res.json({ success: true, message: "Category added successfully", category });
//   } catch (error) {
//     console.error("Add Category Error:", error.message);
//     res.status(500).json({ success: false, message: "Server error, please try again" });
//   }
// }



const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "Category ID not provided" });
    }

    const deleted = await Category.findByIdAndUpdate(
      id,
      { isDeleted: true }, 
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" })
    }

    res.json({ success: true, message: "Category soft deleted successfully" })
  } catch (err) {
    console.error("Soft Delete Error:", err.message);
    res.status(500).json({ success: false, message: "Error deleting category" })
  }
}





const getEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category.isDelete) return res.redirect("/admin/categories")
    res.render("admin/editCategory", { category })
  } catch (err) {
    console.error("Get Edit Category Error:", err.message)
    res.redirect("/admin/categories")
  }
}


// const postEditCategory = async (req, res) => {
//   const { name, description } = req.body;
//   const id = req.params.id;
//   try {
//     await Category.findByIdAndUpdate(id, { name, description });
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err.message);
//     res.json({ success: false, message: "Server error, please try again" });
//   }
// };

const postEditCategory = async (req, res) => {
  const { name, description } = req.body;
  const id = req.params.id;

  try {
    const existing = await Category.findOne({
      _id: { $ne: id }, 
      name: { $regex: `^${name}$`, $options: "i" }  
    });

    if (existing) {
      return res.json({
        success: false,
        message: "Category name already exists"
      });
    }

    await Category.findByIdAndUpdate(id, {
      name: name.trim(),
      description: description.trim()
    });

    return res.json({
      success: true,
      message: "Category updated successfully"
    });

  } catch (err) {
    console.error("Edit Category Error:", err.message);
    return res.json({
      success: false,
      message: "Server error, please try again"
    });
  }
};




const searchCategories = async (req, res) => {
  try {
    const search = req.query.search;
    const regex = new RegExp(search, "i")

    const categories = await Category.find({
      isDeleted: false,  
      $or: [
        { name: regex },
        { description: regex }
      ]
    })

    res.json({ success: true, categories });
  } catch (err) {
    console.error("Search Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


const toggleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if(!category) return res.status(404).json({ message: 'Category not found' });

    category.isDeleted = !category.isDeleted; 
    await category.save();

    res.json({ message: category.isDeleted ? 'Category blocked' : 'Category unblocked' });
  } catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


const toggleBlockCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isBlocked = !category.isBlocked; 
    await category.save();

    res.status(200).json({ message: 'Block status updated', isBlocked: category.isBlocked });
  } catch (err) {
    console.error(err);
    next(new AppError('Failed to toggle block status', 500));
  }
};





module.exports = {
  renderCategories,
  getCategories,
  addCategory,
  deleteCategory,
  getEditCategory,
  postEditCategory,
  searchCategories,
  toggleCategory,
  toggleBlockCategory
};
