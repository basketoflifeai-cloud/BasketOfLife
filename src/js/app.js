// Basket of Life - Static Chat UI logic

/** DOM references */
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const threadEl = document.getElementById('thread');
const starterGridEl = document.getElementById('starterGrid');
const composerForm = document.getElementById('composer');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const scrollDownBtn = document.getElementById('scrollDown');

/** State */
let isTyping = false;
let hasStarted = false;
const messages = []; // {id, role, content, createdAt}
let typingTimeout = null;

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
  const el = document.createElement('div');
  el.className = 'avatar';
  el.textContent = role === 'user' ? 'U' : 'B';
  return el;
}

function createBubble(content) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = content;
  return bubble;
}

function addMessage({ role, content }) {
  const id = uid();
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  if (role === 'assistant') row.appendChild(createAvatar('assistant'));
  row.appendChild(createBubble(content));
  if (role === 'user') row.appendChild(createAvatar('user'));
  row.dataset.id = id;
  threadEl.appendChild(row);
  messages.push({ id, role, content, createdAt: now() });

  // Use a short timeout to ensure the DOM has updated before we scroll
  setTimeout(() => {
    scrollToBottom();
  }, 50);
}

function showTyping() {
  isTyping = true;
  sendBtn.classList.add('typing');
  sendBtn.setAttribute('aria-label', 'Stop generation');

  const row = document.createElement('div');
  row.className = 'msg assistant';
  row.dataset.typing = 'true';
  row.appendChild(createAvatar('assistant'));
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const wrap = document.createElement('div');
  wrap.className = 'typing';
  wrap.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  bubble.appendChild(wrap);
  row.appendChild(bubble);
  threadEl.appendChild(row);

  // Use a short timeout to ensure the DOM has updated before we scroll
  setTimeout(() => {
    scrollToBottom();
  }, 50);
}

function hideTyping() {
  isTyping = false;
  sendBtn.classList.remove('typing');
  sendBtn.setAttribute('aria-label', 'Send');

  const typingEl = threadEl.querySelector('[data-typing="true"]');
  if (typingEl) typingEl.remove();
}

function placeholderReply(forText) {
  const canned = `Here’s a helpful starting point for: <strong>${escapeHtml(forText)}</strong>.<br/><br/>This is a placeholder assistant reply. When connected to Activepieces, I’ll fetch a real response and stream it here with rich formatting.`;
  addMessage({ role: 'assistant', content: canned });
}

function escapeHtml(str) {
  return str.replace(/[&<>"]?/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

function send(text) {
  if (!text || !text.trim()) return;
  if (!hasStarted) revealPostStartUI();
  addMessage({ role: 'user', content: escapeHtml(text.trim()) });
  inputEl.value = '';
  autoResize();
  showTyping();
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    hideTyping();
    placeholderReply(text);
  }, 1600);
}

function revealPostStartUI() {
  hasStarted = true;
  starterGridEl.style.display = 'none';
}

// Starters click
starterGridEl?.addEventListener('click', (e) => {
  const target = e.target.closest('.starter-card');
  if (!target) return;
  const msg = target.getAttribute('data-message') || target.textContent;
  send(msg);
});

// Hero CTA button click
const heroCtaBtn = document.getElementById('heroCtaBtn');
heroCtaBtn?.addEventListener('click', () => {
  const msg = heroCtaBtn.getAttribute('data-message') || 'Hi, what can you do?';
  send(msg);
});

// Composer submit
composerForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (isTyping) {
    clearTimeout(typingTimeout);
    hideTyping();
    addMessage({ role: 'assistant', content: 'Generation stopped.' });
  } else {
    send(inputEl.value);
  }
});

// Enter to send, Shift+Enter for newline
inputEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send(inputEl.value);
  }
});

// Autosize textarea
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, window.innerHeight * 0.4) + 'px';
}
inputEl?.addEventListener('input', autoResize);
queueMicrotask(autoResize);

// Scroll to bottom logic (robust across browsers)
const rootScrollEl = document.scrollingElement || document.documentElement;

function atBottom() {
  const scrollPosition = rootScrollEl.scrollTop + window.innerHeight;
  const totalHeight = rootScrollEl.scrollHeight;
  return totalHeight - scrollPosition < 150; // threshold
}

function scrollToBottom() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    rootScrollEl.scrollTop = rootScrollEl.scrollHeight;
    updateScrollButton();
    return;
  }
  rootScrollEl.scrollTo({ top: rootScrollEl.scrollHeight, behavior: 'smooth' });
  // Update button state after scrolling animation likely finishes
  setTimeout(updateScrollButton, 400);
}

function updateScrollButton() {
  if (!scrollDownBtn) return;
  scrollDownBtn.hidden = atBottom();
}

// Initialize button state and listeners
updateScrollButton();
window.addEventListener('scroll', updateScrollButton, { passive: true });
window.addEventListener('resize', updateScrollButton, { passive: true });
scrollDownBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  scrollToBottom();
});

// Expose for integration with Activepieces later
window.BasketChat = { send };


