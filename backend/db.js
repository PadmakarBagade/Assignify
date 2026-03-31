// db.js - MySQL Database Connection
const mysql = require('mysql2');

// Create a connection pool for better performance
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',          // Change to your MySQL username
    password: '',          // Change to your MySQL password
    database: 'study_planner',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export promise-based pool for async/await support
const db = pool.promise();

module.exports = db;
