// app.js — updated: persistent session + robust token handling

let token = null;
let user = null;
let editingNoteId = null;
const apiBase = window.location.hostname.includes("localhost")
  ? "http://localhost:5000/api"
  : "https://notehub-4si4.onrender.com/api";

/* -------------------
   UI show/hide helper
   ------------------- */
function show(section) {
  document.getElementById("auth-section").style.display =
    section === "auth" ? "block" : "none";
  document.getElementById("notes-section").style.display =
    section === "notes" ? "block" : "none";
  document.getElementById("user-profile").style.display =
    section === "notes" ? "flex" : "none";

  // Hide/show theme toggle depending on section (if it exists)
  const themeToggleContainer = document.getElementById(
    "theme-toggle-container"
  );
  if (themeToggleContainer) {
    themeToggleContainer.style.display = section === "notes" ? "block" : "none";
  }
}

/* -------------------
   Authentication
   ------------------- */
function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  fetch(apiBase + "/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.token) {
        token = data.token;
        // store token & user for session persistence
        localStorage.setItem("token", token);
        // some backends return user info separately; try to pick it
        user = data.user || data;
        localStorage.setItem("user", JSON.stringify(user));
        showProfile();
        show("notes");
        fetchNotes();
      } else {
        alert(data.message || "Login failed");
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      alert("Login failed (network error)");
    });
}

function register() {
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  fetch(apiBase + "/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.token) {
        token = data.token;
        localStorage.setItem("token", token);
        user = data.user || data;
        localStorage.setItem("user", JSON.stringify(user));
        showProfile();
        show("notes");
        fetchNotes();
      } else {
        alert(data.message || "Registration failed");
      }
    })
    .catch((err) => {
      console.error("Register error:", err);
      alert("Registration failed (network error)");
    });
}

function logout() {
  token = null;
  user = null;
  editingNoteId = null;
  resetNoteForm();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  show("auth");
}

/* -------------------
   Profile
   ------------------- */
function showProfile() {
  if (!user) return;
  const letterEl = document.getElementById("profile-letter");
  const nameEl = document.getElementById("profile-name");
  if (letterEl) letterEl.innerText = (user.name || "?")[0].toUpperCase();
  if (nameEl) nameEl.innerText = user.name || "";
}

/* -------------------
   Notes CRUD
   ------------------- */
function fetchNotes() {
  fetch(apiBase + "/notes", {
    headers: { Authorization: "Bearer " + token },
  })
    .then(async (res) => {
      // if unauthorized, clear session and show login
      if (res.status === 401 || res.status === 403) {
        console.warn("Token invalid or expired, logging out.");
        logout();
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to fetch notes");
      }
      return res.json();
    })
    .then((notes) => {
      if (Array.isArray(notes)) renderNotes(notes);
    })
    .catch((err) => {
      console.error("Fetch notes error:", err);
      // If user is currently on notes view, fallback to auth
      if (document.getElementById("notes-section").style.display === "block") {
        alert("Failed to fetch notes. Please login again.");
        logout();
      }
    });
}

function renderNotes(notes) {
  const notesList = document.getElementById("notes-list");
  if (!notesList) return;
  notesList.innerHTML = "";
  notes.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-card";

    // If a click originates from a button (or inside one), don't open popup
    div.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("button")) return;
      showNotePopup(note);
    });

    div.innerHTML = `
      <strong>${escapeHtml(note.title)}</strong><br>
      <span>${
        note.content && note.content.length > 65
          ? escapeHtml(note.content.slice(0, 65)) + "..."
          : escapeHtml(note.content)
      }</span>
      <div class="note-actions">
        <button onclick="editNote(event, '${note._id}', '${escapeJsString(
      note.title
    )}', '${escapeJsString(note.content)}')">Edit</button>
        <button onclick="deleteNote(event, '${note._id}')">Delete</button>
        <button onclick="downloadNote(event, '${escapeJsString(
          note.title
        )}', '${escapeJsString(note.content)}')">Download</button>
      </div>`;

    notesList.appendChild(div);
  });
}

/* -------------------
   Helpers for safe insertion
   ------------------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsString(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/* -------------------
   Popup
   ------------------- */
function showNotePopup(note) {
  const titleEl = document.getElementById("popup-title");
  const contentEl = document.getElementById("popup-content");
  const bg = document.getElementById("popup-bg");
  if (titleEl) titleEl.innerText = note.title || "";
  if (contentEl) contentEl.innerText = note.content || "";
  if (bg) bg.style.display = "flex";
}

function closePopup() {
  const bg = document.getElementById("popup-bg");
  if (bg) bg.style.display = "none";
}

/* -------------------
   Note operations
   ------------------- */
function deleteNote(event, id) {
  event.stopPropagation();
  fetch(apiBase + "/notes/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  })
    .then(async (res) => {
      if (res.status === 401 || res.status === 403) {
        logout(); // token invalid
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Delete failed");
      }
      return res.json();
    })
    .then(() => fetchNotes())
    .catch((err) => {
      console.error("Delete note error:", err);
      alert("Failed to delete note");
    });
}

function downloadNote(event, title, content) {
  event.stopPropagation();
  const blob = new Blob([content || ""], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const safeName = (title || "note").replace(/[\/\\?%*:|"<>]/g, "-");
  link.download = `${safeName}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function editNote(event, id, title, content) {
  if (event && event.stopPropagation) event.stopPropagation();

  editingNoteId = id;
  const titleInput = document.getElementById("note-title");
  const contentInput = document.getElementById("note-content");
  if (titleInput) titleInput.value = title || "";
  if (contentInput) contentInput.value = content || "";
  const cancelBtn = document.getElementById("cancel-edit");
  if (cancelBtn) cancelBtn.style.display = "inline";

  // focus the title input
  if (titleInput) {
    titleInput.focus();
    const len = titleInput.value.length;
    titleInput.setSelectionRange(len, len);
  }

  show("notes");
}

function saveNote() {
  const title = document.getElementById("note-title").value;
  const content = document.getElementById("note-content").value;

  if (editingNoteId) {
    fetch(apiBase + "/notes/" + editingNoteId, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ title, content }),
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Update failed");
        }
        return res.json();
      })
      .then(() => {
        editingNoteId = null;
        resetNoteForm();
        fetchNotes();
      })
      .catch((err) => {
        console.error("Update note error:", err);
        alert("Failed to update note");
      });
  } else {
    fetch(apiBase + "/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ title, content }),
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Create failed");
        }
        return res.json();
      })
      .then(() => {
        resetNoteForm();
        fetchNotes();
      })
      .catch((err) => {
        console.error("Create note error:", err);
        alert("Failed to create note");
      });
  }
}

function resetNoteForm() {
  const titleInput = document.getElementById("note-title");
  const contentInput = document.getElementById("note-content");
  if (titleInput) titleInput.value = "";
  if (contentInput) contentInput.value = "";
  editingNoteId = null;
  const cancelBtn = document.getElementById("cancel-edit");
  if (cancelBtn) cancelBtn.style.display = "none";
}

/* expose handlers required by inline onclicks */
window.closePopup = closePopup;
window.deleteNote = deleteNote;
window.editNote = editNote;
