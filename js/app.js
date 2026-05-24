// ── storage ──────────────────────────────────────────────
const STORAGE_KEY_TOPICS = "learningProgressTopics";
const STORAGE_KEY_PREFERENCES = "learningProgressPrefs";

function loadTopics() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOPICS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveTopics(topics) {
  try { localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(topics)); } catch {}
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

function savePreferences(prefs) {
  try { localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(prefs)); } catch {}
}

// ── progress ─────────────────────────────────────────────
function calculateProgress(topics) {
  const total = topics.length;
  const completed = topics.filter((t) => t.status === "Completed").length;
  const inProgress = topics.filter((t) => t.status === "In Progress").length;
  const pending = total - completed - inProgress;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, pending, percent };
}

function updateProgressUI(metrics) {
  const totalEl = document.getElementById("totalTopics");
  const completedEl = document.getElementById("completedTopics");
  const inProgressEl = document.getElementById("inProgressTopics");
  const pendingEl = document.getElementById("pendingTopics");
  const progressBar = document.getElementById("progressBar");
  const percentText = document.getElementById("progressPercentText");

  if (!totalEl) return;

  totalEl.textContent = metrics.total;
  completedEl.textContent = metrics.completed;
  inProgressEl.textContent = metrics.inProgress;
  pendingEl.textContent = metrics.pending;
  percentText.textContent = `${metrics.percent}%`;

  if (progressBar) {
    progressBar.classList.toggle("progress-bar-inner--active", metrics.percent > 0);
    progressBar.style.transition = "width 0.5s ease-out";
    requestAnimationFrame(() => {
      progressBar.style.width = `${metrics.percent}%`;
    });
  }
}

// ── ui ───────────────────────────────────────────────────
let topics = [];
let activeFilter = "All";
let searchQuery = "";

function generateId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function initUI(initialTopics) {
  topics = [...initialTopics];

  const prefs = loadPreferences();
  const allowed = new Set(["light", "dark", "aurora", "sunset"]);
  const themeCandidate = typeof prefs.theme === "string" ? prefs.theme : "light";
  const theme = allowed.has(themeCandidate) ? themeCandidate : "light";
  applyTheme(theme);

  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.value = theme;
    themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));
  }

  const form = document.getElementById("topicForm");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  form?.addEventListener("submit", (e) => { e.preventDefault(); handleSubmitForm(); });
  cancelEditBtn?.addEventListener("click", () => resetForm());

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter || "All";
      render();
    });
  });

  const searchInput = document.getElementById("searchInput");
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  render();
}

const themeColors = {
  light:  "#f5f7fb",
  dark:   "#020617",
  aurora: "#02151a",
  sunset: "#1b0b22",
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const root = document.querySelector(".app");
  if (root) root.dataset.theme = theme;
  const meta = document.getElementById("themeColorMeta");
  if (meta) meta.setAttribute("content", themeColors[theme] || themeColors.light);
  const prefs = loadPreferences();
  savePreferences({ ...prefs, theme });
}

function handleSubmitForm() {
  const idInput = document.getElementById("topicId");
  const nameInput = document.getElementById("topicName");
  const categorySelect = document.getElementById("category");
  const difficultySelect = document.getElementById("difficulty");
  const deadlineInput = document.getElementById("deadline");
  const statusSelect = document.getElementById("status");

  if (!nameInput.value.trim() || !categorySelect.value || !difficultySelect.value) return;

  const payload = {
    id: idInput.value || generateId(),
    topicName: nameInput.value.trim(),
    category: categorySelect.value,
    difficulty: difficultySelect.value,
    deadline: deadlineInput.value || "",
    status: statusSelect.value,
  };

  const existingIndex = topics.findIndex((t) => t.id === payload.id);
  const wasNotCompleted = existingIndex >= 0 ? topics[existingIndex].status !== "Completed" : false;

  if (existingIndex >= 0) {
    topics.splice(existingIndex, 1, payload);
  } else {
    topics.push(payload);
  }

  saveTopics(topics);
  render();

  if (payload.status === "Completed" && (existingIndex === -1 || wasNotCompleted)) {
    triggerConfetti();
  }

  resetForm();
}

function resetForm() {
  const form = document.getElementById("topicForm");
  const idInput = document.getElementById("topicId");
  const formTitle = document.getElementById("formTitle");
  const submitLabel = document.getElementById("submitLabel");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  form?.reset();
  if (idInput) idInput.value = "";
  if (formTitle) formTitle.textContent = "Add Topic";
  if (submitLabel) submitLabel.textContent = "Add Topic";
  if (cancelEditBtn) cancelEditBtn.hidden = true;
}

function editTopic(id) {
  const topic = topics.find((t) => t.id === id);
  if (!topic) return;

  const idInput = document.getElementById("topicId");
  const nameInput = document.getElementById("topicName");
  const categorySelect = document.getElementById("category");
  const difficultySelect = document.getElementById("difficulty");
  const deadlineInput = document.getElementById("deadline");
  const statusSelect = document.getElementById("status");
  const formTitle = document.getElementById("formTitle");
  const submitLabel = document.getElementById("submitLabel");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (!nameInput || !categorySelect || !difficultySelect || !statusSelect) return;

  idInput.value = topic.id;
  nameInput.value = topic.topicName;
  categorySelect.value = topic.category;
  difficultySelect.value = topic.difficulty;
  deadlineInput.value = topic.deadline || "";
  statusSelect.value = topic.status;

  if (formTitle) formTitle.textContent = "Edit Topic";
  if (submitLabel) submitLabel.textContent = "Save Changes";
  if (cancelEditBtn) cancelEditBtn.hidden = false;

  nameInput.focus();
}

function deleteTopic(id) {
  topics = topics.filter((t) => t.id !== id);
  saveTopics(topics);
  render();
}

function updateStatus(id, status) {
  const index = topics.findIndex((t) => t.id === id);
  if (index === -1) return;
  const wasNotCompleted = topics[index].status !== "Completed";
  topics[index] = { ...topics[index], status };
  saveTopics(topics);
  render();
  if (status === "Completed" && wasNotCompleted) triggerConfetti();
}

function render() {
  const tbody = document.getElementById("topicsTbody");
  const emptyState = document.getElementById("emptyState");
  if (!tbody) return;

  const filtered = topics.filter((t) => {
    if (activeFilter !== "All" && t.category !== activeFilter) return false;
    if (searchQuery && !t.topicName.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  tbody.innerHTML = "";

  filtered.forEach((topic) => {
    const tr = document.createElement("tr");
    const deadlineClass = deadlineHighlightClass(topic.deadline, topic.status);
    const statusClass = statusRowClass(topic.status);
    if (statusClass) tr.classList.add(statusClass);
    if (deadlineClass) tr.classList.add(deadlineClass);

    tr.innerHTML = `
      <td>${escapeHtml(topic.topicName)}</td>
      <td>${escapeHtml(topic.category)}</td>
      <td>${escapeHtml(topic.difficulty)}</td>
      <td>${formatDeadline(topic.deadline)}</td>
      <td>
        <select class="status-select">
          <option value="Not Started"${topic.status === "Not Started" ? " selected" : ""}>Not Started</option>
          <option value="In Progress"${topic.status === "In Progress" ? " selected" : ""}>In Progress</option>
          <option value="Completed"${topic.status === "Completed" ? " selected" : ""}>Completed</option>
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button class="row-action-btn" data-action="edit">
            <i class="fa-regular fa-pen-to-square"></i><span>Edit</span>
          </button>
          <button class="row-action-btn row-action-btn--danger" data-action="delete">
            <i class="fa-regular fa-trash-can"></i><span>Delete</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);

    tr.querySelector(".status-select").addEventListener("change", (e) =>
      updateStatus(topic.id, e.target.value)
    );
    tr.querySelector('[data-action="edit"]').addEventListener("click", () => editTopic(topic.id));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTopic(topic.id));
  });

  if (emptyState) emptyState.style.display = filtered.length === 0 ? "block" : "none";

  updateProgressUI(calculateProgress(topics));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDeadline(deadline) {
  if (!deadline) return "–";
  try {
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return "–";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "–"; }
}

function deadlineHighlightClass(deadline, status) {
  if (!deadline || status === "Completed") return "";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "";
  const diffDays = (d - new Date()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "deadline-past";
  if (diffDays <= 2) return "deadline-soon";
  return "";
}

function statusRowClass(status) {
  if (status === "Not Started") return "status-row--not-started";
  if (status === "In Progress") return "status-row--in-progress";
  if (status === "Completed") return "status-row--completed";
  return "";
}

function triggerConfetti() {
  const container = document.getElementById("confettiContainer");
  if (!container) return;
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = ["#f97316","#22c55e","#3b82f6","#eab308","#ec4899"][Math.floor(Math.random() * 5)];
    piece.style.setProperty("--confetti-x", `${(Math.random() - 0.5) * 320}px`);
    container.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

// ── init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initUI(loadTopics());
});
