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
}

function closeSettings() {
  settingsPanel.classList.remove('open');
}

function addMessage(text, sender) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent =
    sender === 'user'
      ? 'You • just now'
      : 'Aster • just now';

  bubble.appendChild(meta);
  row.appendChild(bubble);
  messages.appendChild(row);

  scrollToBottom();

  return row;
}

function createTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row ai';
  row.id = 'typing-indicator';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  bubble.textContent = 'Aster is typing...';

  row.appendChild(bubble);
  messages.appendChild(row);

  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');

  if (indicator) {
    indicator.remove();
  }
}

settingsButton.addEventListener('click', openSettings);

closeSettingsButton.addEventListener('click', closeSettings);

settingsPanel.addEventListener('click', (event) => {
  if (event.target === settingsPanel) {
    closeSettings();
  }
});

composer.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text) return;

  addMessage(text, 'user');

  messageInput.value = '';
  sendButton.disabled = true;

  createTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text
      })
    });

    const data = await response.json();

    removeTypingIndicator();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    addMessage(data.reply, 'ai');

  } catch (error) {
    console.error(error);

    removeTypingIndicator();

    addMessage(
      'Something went wrong while contacting the AI.',
      'ai'
    );
  }

  sendButton.disabled = false;
  messageInput.focus();
});

messageInput.addEventListener('input', () => {
  sendButton.disabled = !messageInput.value.trim();
});

sendButton.disabled = true;

scrollToBottom();