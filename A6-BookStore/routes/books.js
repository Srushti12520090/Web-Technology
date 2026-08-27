const router = require("express").Router();
const Book = require("../models/Book");

router.get("/", async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } }
      ];
    }
    if (category && category !== "All") filter.category = category;

    let query = Book.find(filter);
    if (sort === "price-asc") query = query.sort({ price: 1 });
    if (sort === "price-desc") query = query.sort({ price: -1 });
    if (sort === "rating") query = query.sort({ rating: -1 });

    res.json(await query);
  } catch (err) {
    res.status(500).json({ message: "Could not load books." });
  }
});

router.post("/seed", async (req, res) => {
  const count = await Book.countDocuments();
  if (count > 0) return res.json({ message: "Books already exist." });

  const books = [
    { title: "Clean Code", author: "Robert C. Martin", category: "Programming", price: 599, rating: 4.8, description: "A practical guide to writing clean and maintainable software." },
    { title: "Atomic Habits", author: "James Clear", category: "Self Help", price: 399, rating: 4.7, description: "A proven framework for building better habits." },
    { title: "The Alchemist", author: "Paulo Coelho", category: "Fiction", price: 299, rating: 4.6, description: "A young shepherd follows his dreams across the world." },
    { title: "Introduction to Algorithms", author: "Cormen et al.", category: "Technology", price: 899, rating: 4.9, description: "A comprehensive reference for algorithms and data structures." },
    { title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", category: "Business", price: 349, rating: 4.5, description: "Lessons about money, investing and financial literacy." },
    { title: "The Psychology of Money", author: "Morgan Housel", category: "Business", price: 449, rating: 4.8, description: "Timeless lessons on wealth, greed and happiness." }
  ];
  await Book.insertMany(books);
  res.json({ message: "Sample books inserted." });
});

module.exports = router;