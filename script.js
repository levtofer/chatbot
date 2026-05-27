const sidebar = document.getElementById("sidebar");
const sidebarList = document.getElementById("sidebarList");
const newCharacterButton = document.getElementById("newCharacterButton");
const backButton = document.getElementById("backButton");

const shell = document.getElementById("shell");
const topbarAvatar = document.getElementById("topbarAvatar");
const aiName = document.getElementById("aiName");
const userAvatarButton = document.getElementById("userAvatarButton");

const chatArea = document.getElementById("chatArea");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const profileButton = document.getElementById("profileButton");
const profilePanel = document.getElementById("profilePanel");
const closeProfileButton = document.getElementById("closeProfileButton");
const userForm = document.getElementById("userForm");
const userDisplayName = document.getElementById("userDisplayName");
const userAvatar = document.getElementById("userAvatar");
const userAvatarPreview = document.getElementById("userAvatarPreview");
const userAbout = document.getElementById("userAbout");
const userTimezone = document.getElementById("userTimezone");
const userSaveStatus = document.getElementById("userSaveStatus");

const characterPanel = document.getElementById("characterPanel");
const characterPanelTitle = document.getElementById("characterPanelTitle");
const closeCharacterButton = document.getElementById("closeCharacterButton");
const characterForm = document.getElementById("characterForm");
const characterId = document.getElementById("characterId");
const characterAvatar = document.getElementById("characterAvatar");
const avatarPreview = document.getElementById("avatarPreview");
const characterName = document.getElementById("characterName");
const characterBirthday = document.getElementById("characterBirthday");
const characterRelationship = document.getElementById("characterRelationship");
const characterPersonality = document.getElementById("characterPersonality");
const characterSpeaking = document.getElementById("characterSpeaking");
const characterInterests = document.getElementById("characterInterests");
const characterBackstory = document.getElementById("characterBackstory");
const saveStatus = document.getElementById("saveStatus");

// ── STATE ─────────────────────────────────────────────
let currentCharacterId = null;
let currentCharacterName = "Mara";
let currentCharacterAvatar = null;
let isMobile = window.innerWidth <= 768;

marked.setOptions({ breaks: true });

// ── HELPERS ───────────────────────────────────────────
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function truncate(text, max = 20) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

function renderAvatar(el, src, fallbackLetter) {
  if (src) {
    el.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    el.textContent = (fallbackLetter || "?").charAt(0).toUpperCase();
  }
}

// ── MOBILE SIDEBAR ────────────────────────────────────
function showSidebar() {
  sidebar.classList.remove("hidden");
  shell.style.display = "";
}

function showChat() {
  if (isMobile) {
    sidebar.classList.add("hidden");
  }
}

backButton.addEventListener("click", () => {
  showSidebar();
  currentCharacterId = null;
  messages.innerHTML = "";
  aiName.textContent = "Select a chat";
  topbarAvatar.textContent = "?";
});

window.addEventListener("resize", () => {
  isMobile = window.innerWidth <= 768;
  if (!isMobile) sidebar.classList.remove("hidden");
});

// ── PANELS ────────────────────────────────────────────
function openPanel(panel) {
  panel.classList.add("open");
}

function closePanel(panel) {
  panel.classList.remove("open");
}

profileButton.addEventListener("click", () => openPanel(profilePanel));
closeProfileButton.addEventListener("click", () => closePanel(profilePanel));
profilePanel.addEventListener("click", (e) => {
  if (e.target === profilePanel) closePanel(profilePanel);
});

newCharacterButton.addEventListener("click", () => {
  characterPanelTitle.textContent = "New Character";
  characterForm.reset();
  characterId.value = "";
  avatarPreview.style.display = "none";
  saveStatus.textContent = "";
  openPanel(characterPanel);
});

closeCharacterButton.addEventListener("click", () =>
  closePanel(characterPanel),
);
characterPanel.addEventListener("click", (e) => {
  if (e.target === characterPanel) closePanel(characterPanel);
});

// ── SIDEBAR LIST ──────────────────────────────────────
async function loadSidebar() {
  try {
    const response = await fetch("/api/character?all=true");
    const data = await response.json();
    const characters = data.characters || [];

    sidebarList.innerHTML = "";

    characters.forEach((char) => {
      const row = document.createElement("div");
      row.className =
        "sidebar-row" + (char.id === currentCharacterId ? " active" : "");
      row.dataset.id = char.id;

      const avatarEl = document.createElement("div");
      avatarEl.className = "avatar-circle bubble";
      renderAvatar(avatarEl, char.avatar_url, char.name);

      const info = document.createElement("div");
      info.className = "sidebar-row-info";

      const name = document.createElement("div");
      name.className = "sidebar-row-name";
      name.textContent = char.name || "Unnamed";

      const preview = document.createElement("div");
      preview.className = "sidebar-row-preview";
      preview.textContent = truncate(
        char.last_message || char.relationship || "",
      );

      info.appendChild(name);
      info.appendChild(preview);
      row.appendChild(avatarEl);
      row.appendChild(info);

      row.addEventListener("click", () => selectCharacter(char));
      sidebarList.appendChild(row);
    });
  } catch (error) {
    console.error("Sidebar load error:", error);
  }
}

// ── SELECT CHARACTER ──────────────────────────────────
async function selectCharacter(char) {
  currentCharacterId = char.id;
  currentCharacterName = char.name || "Mara";
  currentCharacterAvatar = char.avatar_url || null;

  // update topbar
  aiName.textContent = currentCharacterName;
  renderAvatar(topbarAvatar, currentCharacterAvatar, currentCharacterName);

  // highlight sidebar row
  document.querySelectorAll(".sidebar-row").forEach((r) => {
    r.classList.toggle("active", r.dataset.id === char.id);
  });

  // clear and load chat history
  messages.innerHTML = "";
  await loadHistory(char.id);

  showChat();
}

// ── MESSAGES ──────────────────────────────────────────
function addMessage(text, sender) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  if (sender === "ai") {
    const avatarEl = document.createElement("div");
    avatarEl.className = "avatar-circle bubble";
    renderAvatar(avatarEl, currentCharacterAvatar, currentCharacterName);
    row.appendChild(avatarEl);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = marked.parse(text);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent =
    sender === "user" ? "You • just now" : `${currentCharacterName} • just now`;
  bubble.appendChild(meta);

  row.appendChild(bubble);
  messages.appendChild(row);
  scrollToBottom();

  return row;
}

function createTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row ai";
  row.id = "typing-indicator";

  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar-circle bubble";
  renderAvatar(avatarEl, currentCharacterAvatar, currentCharacterName);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = `${currentCharacterName} is typing...`;

  row.appendChild(avatarEl);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById("typing-indicator")?.remove();
}

// ── LOAD HISTORY ──────────────────────────────────────
async function loadHistory(charId) {
  if (!charId) return;
  try {
    const response = await fetch(`/api/history?character_id=${charId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    (data.messages || []).forEach((msg) => {
      addMessage(msg.content, msg.role === "assistant" ? "ai" : "user");
    });
  } catch (error) {
    console.error("History load error:", error);
  }
}

// ── USER PROFILE ──────────────────────────────────────
async function loadUserProfile() {
  try {
    const response = await fetch("/api/user");
    const data = await response.json();
    const user = data.user;
    if (!user) return;

    userDisplayName.value = user.display_name || "";
    userAbout.value = user.about || "";
    userTimezone.value = user.timezone || "Asia/Jakarta";

    const FALLBACK_URL = `${location.origin}/api/avatar-fallback`;
    const avatarSrc = user.avatar_url || null;
    renderAvatar(userAvatarButton, avatarSrc, "?");

    if (avatarSrc) {
      userAvatarPreview.src = avatarSrc;
      userAvatarPreview.style.display = "block";
    }
  } catch (error) {
    console.error("User profile load error:", error);
  }
}

userAvatar.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  userAvatarPreview.src = URL.createObjectURL(file);
  userAvatarPreview.style.display = "block";
});

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  userSaveStatus.textContent = "Saving...";

  try {
    let avatarUrl = null;

    const avatarFile = userAvatar.files[0];
    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      formData.append("characterName", "user");
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      avatarUrl = uploadData.avatarUrl || null;
    }

    const body = {
      display_name: userDisplayName.value,
      about: userAbout.value,
      timezone: userTimezone.value || "Asia/Jakarta",
    };
    if (avatarUrl) body.avatar_url = avatarUrl;

    const response = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error();

    if (avatarUrl) renderAvatar(userAvatarButton, avatarUrl, "?");
    userSaveStatus.textContent = "Profile saved.";
    setTimeout(() => closePanel(profilePanel), 800);
  } catch (error) {
    console.error(error);
    userSaveStatus.textContent = "Failed to save.";
  }
});

// ── CHARACTER FORM ────────────────────────────────────
characterAvatar.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  avatarPreview.src = URL.createObjectURL(file);
  avatarPreview.style.display = "block";
});

characterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveStatus.textContent = "Saving...";

  try {
    let avatarUrl = null;
    const avatarFile = characterAvatar.files[0];
    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      formData.append("characterName", characterName.value || "character");

      if (characterId.value) {
        formData.append("characterId", characterId.value);
      }
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      avatarUrl = uploadData.avatarUrl || null;
    }

    const body = {
      id: characterId.value || undefined,
      name: characterName.value,
      birthday: characterBirthday.value || null,
      relationship: characterRelationship.value,
      personality_traits: characterPersonality.value,
      speaking_style: characterSpeaking.value,
      interests: characterInterests.value,
      notes_and_backstory: characterBackstory.value,
    };
    if (avatarUrl) body.avatar_url = avatarUrl;

    const response = await fetch("/api/character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error();

    saveStatus.textContent = "Saved!";
    await loadSidebar();
    setTimeout(() => closePanel(characterPanel), 800);
  } catch (error) {
    console.error(error);
    saveStatus.textContent = "Failed to save.";
  }
});

// ── SEND MESSAGE ──────────────────────────────────────
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

messageInput.addEventListener("input", () => {
  sendButton.disabled = !messageInput.value.trim() || !currentCharacterId;
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentCharacterId) return;

  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  messageInput.value = "";
  messageInput.style.height = "auto";
  sendButton.disabled = true;
  createTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, character_id: currentCharacterId }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) throw new Error(data.error || "Request failed");

    addMessage(data.reply, "ai");
    await loadSidebar(); // refresh last message preview
  } catch (error) {
    console.error(error);
    removeTypingIndicator();
    addMessage("Something went wrong while contacting the AI.", "ai");
  }

  sendButton.disabled = false;
  messageInput.focus();
});

// ── AUTO GROW TEXTAREAS ───────────────────────────────
document.querySelectorAll(".form-group textarea").forEach((ta) => {
  ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  });
});

// ── INIT ──────────────────────────────────────────────
sendButton.disabled = true;

if (isMobile) sidebar.classList.remove("hidden");

loadSidebar();
loadUserProfile();
