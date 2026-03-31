# 📚 Study Planner — Streak & Leaderboard System

A clean, full-stack web application for student study planning with streak tracking and leaderboard rankings.

---

## 🗂 Project Structure

```
study-planner/
├── database.sql                  ← MySQL schema (run this first)
├── frontend/
│   ├── index.html                ← Single-page app (all pages)
│   ├── css/
│   │   └── style.css             ← Complete stylesheet
│   └── js/
│       └── app.js                ← All frontend logic
└── backend/
    ├── server.js                 ← Express app entry point
    ├── db.js                     ← MySQL connection pool
    ├── package.json
    ├── middleware/
    │   └── auth.js               ← Session auth middleware
    └── routes/
        ├── auth.js               ← Register, Login, Logout
        ├── tasks.js              ← Add, Get, Complete, Delete tasks
        └── leaderboard.js        ← Leaderboard + streak info
```

---

## ⚙️ Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- npm

---

## 🚀 Setup Instructions

### Step 1: Database Setup

1. Open your MySQL client (MySQL Workbench, phpMyAdmin, or terminal)
2. Run the schema file:
   ```sql
   source /path/to/study-planner/database.sql
   ```
   Or copy-paste the contents of `database.sql` into your MySQL client.

### Step 2: Configure Database Credentials

Open `backend/db.js` and update with your MySQL credentials:

```js
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',        // ← your MySQL username
    password: '',        // ← your MySQL password
    database: 'study_planner',
    ...
});
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 4: Start the Backend Server

```bash
# Development (auto-restart on changes)
npm run dev

# OR Production
npm start
```

Server will start at: **http://localhost:3000**

### Step 5: Open the Application

Open your browser and go to:
```
http://localhost:3000
```

The frontend is served directly by the Express server from the `/frontend` folder.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current session user |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/add` | Add a new task |
| GET | `/api/tasks` | Get all tasks (pending + completed) |
| PUT | `/api/tasks/:id/complete` | Mark task as completed |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/tasks/today` | Get today's tasks (for reminders) |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get all users sorted by streak |
| GET | `/api/leaderboard/my-streak` | Get current user's streak |

---

## 🔥 Streak Logic

The streak system works as follows:

1. **First task completed** → streak = 1
2. **Task completed next day (consecutive)** → streak + 1
3. **Task completed same day** → streak unchanged
4. **Missed a day** → streak resets to 0 on next completion

Streak data is stored in the `streaks` table:
- `current_streak` — active streak count
- `last_completed_date` — used to calculate consecutive days

---

## 🗄 Database Tables

### `users`
Stores registration data with bcrypt-hashed passwords.

### `tasks`
Stores study tasks per user with status (`pending`/`completed`).

### `streaks`
One record per user tracking current streak and last active date.

---

## 🔐 Authentication

- Session-based authentication (no JWT)
- Passwords hashed with bcrypt (salt rounds: 10)
- Sessions expire after 24 hours
- All task/leaderboard APIs require active session

---

## 🌟 Features

- ✅ User Registration & Login
- ✅ Add Tasks (Subject, Description, Date, Time Limit)
- ✅ Mark Tasks as Complete
- ✅ Pending & Completed Task Lists
- ✅ Visual Progress Bar
- ✅ Streak Tracking System
- ✅ Reminder Banner for pending today's tasks
- ✅ Task History (sorted by date)
- ✅ Global Leaderboard by Streak
- ✅ Toast Notifications
- ✅ Responsive Design
- ✅ Clean dark theme UI

---

## 💡 Troubleshooting

**MySQL connection error:**
- Make sure MySQL service is running
- Check credentials in `backend/db.js`
- Ensure `study_planner` database was created

**Port already in use:**
- Change port in `backend/server.js`: `const PORT = 3001;`

**Sessions not persisting:**
- Make sure cookies are enabled in browser
- Check that `credentials: 'include'` is in all fetch calls (already done)
