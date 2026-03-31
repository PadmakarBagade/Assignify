// routes/auth.js - Registration and Login APIs
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");

// ─── REGISTER ──────────────────────────────────────────────────────────────
// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { full_name, college_name, contact_number, email, address, password } =
    req.body;

  // Basic validation
  if (
    !full_name ||
    !college_name ||
    !contact_number ||
    !email ||
    !address ||
    !password
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format." });
  }

  // Phone number check
  if (!/^\d{10,15}$/.test(contact_number)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid contact number." });
  }

  try {
    // Check if email already exists
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(
      "INSERT INTO users (full_name, college_name, contact_number, email, address, password) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name, college_name, contact_number, email, address, hashedPassword],
    );

    // Create streak record for this user
    await db.execute(
      "INSERT INTO streaks (user_id, current_streak) VALUES (?, 0)",
      [result.insertId],
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Registration successful! Please login.",
      });
  } catch (err) {
    console.error("Register error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again." });
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  try {
    // Find user by email
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Set and save session before replying so protected routes work immediately
    req.session.userId = user.id;
    req.session.userName = user.full_name;

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Session save error:", saveErr);
        return res
          .status(500)
          .json({ success: false, message: "Login failed. Please try again." });
      }

      res.json({
        success: true,
        message: "Login successful!",
        user: { id: user.id, name: user.full_name, email: user.email },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error. Try again." });
  }
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────
// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out." });
  });
});

// ─── GET CURRENT USER ──────────────────────────────────────────────────────
// GET /api/auth/me
router.get("/me", (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      success: true,
      userId: req.session.userId,
      name: req.session.userName,
    });
  }

  res.json({ success: false, message: "Not logged in." });
});

module.exports = router;
