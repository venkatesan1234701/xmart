const mongoose = require("mongoose");
const slugify = require("slugify")

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  isDeleted: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true })

categorySchema.pre("validate", function(next) {
  if (this.name && this.name.trim() !== "") {
    this.slug = slugify(this.name, { lower: true, strict: true })
  } else {
    this.slug = undefined;
  }
  next()
})

module.exports = mongoose.model("Category", categorySchema)
