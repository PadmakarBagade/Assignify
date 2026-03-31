// routes/tasks.js - Task CRUD APIs
const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// ─── ADD TASK ──────────────────────────────────────────────────────────────
// POST /api/tasks/add
router.post('/add', requireAuth, async (req, res) => {
    const { subject, description, task_date, time_limit } = req.body;
    const userId = req.session.userId;

    if (!subject || !task_date) {
        return res.status(400).json({ success: false, message: 'Subject and date are required.' });
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO tasks (user_id, subject, description, task_date, time_limit) VALUES (?, ?, ?, ?, ?)',
            [userId, subject, description || '', task_date, time_limit || '']
        );

        res.status(201).json({ success: true, message: 'Task added!', taskId: result.insertId });
    } catch (err) {
        console.error('Add task error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── GET ALL TASKS ─────────────────────────────────────────────────────────
async function getTaskBuckets(userId) {
    const [tasks] = await db.execute(
        'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );

    const pending = tasks
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(a.task_date) - new Date(b.task_date));

    const completed = tasks
        .filter(t => t.status === 'completed')
        .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at));

    return { tasks, pending, completed, total: tasks.length };
}

// GET /api/tasks
router.get('/', requireAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const taskData = await getTaskBuckets(userId);
        res.json({ success: true, ...taskData });
    } catch (err) {
        console.error('Get tasks error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── MARK TASK AS COMPLETE ─────────────────────────────────────────────────
// PUT /api/tasks/:id/complete
router.put('/:id/complete', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const taskId = req.params.id;

    try {
        // Make sure task belongs to this user
        const [task] = await db.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [taskId, userId]
        );

        if (task.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (task[0].status === 'completed') {
            return res.status(400).json({ success: false, message: 'Task already completed.' });
        }

        // Mark as complete with timestamp
        const completedAt = new Date();
        await db.execute(
            'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND user_id = ?',
            ['completed', completedAt, taskId, userId]
        );

        // Update streak after completion
        await updateStreak(userId, completedAt);

        const taskData = await getTaskBuckets(userId);
        const completedTask = taskData.completed.find(t => String(t.id) === String(taskId));

        res.json({
            success: true,
            message: 'Task marked as completed! 🎉',
            task: completedTask || null,
            ...taskData
        });
    } catch (err) {
        console.error('Complete task error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── DELETE TASK ───────────────────────────────────────────────────────────
// DELETE /api/tasks/:id
router.delete('/:id', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const taskId = req.params.id;

    try {
        const [result] = await db.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [taskId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        res.json({ success: true, message: 'Task deleted.' });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── GET TODAY'S TASKS (for reminder check) ────────────────────────────────
// GET /api/tasks/today
router.get('/today', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const [tasks] = await db.execute(
            'SELECT * FROM tasks WHERE user_id = ? AND task_date = ?',
            [userId, today]
        );

        const hasPending = tasks.some(t => t.status === 'pending');
        res.json({ success: true, tasks, hasPending });
    } catch (err) {
        console.error('Today tasks error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ─── STREAK UPDATE HELPER ──────────────────────────────────────────────────
async function updateStreak(userId, completionTime) {
    const today = completionTime.toISOString().split('T')[0]; // YYYY-MM-DD

    const [streakRows] = await db.execute(
        'SELECT * FROM streaks WHERE user_id = ?',
        [userId]
    );

    if (streakRows.length === 0) {
        // Create streak record if missing
        await db.execute(
            'INSERT INTO streaks (user_id, current_streak, last_completed_date) VALUES (?, 1, ?)',
            [userId, today]
        );
        return;
    }

    const streak = streakRows[0];
    const lastDate = streak.last_completed_date
        ? new Date(streak.last_completed_date).toISOString().split('T')[0]
        : null;

    // Already completed a task today — no streak change
    if (lastDate === today) return;

    // Check if yesterday was the last completed day
    const yesterday = new Date(completionTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak;
    if (lastDate === yesterdayStr) {
        // Consecutive day — increment streak
        newStreak = streak.current_streak + 1;
    } else {
        // Missed one or more days — reset streak
        newStreak = 1;
    }

    await db.execute(
        'UPDATE streaks SET current_streak = ?, last_completed_date = ? WHERE user_id = ?',
        [newStreak, today, userId]
    );
}

module.exports = router;
