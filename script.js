const settingsButton = document.getElementById("settingsButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const settingsPanel = document.getElementById("settingsPanel");

const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const sendButton = document.getElementById("sendButton");

const aiName = document.getElementById("aiName");
const characterForm = document.getElementById("characterForm");
const characterName = document.getElementById("characterName");
const characterBirthday = document.getElementById("characterBirthday");
const characterRelationship = document.getElementById("characterRelationship");
const characterPersonality = document.getElementById("characterPersonality");
const characterSpeaking = document.getElementById("characterSpeaking");
const characterInterests = document.getElementById("characterInterests");
const characterBackstory = document.getElementById("characterBackstory");
const saveStatus = document.getElementById("saveStatus");

marked.setOptions({
  breaks: true,
});

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function openSettings() {
  settingsPanel.classList.add("open");
}

function closeSettings() {
  settingsPanel.classList.remove("open");
}

async function loadCharacter() {
  try {
    const response = await fetch("/api/character");

    const data = await response.json();

    const character = data.character;

    if (!character) return;

    aiName.textContent = character.name || "Mara";

    characterName.value = character.name || "";

    characterBirthday.value = character.birthday || "";

    characterRelationship.value = character.relationship || "";

    characterPersonality.value = character.personality_traits || "";

    characterSpeaking.value = character.speaking_style || "";

    characterInterests.value = character.interests || "";

    characterBackstory.value = character.notes_and_backstory || "";
  } catch (error) {
    console.error(error);
  }
}

characterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  saveStatus.textContent = "Saving...";

  try {
    const response = await fetch("/api/character", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: characterName.value,
        birthday: characterBirthday.value || null,
        relationship: characterRelationship.value,
        personality_traits: characterPersonality.value,
        speaking_style: characterSpeaking.value,
        interests: characterInterests.value,
        notes_and_backstory: characterBackstory.value,
      }),
    });

    if (!response.ok) {
      throw new Error();
    }

    aiName.textContent = characterName.value || "Mara";

    saveStatus.textContent = "Character saved successfully.";
  } catch (error) {
    console.error(error);

    saveStatus.textContent = "Failed to save character.";
  }
});

function addMessage(text, sender) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = marked.parse(text);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = sender === "user" ? "You • just now" : "Aster • just now";

  bubble.appendChild(meta);
  row.appendChild(bubble);
  messages.appendChild(row);

  scrollToBottom();

  return row;
}

async function loadHistory() {
  try {
    const response = await fetch("/api/history");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load history");
    }

    messages.innerHTML = "";

    data.messages.forEach((msg) => {
      addMessage(msg.content, msg.role === "assistant" ? "ai" : "user");
    });
  } catch (error) {
    console.error(error);
  }
}

messageInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

messageInput.addEventListener("input", () => {
  sendButton.disabled = !messageInput.value.trim();

  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

function createTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row ai";
  row.id = "typing-indicator";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.textContent = "Aster is typing...";

  row.appendChild(bubble);
  messages.appendChild(row);

  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");

  if (indicator) {
    indicator.remove();
  }
}

settingsButton.addEventListener("click", openSettings);

closeSettingsButton.addEventListener("click", closeSettings);

settingsPanel.addEventListener("click", (event) => {
  if (event.target === settingsPanel) {
    closeSettings();
  }
});

composer.addEventListener("submit", async (event) => {
  event.preventDefault();

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
      }),
    });

    const data = await response.json();

    removeTypingIndicator();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    addMessage(data.reply, "ai");
  } catch (error) {
    console.error(error);

    removeTypingIndicator();

    addMessage("Something went wrong while contacting the AI.", "ai");
  }

  sendButton.disabled = false;
  messageInput.focus();
});

messageInput.addEventListener("input", () => {
  sendButton.disabled = !messageInput.value.trim();
});

sendButton.disabled = true;

loadHistory();
scrollToBottom();
loadCharacter();
