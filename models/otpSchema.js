const mongoose = require("mongoose")

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String, 
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expireAt: {
    type: Date,
    required: true,
  },
})
otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("Otp", otpSchema)
