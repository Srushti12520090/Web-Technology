const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 4.5 },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
  stock: { type: Number, default: 10 }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);