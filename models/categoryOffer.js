

const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  offerPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: ['list', 'unlist'],
    default: 'list',
  },

  isListed: {
    type: Boolean,
    default: true,
  },
});

categoryOfferSchema.pre('save', function (next) {
  this.status = this.isListed ? 'list' : 'unlist';
  next();
});

categoryOfferSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.isListed !== undefined) {
    update.status = update.isListed ? 'list' : 'unlist';
  }
  next();
});

module.exports = mongoose.model('CategoryOffer', categoryOfferSchema);

