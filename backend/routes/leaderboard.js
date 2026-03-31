// routes/leaderboard.js - Streak & Leaderboard APIs
const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// ─── GET LEADERBOARD ───────────────────────────────────────────────────────
// GET /api/leaderboard
// Returns all users sorted by streak (descending)
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                u.id,
                u.full_name,
                u.college_name,
                COALESCE(s.current_streak, 0) AS current_streak,
                s.last_completed_date
            FROM users u
            LEFT JOIN streaks s ON u.id = s.user_id
            ORDER BY current_streak DESC, u.full_name ASC
        `);

        // Add rank numbers
        const leaderboard = rows.map((user, index) => ({
            rank: index + 1,
            ...user
        }));

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── GET MY STREAK ─────────────────────────────────────────────────────────
// GET /api/leaderboard/my-streak
router.get('/my-streak', requireAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const [rows] = await db.execute(
            'SELECT * FROM streaks WHERE user_id = ?',
            [userId]
        );

        const streak = rows.length > 0 ? rows[0] : { current_streak: 0, last_completed_date: null };
        res.json({ success: true, streak });
    } catch (err) {
        console.error('My streak error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
