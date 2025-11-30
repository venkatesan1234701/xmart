
const ProductOffer = require('../../models/productOfferModel');
const Product = require('../../models/productModel');
const Category = require("../../models/category")


const getProductOffers = async (req, res) => {
  try {
    const now = new Date();
    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    await ProductOffer.updateMany(
      { endDate: { $lt: now }, isListed: true },
      { $set: { isListed: false } }
    );

    let query = {};

    if (searchQuery) {
      const productMatches = await Product.find({
        name: { $regex: searchQuery, $options: "i" },
        isDeleted: false,
        isBlocked: { $ne: true },
      }).select("_id");

      const matchingProductIds = productMatches.map((p) => p._id);

      const isNumeric = !isNaN(searchQuery);

      query = {
        $or: [
          { product: { $in: matchingProductIds } },
          ...(isNumeric ? [{ offerPercentage: Number(searchQuery) }] : []),
        ],
      };
    }

    const totalOffers = await ProductOffer.countDocuments(query);

    const offers = await ProductOffer.find(query)
      .populate("product")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    offers.forEach((offer) => {
      if (new Date(offer.endDate) < now) offer.currentStatus = "expired";
      else if (new Date(offer.startDate) > now) offer.currentStatus = "upcoming";
      else offer.currentStatus = "active";
    });

    const products = await Product.find({
      isDeleted: false,
      isBlocked: { $ne: true },
    }).lean();

    const totalPages = Math.ceil(totalOffers / limit);

    res.render("admin/product-offer", {
      offers,
      products,
      search: searchQuery,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error("Error loading product offer page:", err);
    res.status(500).send("Server Error");
  }
}




const addOffer = async (req, res) => {
  try {
    const { productId, offerPercentage, startDate, endDate, isListed } = req.body;

    const existing = await ProductOffer.findOne({ product: productId });
    if (existing) {
      return res.status(400).json({ error: "An offer for this product already exists!" });
    }

    const newOffer = new ProductOffer({
      product: productId,
      offerPercentage,
      startDate,
      endDate,
      isListed
    });

    await newOffer.save();
    res.status(200).json({ message: "Offer added successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}



const updateOffer = async (req, res) => {
  try {
    const { productOfferId, productId, offerPercentage, startDate, endDate, isListed } = req.body;

    const existing = await ProductOffer.findOne({ product: productId, _id: { $ne: productOfferId } });
    if (existing) {
      return res.status(400).json({ error: "Another offer already exists for this product!" });
    }

    const updatedOffer = await ProductOffer.findByIdAndUpdate(productOfferId, {
      product: productId,
      offerPercentage,
      startDate,
      endDate,
      isListed
    }, { new: true })

    res.status(200).json({ message: "Offer updated successfully!" })

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}




const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await ProductOffer.findById(id);
    if (!offer) return res.status(404).json({ error: "Offer not found" });

    await offer.deleteOne();
    res.json({ message: "Offer deleted successfully" })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" })
  }
};

module.exports = {
  getProductOffers,
  addOffer,
  updateOffer,
  deleteOffer,
};
