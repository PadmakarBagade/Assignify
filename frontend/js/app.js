// app.js - Main Application Logic
// Study Planner with Streak & Leaderboard System

const API_HOST = window.location.hostname || "localhost";
const API_PROTOCOL =
  window.location.protocol === "file:" ? "http:" : window.location.protocol;
const API = `${API_PROTOCOL}//${API_HOST}:3000/api`;

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const res = await nativeFetch(input, {
    credentials: "include",
    ...init,
  });

  if (res.status === 401 && !String(input).includes("/auth/me")) {
    currentUser = null;
    allTasks = [];
    showPage("login-page");
    showToast("Your session expired. Please login again.", "error");
  }

  return res;
};

// ─── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let allTasks = [];

// ─── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
});

// Check if user is logged in on page load
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: "include" });
    const data = await res.json();
    if (data.success) {
      currentUser = data;
      showDashboard();
    } else {
      showPage("login-page");
    }
  } catch {
    showPage("login-page");
  }
}

// ─── PAGE NAVIGATION ───────────────────────────────────────────────────────
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

function showDashboard() {
  showPage("dashboard-page");
  document.getElementById("user-name-display").textContent = currentUser.name;
  document.getElementById("user-avatar-text").textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  switchTab("home");
  loadDashboardData();
  checkReminders();
}

// ─── TAB NAVIGATION ────────────────────────────────────────────────────────
function switchTab(tab) {
  document
    .querySelectorAll(".nav-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-section")
    .forEach((s) => s.classList.remove("active"));

  const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add("active");

  const section = document.getElementById(`section-${tab}`);
  if (section) section.classList.add("active");

  // Load data for specific tabs
  if (tab === "leaderboard") loadLeaderboard();
  if (tab === "history") loadHistory();
  if (tab === "tasks") loadTasks();
  if (tab === "home") loadDashboardData();
}

// ─── REGISTER ──────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;

  const body = {
    full_name: form.full_name.value.trim(),
    college_name: form.college_name.value.trim(),
    contact_number: form.contact_number.value.trim(),
    email: form.email.value.trim(),
    address: form.address.value.trim(),
    password: form.password.value,
  };

  // Client-side validation
  if (
    !body.full_name ||
    !body.college_name ||
    !body.contact_number ||
    !body.email ||
    !body.address ||
    !body.password
  ) {
    return showToast("All fields are required.", "error");
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);
  if (!emailOk) return showToast("Invalid email format.", "error");

  if (!/^\d{10,15}$/.test(body.contact_number))
    return showToast("Enter a valid phone number.", "error");

  if (body.password.length < 6)
    return showToast("Password must be at least 6 characters.", "error");

  setLoading(form.querySelector("button[type=submit]"), true);

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      showToast("Registered successfully! Please login.", "success");
      showPage("login-page");
    } else {
      showToast(data.message, "error");
    }
  } catch {
    showToast("Server error. Please try again.", "error");
  } finally {
    setLoading(form.querySelector("button[type=submit]"), false);
  }
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    email: form.email.value.trim(),
    password: form.password.value,
  };

  if (!body.email || !body.password)
    return showToast("Email and password required.", "error");

  setLoading(form.querySelector("button[type=submit]"), true);

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      currentUser = { userId: data.user.id, name: data.user.name };
      showToast(`Welcome back, ${data.user.name}! 👋`, "success");
      showDashboard();
    } else {
      showToast(data.message, "error");
    }
  } catch {
    showToast("Server error. Please try again.", "error");
  } finally {
    setLoading(form.querySelector("button[type=submit]"), false);
  }
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────
async function handleLogout() {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
  currentUser = null;
  allTasks = [];
  showPage("login-page");
  showToast("Logged out successfully.", "info");
}

// ─── ADD TASK ──────────────────────────────────────────────────────────────
async function handleAddTask(e) {
  e.preventDefault();
  const form = e.target;

  const body = {
    subject: form.subject.value.trim(),
    description: form.description.value.trim(),
    task_date: form.task_date.value,
    time_limit: form.time_limit.value.trim(),
  };

  if (!body.subject || !body.task_date)
    return showToast("Subject and date are required.", "error");

  setLoading(form.querySelector("button[type=submit]"), true);

  try {
    const res = await fetch(`${API}/tasks/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      showToast("Task added successfully! 📚", "success");
      form.reset();
      // Set today as default date again
      form.task_date.value = getTodayStr();
      loadDashboardData();
    } else {
      showToast(data.message, "error");
    }
  } catch {
    showToast("Server error.", "error");
  } finally {
    setLoading(form.querySelector("button[type=submit]"), false);
  }
}

// ─── COMPLETE TASK ─────────────────────────────────────────────────────────
async function completeTask(taskId) {
  try {
    const res = await fetch(`${API}/tasks/${taskId}/complete`, {
      method: "PUT",
      credentials: "include",
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, "success");
      loadDashboardData();
      await loadTasks();
      switchInnerTab("tasks-tab", "completed");
    } else {
      showToast(data.message, "error");
    }
  } catch {
    showToast("Server error.", "error");
  }
}

// ─── DELETE TASK ───────────────────────────────────────────────────────────
async function deleteTask(taskId) {
  if (!confirm("Delete this task?")) return;

  try {
    const res = await fetch(`${API}/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (data.success) {
      showToast("Task deleted.", "info");
      loadDashboardData();
      loadTasks();
    } else {
      showToast(data.message, "error");
    }
  } catch {
    showToast("Server error.", "error");
  }
}

// ─── LOAD DASHBOARD DATA ───────────────────────────────────────────────────
async function loadDashboardData() {
  try {
    // Load tasks and streak in parallel
    const [tasksRes, streakRes] = await Promise.all([
      fetch(`${API}/tasks`, { credentials: "include" }),
      fetch(`${API}/leaderboard/my-streak`, { credentials: "include" }),
    ]);

    const tasksData = await tasksRes.json();
    const streakData = await streakRes.json();

    if (tasksData.success) {
      allTasks = tasksData.tasks;
      renderStats(tasksData);
      renderProgressBar(tasksData.completed.length, tasksData.total);
      renderPendingTasksHome(tasksData.pending.slice(0, 5));
    }

    if (streakData.success) {
      renderStreak(streakData.streak);
    }
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

// ─── RENDER STATS ──────────────────────────────────────────────────────────
function renderStats(data) {
  el("stat-total").textContent = data.total;
  el("stat-completed").textContent = data.completed.length;
  el("stat-pending").textContent = data.pending.length;

  // Overdue count
  const today = getTodayStr();
  const overdue = data.pending.filter((t) => t.task_date < today).length;
  el("stat-overdue").textContent = overdue;
}

// ─── RENDER PROGRESS BAR ───────────────────────────────────────────────────
function renderProgressBar(completed, total) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  el("progress-pct").textContent = `${pct}%`;
  el("progress-fill").style.width = `${pct}%`;
}

// ─── RENDER STREAK ─────────────────────────────────────────────────────────
function renderStreak(streak) {
  const count = streak.current_streak || 0;
  el("streak-count").textContent = count;

  const msg =
    count === 0
      ? "Complete a task today to start your streak!"
      : count === 1
        ? "Great start! Keep going tomorrow."
        : `${count} day streak! You're on fire! 🔥`;

  el("streak-msg").textContent = msg;
}

// ─── RENDER PENDING TASKS (HOME) ───────────────────────────────────────────
function renderPendingTasksHome(tasks) {
  const container = el("home-pending-list");
  if (tasks.length === 0) {
    container.innerHTML = emptyState("✅", "No pending tasks! Great job.");
    return;
  }

  container.innerHTML = tasks.map((t) => taskItemHTML(t)).join("");
}

// ─── LOAD TASKS (TASKS TAB) ────────────────────────────────────────────────
async function loadTasks() {
  try {
    const res = await fetch(`${API}/tasks`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    renderTaskList("tasks-pending-list", data.pending, "pending");
    renderTaskList("tasks-completed-list", data.completed, "completed");
  } catch (err) {
    console.error("Load tasks error:", err);
  }
}

function renderTaskList(containerId, tasks, type) {
  const container = el(containerId);
  if (!container) return;

  if (tasks.length === 0) {
    const msg =
      type === "pending" ? "No pending tasks!" : "No completed tasks yet.";
    const icon = type === "pending" ? "📭" : "🏁";
    container.innerHTML = emptyState(icon, msg);
    return;
  }

  container.innerHTML = tasks.map((t) => taskItemHTML(t)).join("");
}

// ─── TASK ITEM HTML ────────────────────────────────────────────────────────
function taskItemHTML(task) {
  const today = getTodayStr();
  const isOverdue = task.status === "pending" && task.task_date < today;
  const statusClass =
    task.status === "completed"
      ? "completed"
      : isOverdue
        ? "overdue"
        : "pending";
  const subjectClass = task.status === "completed" ? "done" : "";

  const dateLabel =
    task.status === "completed"
      ? `✅ ${formatDate(task.completed_at)}`
      : isOverdue
        ? `⚠️ Overdue: ${formatDate(task.task_date)}`
        : `📅 ${formatDate(task.task_date)}`;

  const actions =
    task.status === "pending"
      ? `<button class="btn btn-success" onclick="completeTask(${task.id})">✓ Done</button>
           <button class="btn btn-danger" onclick="deleteTask(${task.id})">🗑</button>`
      : `<button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">🗑</button>`;

  return `
    <div class="task-item ${statusClass}">
        <div style="flex:1">
            <div class="task-subject ${subjectClass}">${escHtml(task.subject)}</div>
            ${task.description ? `<div class="text-muted" style="font-size:0.82rem;margin-top:3px">${escHtml(task.description)}</div>` : ""}
            <div class="task-meta mt-10">
                <span class="task-tag">${dateLabel}</span>
                ${task.time_limit ? `<span class="task-tag">⏱ ${escHtml(task.time_limit)}</span>` : ""}
            </div>
        </div>
        <div class="task-actions">${actions}</div>
    </div>`;
}

// ─── LOAD HISTORY ──────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch(`${API}/tasks`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    const container = el("history-list");
    if (data.tasks.length === 0) {
      container.innerHTML = emptyState("📜", "No task history yet.");
      return;
    }

    // Sort all tasks by date descending
    const sorted = [...data.tasks].sort(
      (a, b) => new Date(b.task_date) - new Date(a.task_date),
    );
    container.innerHTML = sorted.map((t) => taskItemHTML(t)).join("");
  } catch (err) {
    console.error("History error:", err);
  }
}

// ─── LOAD LEADERBOARD ──────────────────────────────────────────────────────
async function loadLeaderboard() {
  try {
    const res = await fetch(`${API}/leaderboard`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    const tbody = el("leaderboard-body");

    if (data.leaderboard.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--muted)">No users yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.leaderboard
      .map((user) => {
        const isMe = user.id === currentUser.userId;
        const rankClass = user.rank <= 3 ? `rank-${user.rank}` : "rank-n";
        const meClass = isMe ? "me-row" : "";

        return `
            <tr class="${meClass}">
                <td><span class="rank-badge ${rankClass}">${user.rank <= 3 ? ["🥇", "🥈", "🥉"][user.rank - 1] : user.rank}</span></td>
                <td>
                    <div style="font-weight:600">${escHtml(user.full_name)} ${isMe ? '<span style="color:var(--accent);font-size:0.75rem">(You)</span>' : ""}</div>
                    <div style="color:var(--muted);font-size:0.78rem">${escHtml(user.college_name)}</div>
                </td>
                <td><span class="streak-pill">🔥 ${user.current_streak} days</span></td>
                <td style="color:var(--muted);font-size:0.82rem">${user.last_completed_date ? formatDate(user.last_completed_date) : "Never"}</td>
            </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

// ─── REMINDERS ─────────────────────────────────────────────────────────────
async function checkReminders() {
  try {
    const res = await fetch(`${API}/tasks/today`, { credentials: "include" });
    const data = await res.json();

    if (data.success && data.hasPending) {
      const banner = el("reminder-banner");
      if (banner) {
        banner.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Reminder check error:", err);
  }
}

function dismissReminder() {
  const banner = el("reminder-banner");
  if (banner) banner.classList.add("hidden");
}

// ─── INNER TABS (Pending / Completed) ─────────────────────────────────────
function switchInnerTab(tabGroup, tab) {
  document
    .querySelectorAll(`[data-inner-group="${tabGroup}"]`)
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(`[data-inner-tab="${tabGroup}"]`)
    .forEach((s) => s.classList.remove("active"));

  document
    .querySelector(
      `[data-inner-group="${tabGroup}"][data-inner-value="${tab}"]`,
    )
    .classList.add("active");
  el(`${tabGroup}-${tab}`).classList.add("active");
}

// ─── COLLAPSE ADD TASK FORM ────────────────────────────────────────────────
function toggleAddTask() {
  const card = el("add-task-card");
  card.classList.toggle("collapsed");
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────
function el(id) {
  return document.getElementById(id);
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function emptyState(icon, msg) {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><p>${msg}</p></div>`;
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading
    ? "Please wait..."
    : btn.dataset.label || btn.textContent;
}

// ─── TOAST NOTIFICATIONS ───────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const container = el("toast-container");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Set default date to today when page loads
window.addEventListener("load", () => {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach((inp) => {
    if (!inp.value) inp.value = getTodayStr();
  });
});
