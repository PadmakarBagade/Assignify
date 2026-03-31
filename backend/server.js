// server.js - Main Express Server
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend to talk to backend
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Session setup (simple cookie-based auth - no JWT needed)
app.use(
  session({
    name: "study_planner_sid",
    secret: "study_planner_secret_key_2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── API ROUTES ───────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const leaderboardRoutes = require("./routes/leaderboard");

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// ─── CATCH-ALL: serve frontend pages ──────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── START SERVER ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Study Planner running at http://localhost:${PORT}\n`);
});
