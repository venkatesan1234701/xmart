const mongoose = require('mongoose')

const referralSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  used: { type: Boolean, default: false }, 
}, { timestamps: true })

const Referral = mongoose.model('referrals', referralSchema)
module.exports = Referral