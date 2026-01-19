const CategoryOffer = require('../../models/categoryOffer');
const Category = require('../../models/category');
const STATUS = require('../../utils/statusCodes');
const AppError = require('../../utils/appError')


const getCategoryOfferPage = async (req, res) => {
  try {
    const now = new Date();

    await CategoryOffer.updateMany(
      { endDate: { $lt: now }, isListed: true },
      { $set: { isListed: false } }
    );

    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (searchQuery) {
      const isNumeric = !isNaN(searchQuery);

      const matchingCategories = await Category.find({
        name: { $regex: searchQuery, $options: "i" },
        isBlocked: { $ne: true },
        isDeleted: { $ne: true },
      }).select("_id");

      const categoryIds = matchingCategories.map((cat) => cat._id);

      if (isNumeric) {
        query = {
          $or: [
            { offerPercentage: Number(searchQuery) },
            { category: { $in: categoryIds } },
          ],
        };
      } else {
        query = { category: { $in: categoryIds } };
      }
    }

    const totalOffers = await CategoryOffer.countDocuments(query);

    const offers = await CategoryOffer.find(query)
      .populate("category")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const categories = await Category.find({
      isBlocked: { $ne: true },
      isDeleted: { $ne: true },
    }).lean();

    const totalPages = Math.ceil(totalOffers / limit);

    res.render("admin/category-offer", {
      offers,
      categories,
      totalPages,
      currentPage: page,
      search: searchQuery,
    });
  } catch (err) {
    console.error("Error loading category offer page:", err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};





const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, offerPercentage, startDate, endDate } = req.body;

    const existing = await CategoryOffer.findOne({ category: categoryId });
    if (existing) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: 'Offer already exists for this category' });
    }
    const newOffer = new CategoryOffer({
      category: categoryId,
      offerPercentage,
      startDate,
      endDate,
      isListed: true,
    });
    await newOffer.save();
    return res
      .status(STATUS.CREATED)
      .json({ message: 'Offer added successfully', offer: newOffer });
  } catch (err) {
    console.error('Error adding category offer:', err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Server Error' });
  }
};

const deleteCategoryOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await CategoryOffer.findById(id);
    if (!offer) {
      return res.status(STATUS.NOT_FOUND).json({ message: 'Offer not found' });
    }

    await CategoryOffer.findByIdAndDelete(id);

    return res.status(STATUS.OK).json({ message: 'Category offer deleted successfully' });
  } catch (err) {
    console.error('Error deleting category offer:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};


const updateCategoryOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, offerPercentage, startDate, endDate, isListed } = req.body;

    if (!categoryId || !offerPercentage || !startDate || !endDate) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'All fields are required.' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'End date must be after start date.' });
    }

    const offer = await CategoryOffer.findById(id);
    if (!offer) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'Category offer not found.' });
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'Category not found.' });
    }

    const duplicateOffer = await CategoryOffer.findOne({
      category: categoryId,
      _id: { $ne: id }, 
    });

    if (duplicateOffer) {
      return res.status(STATUS.NOT_FOUND).json({ message: 'An offer already exists for this category.' });
    }

    offer.category = categoryId;
    offer.offerPercentage = offerPercentage;
    offer.startDate = startDate;
    offer.endDate = endDate;
    offer.isListed = isListed;

    await offer.save();

    return res.status(STATUS.OK).json({ message: 'Category offer updated successfully.' });
  } catch (err) {
    console.error('Error updating category offer:', err);
    res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Server Error' });
  }
};


module.exports = {
    getCategoryOfferPage,
    addCategoryOffer,
    deleteCategoryOffer,
    updateCategoryOffer
}