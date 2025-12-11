

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    secondName: String,
    email: { type: String, unique: true },
    phone: { type: String, unique: true, sparse: true },
    password: String,
    profile: String, 
    googleId: { type: String, unique: true, sparse: true },
    isBlocked: { type: Boolean, default: false },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      referralCode: { type: String, unique: true, required: true },
    isVerified: { type: Boolean, default: false },
    loginType: {
  type: String,
  enum: ["manual", "google"],
  default: "manual"
}

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

