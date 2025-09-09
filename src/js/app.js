// Basket of Life - Static Chat UI logic

/** DOM references */
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const userTypeToggle = document.getElementById('userTypeToggle');
const threadEl = document.getElementById('thread');
const starterGridEl = document.getElementById('starterGrid');
const composerForm = document.getElementById('composer');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

/** State */
let isTyping = false;
let hasStarted = false;
let currentUserType = 'buyer'; // 'buyer' or 'farmer'
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

// User Type Management
function saveUserType(userType) {
  try { localStorage.setItem('bol-user-type', userType); } catch (_) {}
}
function loadUserType() {
  try { return localStorage.getItem('bol-user-type'); } catch (_) { return null; }
}
function applyUserType(userType) {
  currentUserType = userType;
  userTypeToggle?.setAttribute('data-user-type', userType);
  // Update labels styling
  const labels = document.querySelectorAll('.user-type-label');
  labels.forEach(label => {
    const labelType = label.getAttribute('data-type');
    if (labelType === userType) {
      label.style.color = 'var(--text)';
    } else {
      label.style.color = 'color-mix(in oklab, var(--text) 60%, transparent)';
    }
  });
  updateUIForUserType(userType);
}

// User Type init
const storedUserType = loadUserType();
applyUserType(storedUserType ?? 'buyer');

userTypeToggle?.addEventListener('click', () => {
  const next = currentUserType === 'buyer' ? 'farmer' : 'buyer';
  applyUserType(next);
  saveUserType(next);
});

function updateUIForUserType(userType) {
  // Update hero text based on user type
  const heroTitle = document.querySelector('.hero h1');
  const heroBtn = document.getElementById('heroCtaBtn');
  
  if (userType === 'farmer') {
    if (heroTitle) {
      heroTitle.innerHTML = '<span class="hi">مزارع فراولة؟</span> أحصل على النصائح والمساعدة';
    }
    if (heroBtn) {
      heroBtn.textContent = 'ابدأ كمزارع';
      heroBtn.setAttribute('data-message', 'مرحباً، أنا مزارع فراولة، كيف يمكنك مساعدتي؟');
    }
  } else {
    if (heroTitle) {
      heroTitle.innerHTML = '<span class="hi">لديك سؤال عن الفراولة؟</span> لدي كل الإجابات';
    }
    if (heroBtn) {
      heroBtn.textContent = 'ابدأ بالسؤال';
      heroBtn.setAttribute('data-message', 'مرحباً، ماذا يمكنك أن تفعل؟');
    }
  }
  
  // Update starter messages
  updateStarterMessages(userType);
}

function updateStarterMessages(userType) {
  const starterCards = document.querySelectorAll('.starter-card');
  
  if (userType === 'farmer') {
    // Farmer-specific starter messages
    const farmerMessages = [
      { message: 'ما هي أفضل طرق زراعة الفراولة؟', icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22V16H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V16H2V14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M5,16V20H19V16H5M5,14H19A5,5 0 0,0 14,9H10A5,5 0 0,0 5,14Z', text: 'ما هي أفضل طرق زراعة الفراولة؟' },
      { message: 'كيف أحمي محصولي من الآفات؟', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z', text: 'كيف أحمي محصولي من الآفات؟' },
      { message: 'متى الوقت المناسب للحصاد؟', icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z', text: 'متى الوقت المناسب للحصاد؟' },
      { message: 'كيف أحسن جودة الثمار؟', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', text: 'كيف أحسن جودة الثمار؟' }
    ];
    
    starterCards.forEach((card, index) => {
      if (farmerMessages[index]) {
        card.setAttribute('data-message', farmerMessages[index].message);
        card.querySelector('span').textContent = farmerMessages[index].text;
        card.querySelector('svg path').setAttribute('d', farmerMessages[index].icon);
      }
    });
  } else {
    // Buyer-specific starter messages (original)
    const buyerMessages = [
      { message: 'من أين جاءت هذه الفراولة؟', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', text: 'من أين جاءت هذه الفراولة؟' },
      { message: 'متى تم حصادها؟', icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z', text: 'متى تم حصادها؟' },
      { message: 'هل يمكن أن تسبب أي حساسية؟', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z', text: 'هل يمكن أن تسبب أي حساسية؟' },
      { message: 'هل يمكن استخدامها في العصائر؟', icon: 'M11 13v6H6v2h12v-2h-5v-6l8-8V3H3v2l8 8zM7.5 7l-2-2h13l-2 2h-9z', text: 'هل يمكن استخدامها في العصائر؟' }
    ];
    
    starterCards.forEach((card, index) => {
      if (buyerMessages[index]) {
        card.setAttribute('data-message', buyerMessages[index].message);
        card.querySelector('span').textContent = buyerMessages[index].text;
        card.querySelector('svg path').setAttribute('d', buyerMessages[index].icon);
      }
    });
  }
}

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
  // Different webhooks for different user types
  const webhookUrls = {
    buyer: 'https://cloud.activepieces.com/api/v1/webhooks/Mv38eBdOp6AP7ctrdOGOP/sync',
    farmer: 'https://cloud.activepieces.com/api/v1/webhooks/yo1lrTNx9eLwaqoHogFmP/sync' // Replace with actual farmer webhook URL
  };
  
  const webhookUrl = webhookUrls[currentUserType] || webhookUrls.buyer;
  
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
        userType: currentUserType,
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


