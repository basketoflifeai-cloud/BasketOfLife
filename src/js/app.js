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
const messages = []; // {id, role, content, createdAt}
let currentAbortController = null;
let currentUserType = 'buyer'; // 'buyer' or 'farmer'

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

function saveUserType(userType) {
  try { localStorage.setItem('bol-user-type', userType); } catch (_) {}
}
function loadUserType() {
  try { return localStorage.getItem('bol-user-type'); } catch (_) { return null; }
}
function applyUserType(userType) {
  currentUserType = userType;
  userTypeToggle?.setAttribute('data-user-type', userType);
  updateContentForUserType(userType);
}

function updateContentForUserType(userType) {
  const heroEl = document.querySelector('.hero h1');
  const heroCtaBtn = document.getElementById('heroCtaBtn');
  const inputEl = document.getElementById('input');
  const starterCards = document.querySelectorAll('.starter-card');
  
  if (userType === 'farmer') {
    // Update content for farmer
    if (heroEl) {
      heroEl.innerHTML = '<span class="hi">لديك سؤال حول زراعة الفراولة؟</span> لدي كل الإجابات للمزارعين';
    }
    if (heroCtaBtn) {
      heroCtaBtn.textContent = 'ابدأ كمزارع';
      heroCtaBtn.setAttribute('data-message', 'مرحباً، أنا مزارع وأحتاج مساعدة');
    }
    if (inputEl) {
      inputEl.placeholder = 'اسأل عن زراعة الفراولة…';
    }
    
    // Update starter cards for farmers
    const farmerStarters = [
      { text: 'ما هي أفضل طرق زراعة الفراولة؟', message: 'ما هي أفضل طرق زراعة الفراولة؟' },
      { text: 'متى هو الوقت المناسب للحصاد؟', message: 'متى هو الوقت المناسب لحصاد الفراولة؟' },
      { text: 'كيف أحمي المحصول من الآفات؟', message: 'كيف أحمي محصول الفراولة من الآفات؟' },
      { text: 'ما هي أفضل أنواع التربة للفراولة؟', message: 'ما هي أفضل أنواع التربة لزراعة الفراولة؟' }
    ];
    
    starterCards.forEach((card, index) => {
      if (farmerStarters[index]) {
        const span = card.querySelector('span');
        if (span) span.textContent = farmerStarters[index].text;
        card.setAttribute('data-message', farmerStarters[index].message);
      }
    });
    
  } else {
    // Update content for buyer (default)
    if (heroEl) {
      heroEl.innerHTML = '<span class="hi">لديك سؤال عن الفراولة؟</span> لدي كل الإجابات للمشترين';
    }
    if (heroCtaBtn) {
      heroCtaBtn.textContent = 'ابدأ كمشتري';
      heroCtaBtn.setAttribute('data-message', 'مرحباً، أنا مشتري وأريد معرفة المزيد');
    }
    if (inputEl) {
      inputEl.placeholder = 'اسأل عن شراء الفراولة…';
    }
    
    // Update starter cards for buyers (original content)
    const buyerStarters = [
      { text: 'من أين جاءت هذه الفراولة؟', message: 'من أين جاءت هذه الفراولة؟' },
      { text: 'متى تم حصادها؟', message: 'متى تم حصادها؟' },
      { text: 'هل يمكن أن تسبب أي حساسية؟', message: 'هل يمكن أن تسبب أي حساسية؟' },
      { text: 'هل يمكن استخدامها في العصائر؟', message: 'هل يمكن استخدامها في العصائر؟' }
    ];
    
    starterCards.forEach((card, index) => {
      if (buyerStarters[index]) {
        const span = card.querySelector('span');
        if (span) span.textContent = buyerStarters[index].text;
        card.setAttribute('data-message', buyerStarters[index].message);
      }
    });
  }
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

// User type init
const storedUserType = loadUserType();
applyUserType(storedUserType ?? 'buyer');

userTypeToggle?.addEventListener('click', () => {
  const next = currentUserType === 'buyer' ? 'farmer' : 'buyer';
  applyUserType(next);
  saveUserType(next);
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
  // Different webhooks for different user types
  const webhookUrls = {
    buyer: 'https://cloud.activepieces.com/api/v1/webhooks/Mv38eBdOp6AP7ctrdOGOP/sync',
    farmer: 'https://cloud.activepieces.com/api/v1/webhooks/yo1lrTNx9eLwaqoHogFmP/sync' // TODO: Replace YOUR_FARMER_WEBHOOK_ID_HERE with your actual farmer webhook ID
  };
  
  const webhookUrl = webhookUrls[currentUserType];
  
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


