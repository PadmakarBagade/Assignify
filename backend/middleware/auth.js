// middleware/auth.js - Simple session-based auth check
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next(); // User is logged in, proceed
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }
}

module.exports = requireAuth;
