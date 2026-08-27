const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email is already registered." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashed });

    req.session.userId = user._id.toString();
    res.status(201).json({ message: "Registration successful.", user: { name, email } });
  } catch (err) {
    res.status(500).json({ message: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    req.session.userId = user._id.toString();
    res.json({ message: "Login successful.", user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Login failed." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully." }));
});

router.get("/user", async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = await User.findById(req.session.userId).select("-password");
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user });
});

module.exports = router;