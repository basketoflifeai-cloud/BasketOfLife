// Basket of Life - Static Chat UI logic

/** DOM references */
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const threadEl = document.getElementById('thread');
const starterGridEl = document.getElementById('starterGrid');
const composerForm = document.getElementById('composer');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

/** State */
let isTyping = false;
let hasStarted = false;
const messages = []; // {id, role, content, createdAt}
let currentAbortController = null;

/** Utilities */
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

function saveTheme(theme) {
  try { localStorage.setItem('bol-theme', theme); } catch (_) {}
}
function loadTheme() {
  try { return localStorage.getItem('bol-theme'); } catch (_) { return null; }
}
function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  themeToggle?.setAttribute('aria-pressed', String(theme === 'dark'));
}

// Theme init
const stored = loadTheme();
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(stored ?? (prefersDark ? 'dark' : 'light'));

themeToggle?.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
});

function createAvatar(role) {
  if (role === 'assistant') {
    const el = document.createElement('img');
    el.className = 'avatar strawberry-avatar';
    el.src = 'strawberry.png';
    el.alt = 'Assistant';
    return el;
  }
  // No avatar for user
  return null;
}

function createBubble(content) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = content;
  return bubble;
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function addMessage({ role, content }) {
  const id = uid();
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  
  // Add avatar only for assistant (strawberry), no avatar for user
  if (role === 'assistant') {
    const avatar = createAvatar('assistant');
    if (avatar) row.appendChild(avatar);
  }
  
  row.appendChild(createBubble(content));
  row.dataset.id = id;
  threadEl.appendChild(row);
  messages.push({ id, role, content, createdAt: now() });
  scrollToBottom();
}

function showTyping() {
  isTyping = true;
  sendBtn.classList.add('typing');
  sendBtn.setAttribute('aria-label', 'Stop generation');

  const row = document.createElement('div');
  row.className = 'msg assistant';
  row.dataset.typing = 'true';
  
  // Add avatar for assistant typing
  const avatar = createAvatar('assistant');
  if (avatar) row.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const wrap = document.createElement('div');
  wrap.className = 'typing';
  wrap.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  bubble.appendChild(wrap);
  row.appendChild(bubble);
  threadEl.appendChild(row);
  scrollToBottom();
}

function hideTyping() {
  isTyping = false;
  sendBtn.classList.remove('typing');
  sendBtn.setAttribute('aria-label', 'Send');

  const typingEl = threadEl.querySelector('[data-typing="true"]');
  if (typingEl) typingEl.remove();
}

async function sendToWebhook(userMessage, abortController) {
  const webhookUrl = 'https://hook.eu2.make.com/8ydjx0yjpi6r8npacsvweup1vsfnqef6';
  
  // Prepare conversation context - include all previous messages plus the new user message
  const conversationContext = [...messages, { role: 'user', content: userMessage }];
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversation: conversationContext,
        timestamp: now()
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the AI response from the webhook response
    // Adjust this based on how your Activepieces flow returns the data
    const aiResponse = data.response || data.message || data.content || 'I received your message but couldn\'t process it properly.';
    
    return aiResponse;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return 'Request was cancelled.';
    }
    console.error('Webhook error:', error);
    return `Sorry, I'm having trouble connecting right now. Please try again in a moment. (Error: ${error.message})`;
  }
}

function formatMarkdown(text) {
  // Convert markdown formatting to HTML
  return text
    // Bold text: **text** or __text__ -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic text: *text* or _text_ -> <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Line breaks: \n -> <br>
    .replace(/\n/g, '<br>')
    // Code blocks: `code` -> <code>code</code>
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

function escapeHtml(str) {
  return str.replace(/[&<>"]?/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

async function send(text) {
  if (!text || !text.trim()) return;
  if (!hasStarted) revealPostStartUI();
  
  const trimmedText = text.trim();
  addMessage({ role: 'user', content: escapeHtml(trimmedText) });
  inputEl.value = '';
  autoResize();
  showTyping();
  
  // Create new abort controller for this request
  currentAbortController = new AbortController();
  
  try {
    // Send to webhook and wait for response
    const aiResponse = await sendToWebhook(trimmedText, currentAbortController);
    hideTyping();
    // Format markdown in AI response before displaying
    const formattedResponse = formatMarkdown(aiResponse);
    addMessage({ role: 'assistant', content: formattedResponse });
  } catch (error) {
    hideTyping();
    addMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
    console.error('Send error:', error);
  } finally {
    currentAbortController = null;
  }
}

function revealPostStartUI() {
  hasStarted = true;
  starterGridEl.style.display = 'none';
}

// Starters click
starterGridEl?.addEventListener('click', async (e) => {
  const target = e.target.closest('.starter-card');
  if (!target) return;
  const msg = target.getAttribute('data-message') || target.textContent;
  await send(msg);
});

// Hero CTA button click
const heroCtaBtn = document.getElementById('heroCtaBtn');
heroCtaBtn?.addEventListener('click', async () => {
  const msg = heroCtaBtn.getAttribute('data-message') || 'Hi, what can you do?';
  await send(msg);
});

// Composer submit
composerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isTyping) {
    // Cancel the current request
    if (currentAbortController) {
      currentAbortController.abort();
      hideTyping();
      addMessage({ role: 'assistant', content: 'Request cancelled.' });
    }
    return;
  } else {
    await send(inputEl.value);
  }
});

// Enter to send, Shift+Enter for newline
inputEl?.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isTyping) {
      await send(inputEl.value);
    }
  }
});

// Autosize textarea
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, window.innerHeight * 0.4) + 'px';
}
inputEl?.addEventListener('input', autoResize);
queueMicrotask(autoResize);


// Expose for integration with Activepieces later
window.BasketChat = { send };


