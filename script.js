const settingsButton = document.getElementById('settingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const composer = document.getElementById('composer');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const chatArea = document.getElementById('chatArea');
const sendButton = document.getElementById('sendButton');
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}
function openSettings() {
  settingsPanel.classList.add('open');
  settingsPanel.setAttribute('aria-hidden', 'false');
  settingsButton.setAttribute('aria-expanded', 'true');
}
function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsPanel.setAttribute('aria-hidden', 'true');
  settingsButton.setAttribute('aria-expanded', 'false');
}
function addMessage(text, sender) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = sender === 'user'
    ? 'Just now'
    : 'Just now';
  bubble.appendChild(meta);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollToBottom();
}
settingsButton.addEventListener('click', openSettings);
closeSettingsButton.addEventListener('click', closeSettings);
settingsPanel.addEventListener('click', (event) => {
  if (event.target === settingsPanel) {
    closeSettings();
  }
});
composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  messageInput.value = '';
  sendButton.disabled = true;
  messageInput.focus();
});
messageInput.addEventListener('input', () => {
  sendButton.disabled = !messageInput.value.trim();
});
sendButton.disabled = true;
scrollToBottom();