// ============ PYPATH — Enki-style lesson reader ============

const STATE_KEY = 'pypath_state_v6';
const UNIT_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];
const NODE_EMOJIS = ['⭐', '📘', '⚡', '🧩', '🎯', '🔑', '🏁', '💡', '🔥', '🚀', '🎓', '✨'];

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY));
    if (s) return s;
  } catch (e) {}
  return { xp: 0, streak: 0, hearts: 5, lastDay: null, completed: {}, collapsed: {}, currentCourse: 'python', viewingSection: null, weaknesses: {}, pgSnippets: {} };
}
function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

let state = loadState();
let currentLesson = null;
let cardIdx = 0;
let mistakes = 0;

const pathEl = document.getElementById('duo-path');
const overviewEl = document.getElementById('tab-overview');
const statsEl = document.getElementById('tab-stats');
const readerEl = document.getElementById('lesson-reader');
const progFill = document.getElementById('progress-fill');
const progText = document.getElementById('progress-text');
const streakVal = document.getElementById('streak-val');
const xpVal = document.getElementById('xp-val');

// ---- SVG icons ----
const ICON = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

// ---- helpers ----
function flatLessons() {
  const arr = [];
  CURRICULUM.forEach(u => u.lessons.forEach(l => arr.push({ ...l, unitId: u.id })));
  return arr;
}
function nextLessonId() {
  const l = flatLessons().find(x => !state.completed[x.id]);
  return l ? l.id : null;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---- Weakness tracking ----
function recordWeakness(lessonId, cardIdx) {
  const key = lessonId + ':' + cardIdx;
  state.weaknesses = state.weaknesses || {};
  const entry = state.weaknesses[key] || { lessonId, cardIdx, misses: 0 };
  entry.misses += 1;
  entry.lastMiss = Date.now();
  state.weaknesses[key] = entry;
  saveState(state);
}
function clearWeakness(lessonId, cardIdx) {
  const key = lessonId + ':' + cardIdx;
  if (state.weaknesses && state.weaknesses[key]) {
    delete state.weaknesses[key];
    saveState(state);
  }
}
function getWeakness(lessonId, cardIdx) {
  return (state.weaknesses || {})[lessonId + ':' + cardIdx];
}
function plainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent;
}
function fakeViewCount(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const n = Math.abs(h) % 20000 + 800;
  return n > 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

// ---- header ----
function refreshHeader() {
  const flat = flatLessons();
  const done = flat.filter(l => state.completed[l.id]).length;
  const pct = Math.round((done / flat.length) * 100);
  progFill.style.width = pct + '%';
  progText.textContent = pct + '% · ' + done + ' of ' + flat.length + ' lessons';
  streakVal.textContent = state.streak;
  xpVal.textContent = state.xp;
}

// ---- Current course helpers ----
function getCurrentCourse() {
  const id = state.currentCourse || 'python';
  return COURSES.find(c => c.id === id) || COURSES[0];
}
function sectionStats(section) {
  const total = section.lessonIds.length;
  if (total === 0) return { total: 0, done: 0, pct: 0, complete: false };
  const done = section.lessonIds.filter(id => state.completed[id]).length;
  return { total, done, pct: Math.round((done / total) * 100), complete: done === total };
}
function courseSectionsWithStatus(course) {
  const sections = course.sections || [];
  let firstActiveIdx = -1;
  const enriched = sections.map((s, i) => {
    const stats = sectionStats(s);
    return { section: s, stats, index: i };
  });
  for (let i = 0; i < enriched.length; i++) {
    if (!enriched[i].stats.complete) { firstActiveIdx = i; break; }
  }
  return enriched.map((e, i) => ({
    ...e,
    status: e.stats.complete ? 'done' : (i === firstActiveIdx ? 'active' : 'open')
  }));
}

// ---- Course picker modal ----
function openCoursePicker() {
  const modal = document.createElement('div');
  modal.className = 'course-modal';
  const current = getCurrentCourse().id;
  const items = COURSES.map(c => {
    const isCurrent = c.id === current;
    const isFull = c.id === 'python';
    const statusHTML = isCurrent
      ? '<span class="cm-status current">Current</span>'
      : (isFull ? '<span class="cm-status full">Full</span>' : '<span class="cm-status">Coming soon</span>');
    return `
      <div class="cm-item ${isCurrent ? 'active' : ''}" data-course="${c.id}">
        <div class="cm-emoji" style="background:${c.color}22;color:${c.color}">${c.icon}</div>
        <div class="cm-info">
          <div class="cm-name">${c.name}</div>
          <div class="cm-tag">${c.tagline}</div>
        </div>
        ${statusHTML}
      </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="course-modal-inner">
      <div class="cm-handle"></div>
      <div class="cm-title">Choose a language</div>
      <div class="cm-sub">Pick what you want to learn. Python is fully built — others are coming.</div>
      <div class="cm-list">${items}</div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelectorAll('.cm-item').forEach(el => {
    el.addEventListener('click', () => {
      state.currentCourse = el.dataset.course;
      state.viewingSection = null;
      saveState(state);
      modal.remove();
      renderPath();
    });
  });
}

// ---- PATH LIST VIEW (IMG_2795 style) ----
function renderPathList() {
  const course = getCurrentCourse();
  const flat = [];
  CURRICULUM.forEach(u => u.lessons.forEach(l => flat.push({ ...l, unitTitle: u.title.replace(/^Unit \d+\s*—\s*/, '') })));

  const nextId = nextLessonId();
  const toggleHTML = `
    <div class="view-toggle">
      <button class="${state.pathView === 'list' ? '' : 'active'}" data-view="tree">🌳 Tree</button>
      <button class="${state.pathView === 'list' ? 'active' : ''}" data-view="list">📋 List</button>
    </div>`;

  const icons = ['📘', '📗', '📙', '📕', '📓', '📔', '📒'];
  const listHTML = flat.map((l, i) => {
    const done = state.completed[l.id];
    const isNext = l.id === nextId;
    const totalCards = l.cards.length;
    const doneCards = done ? totalCards : 0;
    const pct = done ? 100 : 0;
    const colorIdx = i % 6;
    return `
      <div class="lesson-list-card c${colorIdx}" data-lesson="${l.id}">
        <div class="lesson-list-icon c${colorIdx}">${icons[i % icons.length]}</div>
        <div class="lesson-list-body">
          <div class="lesson-list-title">${l.title}</div>
          <div class="lesson-list-sub">${doneCards} of ${totalCards} lessons</div>
          <div class="lesson-list-bar"><div class="lesson-list-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="lesson-list-pct">
          <div class="lesson-list-pct-num c${colorIdx}">${pct}%</div>
          <span class="lesson-list-chev">›</span>
        </div>
      </div>`;
  }).join('');

  pathEl.innerHTML = `
    ${toggleHTML}
    <div class="lesson-list-head">Your Lessons</div>
    <div class="lesson-list-view">${listHTML}</div>`;

  pathEl.querySelectorAll('.view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pathView = btn.dataset.view;
      saveState(state);
      renderPath();
    });
  });
  pathEl.querySelectorAll('.lesson-list-card').forEach(el => {
    el.addEventListener('click', () => {
      openLesson(el.dataset.lesson);
    });
  });
}

// Open a section: jump into first unfinished lesson of that section
function openSection(sectionId) {
  const course = getCurrentCourse();
  const section = course.sections.find(s => s.id === sectionId);
  if (!section || !section.lessonIds.length) {
    const placeholder = {
      id: sectionId + '-stub',
      icon: '🚧',
      title: section ? section.name : 'Section',
      sub: 'Coming soon',
      cards: [
        { type: 'concept', emoji: '🚧', title: 'Coming soon', body: 'This section isn\'t built out yet. Full content lives in the <strong>Python</strong> course — tap the course name at the top to switch.' }
      ]
    };
    currentLesson = placeholder;
    cardIdx = 0;
    mistakes = 0;
    readerEl.classList.add('active');
    renderCard();
    return;
  }
  const nextId = section.lessonIds.find(id => !state.completed[id]) || section.lessonIds[0];
  openLesson(nextId);
}

// ---- PATH (restored skill tree) ----
function renderPath() {
  // List-view alternative (IMG_2795)
  if (state.pathView === 'list') {
    renderPathList();
    return;
  }
  // Collapse every unit by default (one-time for existing users, always for new)
  if (!state.collapsedDefaulted) {
    state.collapsed = {};
    CURRICULUM.forEach(u => { state.collapsed[u.id] = true; });
    state.collapsedDefaulted = true;
    saveState(state);
  }
  state.collapsed = state.collapsed || {};
  CURRICULUM.forEach(u => {
    if (state.collapsed[u.id] === undefined) state.collapsed[u.id] = true;
  });
  const nextId = nextLessonId();
  const unitsHTML = CURRICULUM.map((u, ui) => {
    const collapsed = state.collapsed[u.id];
    const doneCount = u.lessons.filter(l => state.completed[l.id]).length;
    const color = UNIT_COLORS[ui % UNIT_COLORS.length];
    const unitTitle = u.title.replace(/^Unit \d+\s*—\s*/, '');

    const nodesHTML = u.lessons.map((l, li) => {
      const done = state.completed[l.id];
      const isNext = l.id === nextId;
      const klass = done ? 'done' : (isNext ? 'next' : 'open');
      const emoji = done ? '✓' : (l.icon || NODE_EMOJIS[(ui * 3 + li) % NODE_EMOJIS.length]);
      return `
        <div class="duo-node ${done ? 'done' : ''}" data-lesson="${l.id}">
          <button class="duo-btn ${klass}">
            ${emoji}
            ${done ? '<span class="duo-checkmark">✓</span>' : ''}
          </button>
          <div class="duo-node-label">
            <div class="node-name">${l.title}</div>
            <div class="node-sub">${l.sub}</div>
          </div>
        </div>`;
    }).join('');

    const unitDone = u.lessons.every(l => state.completed[l.id]);
    const bossBeaten = (state.bossesDone || {})[u.id];
    const bossClass = !unitDone ? 'boss-locked' : (bossBeaten ? 'boss-beaten' : 'boss-ready');
    const bossEmoji = !unitDone ? '🔒' : (bossBeaten ? '👑' : '🔥');
    const best = ((state.bossBests || {})[u.id] || {}).score;
    const bossSub = !unitDone
      ? `Finish all ${u.lessons.length} lessons to unlock`
      : bossBeaten
        ? `Beaten · best ${best || 0}/10`
        : '10 mixed questions · 5 min · 80% to pass';
    const bossNodeHTML = `
      <div class="duo-node boss-node ${bossClass}" data-boss="${u.id}">
        <button class="duo-btn boss-btn ${bossClass}">${bossEmoji}</button>
        <div class="duo-node-label">
          <div class="node-name">Boss · ${unitTitle}</div>
          <div class="node-sub">${bossSub}</div>
        </div>
      </div>`;

    return `
      <div class="duo-unit">
        <div class="duo-unit-header ${color}" data-unit="${u.id}">
          <div class="unit-label">Unit ${ui + 1}</div>
          <div class="unit-name">${unitTitle}</div>
          <div class="unit-progress">${doneCount} / ${u.lessons.length} complete</div>
          <div class="unit-toggle">${collapsed ? '▸' : '▾'}</div>
        </div>
        <div class="duo-nodes ${collapsed ? 'collapsed' : ''}">
          ${nodesHTML}
          ${bossNodeHTML}
        </div>
      </div>`;
  }).join('');

  const next = flatLessons().find(l => l.id === nextId);
  const heroHTML = next ? `
    <div class="path-hero">
      <div class="path-hero-emoji">🐍</div>
      <div class="path-hero-text">
        <div class="path-hero-title">${state.streak > 0 ? 'Keep the streak going' : 'Start learning Python'}</div>
        <div class="path-hero-sub">Next up · ${next.title}</div>
      </div>
      <button class="path-hero-btn" id="hero-start">Start</button>
    </div>` : `
    <div class="path-hero">
      <div class="path-hero-emoji">🏆</div>
      <div class="path-hero-text">
        <div class="path-hero-title">Course complete!</div>
        <div class="path-hero-sub">You've finished every lesson.</div>
      </div>
    </div>`;

  const course = getCurrentCourse();
  const lpn = document.getElementById('lang-pill-name');
  if (lpn) lpn.textContent = `${course.icon} ${course.name}`;

  const toggleHTML = `
    <div class="view-toggle">
      <button class="${state.pathView === 'list' ? '' : 'active'}" data-view="tree">🌳 Tree</button>
      <button class="${state.pathView === 'list' ? 'active' : ''}" data-view="list">📋 List</button>
    </div>`;

  pathEl.innerHTML = toggleHTML + heroHTML + unitsHTML;
  pathEl.querySelectorAll('.view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pathView = btn.dataset.view;
      saveState(state);
      renderPath();
    });
  });
  pathEl.querySelectorAll('.duo-unit-header').forEach(el => {
    el.addEventListener('click', () => {
      state.collapsed[el.dataset.unit] = !state.collapsed[el.dataset.unit];
      saveState(state);
      renderPath();
    });
  });
  pathEl.querySelectorAll('.duo-node').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.boss) {
        openBoss(el.dataset.boss);
      } else if (el.dataset.lesson) {
        openLesson(el.dataset.lesson);
      }
    });
  });
  const hs = document.getElementById('hero-start');
  if (hs) hs.addEventListener('click', () => openLesson(next.id));
}

// ---- OVERVIEW / STATS ----
function renderOverview() {
  overviewEl.innerHTML = `
    <div class="card">
      <div class="card-title">About PyPath</div>
      <div class="card-sub">Short, focused Python lessons. Each node is a bite-sized lesson — read a concept, try an example, answer a question. Complete lessons in order to unlock the next.</div>
    </div>
    <div class="card">
      <div class="card-title">Course Map</div>
      ${CURRICULUM.map((u, i) => {
        const doneCount = u.lessons.filter(l => state.completed[l.id]).length;
        const pct = Math.round((doneCount / u.lessons.length) * 100);
        const ut = u.title.replace(/^Unit \d+\s*—\s*/, '');
        return `<div class="unit-row">
          <div class="unit-row-num">${i + 1}</div>
          <div class="unit-row-body">
            <div class="unit-row-title">${ut}</div>
            <div class="unit-row-sub">${u.sub} · ${doneCount}/${u.lessons.length}</div>
          </div>
          <div class="unit-row-bar"><div class="unit-row-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')}
    </div>`;
}
// ---- PROJECTS ----
const PROJECTS = [
  {
    tier: 'beginner', badge: 'Beginner', count: 'warm-ups',
    items: [
      { id: 'p-morse',   emoji: '📻', title: 'Text ↔ Morse Code', desc: 'Convert text to Morse and back. Strings + dictionary lookup.', skills: ['strings', 'dicts'] },
      { id: 'p-ttt',     emoji: '⭕', title: 'Tic-Tac-Toe',         desc: 'Two-player game in the terminal with win detection.',       skills: ['2D lists', 'loops'] },
      { id: 'p-typing',  emoji: '⌨️', title: 'Typing Speed Test',    desc: 'Measure words-per-minute against a target sentence.',       skills: ['input', 'time'] },
      { id: 'p-pass',    emoji: '🔐', title: 'Password Generator',   desc: 'Configurable length and character classes.',                skills: ['random', 'strings'] },
      { id: 'p-guess',   emoji: '🎯', title: 'Number Guesser',       desc: 'Classic guess-the-number with hints + attempt counter.',    skills: ['loops', 'random'] },
      { id: 'p-rps',     emoji: '✊', title: 'Rock Paper Scissors',  desc: 'Play against the computer, track a running score.',         skills: ['random', 'if/else'] },
      { id: 'p-coffee',  emoji: '☕', title: 'Coffee Machine',        desc: 'Ingredient tracking, money handling, report command.',     skills: ['dicts', 'functions'] },
      { id: 'p-hangman', emoji: '🎮', title: 'Hangman',              desc: 'Word-guessing game with ASCII art stages.',                 skills: ['lists', 'loops'] },
    ]
  },
  {
    tier: 'intermediate', badge: 'Intermediate', count: 'build real things',
    items: [
      { id: 'p-portfolio', emoji: '🌐', title: 'Portfolio Website',       desc: 'Your own Flask + Jinja2 site, deployed online.',             skills: ['flask', 'jinja2', 'html'] },
      { id: 'p-watermark', emoji: '🖼️', title: 'Image Watermarking App',   desc: 'Batch-watermark images in a folder with Pillow.',           skills: ['Pillow', 'tkinter', 'pathlib'] },
      { id: 'p-palette',   emoji: '🎨', title: 'Color Palette Generator',  desc: 'Extract dominant colors from any image.',                    skills: ['Pillow', 'clustering'] },
      { id: 'p-breakout',  emoji: '🧱', title: 'Breakout Game',            desc: 'Paddle + ball + bricks. Turtle or Pygame.',                  skills: ['turtle / pygame', 'OOP'] },
      { id: 'p-invaders',  emoji: '👾', title: 'Space Invaders',           desc: 'Classic shoot-em-up clone with Pygame.',                     skills: ['pygame', 'OOP', 'sprites'] },
      { id: 'p-todo',      emoji: '✅', title: 'Todo List Website',        desc: 'CRUD with Flask + SQLite + auth.',                           skills: ['flask', 'sqlite', 'forms'] },
      { id: 'p-cafe',      emoji: '🍰', title: 'Cafe & Wi-Fi Website',     desc: 'Searchable cafe directory with real DB + admin.',            skills: ['flask', 'sqlalchemy'] },
      { id: 'p-fadetext',  emoji: '✍️', title: 'Disappearing Text App',     desc: 'Write or lose it — text fades if you stop typing.',         skills: ['tkinter', 'events'] },
      { id: 'p-scraper',   emoji: '🕷️', title: 'Custom Web Scraper',       desc: 'Extract structured data from a site of your choice.',        skills: ['requests', 'bs4'] },
      { id: 'p-email',     emoji: '📧', title: 'Email Automation',         desc: 'Send scheduled emails via SMTP (newsletter, reminder).',     skills: ['smtplib', 'schedule'] },
      { id: 'p-weather',   emoji: '⛅', title: 'Weather Dashboard',        desc: 'Fetch and display forecasts from a weather API.',            skills: ['requests', 'api auth'] },
      { id: 'p-pomodoro',  emoji: '🍅', title: 'Pomodoro Timer',           desc: 'Desktop productivity timer with work/break cycles.',         skills: ['tkinter'] },
    ]
  },
  {
    tier: 'advanced', badge: 'Advanced', count: 'ship production apps',
    items: [
      { id: 'p-blog',      emoji: '📝', title: 'Build Your Own Blog',       desc: 'Flask + SQLAlchemy + auth + deploy. Write posts, RSS feed.',     skills: ['flask', 'sqlalchemy', 'auth'] },
      { id: 'p-rest',      emoji: '🔌', title: 'REST API from Scratch',     desc: 'FastAPI with JWT auth, Pydantic, full pytest suite.',             skills: ['fastapi', 'pydantic', 'tests'] },
      { id: 'p-shop',      emoji: '🛒', title: 'Online Shop',                desc: 'Product catalog, cart, Stripe checkout, orders.',                skills: ['flask/django', 'stripe'] },
      { id: 'p-apiweb',    emoji: '🌍', title: 'API-Driven Website',         desc: 'Public site consuming & displaying 3rd-party APIs.',             skills: ['requests', 'caching'] },
      { id: 'p-browser',   emoji: '🤖', title: 'Custom Browser Automation',  desc: 'Headless Selenium/Playwright bot that does a real task.',        skills: ['selenium', 'playwright'] },
      { id: 'p-dino',      emoji: '🦖', title: 'Dino Game Autoplayer',       desc: 'Computer-vision bot that plays the Chrome dino game.',           skills: ['selenium', 'cv'] },
      { id: 'p-social',    emoji: '📱', title: 'Social Media Auto-poster',   desc: 'Scheduled posts to Twitter/LinkedIn/Instagram via APIs.',        skills: ['apis', 'schedule'] },
      { id: 'p-discord',   emoji: '🎧', title: 'Discord Bot',                 desc: 'Commands, reminders, mini-games in your server.',                skills: ['discord.py', 'async'] },
      { id: 'p-tracker',   emoji: '📊', title: 'Expense Tracker CLI',         desc: 'Rich-powered terminal app with charts and JSON persistence.',   skills: ['typer', 'rich'] },
      { id: 'p-worker',    emoji: '⚡', title: 'Parallel Downloader',         desc: 'Same job done three ways: threads, processes, asyncio.',         skills: ['asyncio', 'benchmark'] },
    ]
  },
  {
    tier: 'data', badge: 'Data & ML', count: 'analyze real datasets',
    items: [
      { id: 'p-space',     emoji: '🚀', title: 'Visualize the Space Race',   desc: 'Analyze 60 years of launches with pandas + Plotly.',              skills: ['pandas', 'plotly'] },
      { id: 'p-police',    emoji: '🚔', title: 'Police Deaths in the US',    desc: 'Data cleaning, demographic analysis, responsible charts.',        skills: ['pandas', 'seaborn'] },
      { id: 'p-earn',      emoji: '💰', title: 'Predict Earnings',            desc: 'Multi-variable regression + residuals analysis.',                 skills: ['sklearn', 'stats'] },
      { id: 'p-stocks',    emoji: '📈', title: 'Stock Portfolio Tracker',    desc: 'yfinance + pandas + dashboards.',                                 skills: ['yfinance', 'pandas'] },
      { id: 'p-twitter',   emoji: '🐦', title: 'Sentiment on Tweets',         desc: 'Scrape or use API + run sentiment on a topic.',                   skills: ['nlp', 'vader'] },
      { id: 'p-covid',     emoji: '🦠', title: 'COVID Data Explorer',         desc: 'Time-series analysis with smoothing + anomaly detection.',        skills: ['pandas', 'matplotlib'] },
      { id: 'p-movies',    emoji: '🎬', title: 'Movie Recommender',           desc: 'Collaborative filtering on the MovieLens dataset.',               skills: ['pandas', 'sklearn'] },
      { id: 'p-mnist',     emoji: '🔢', title: 'Handwritten Digit Classifier', desc: 'Classic first neural net with PyTorch or sklearn.',              skills: ['sklearn / torch'] },
    ]
  },
];

function renderProjects() {
  const doneSet = state.projectsDone || {};
  const projectsEl = document.getElementById('tab-projects');
  const totalProjects = PROJECTS.reduce((n, s) => n + s.items.length, 0);
  const doneCount = Object.keys(doneSet).filter(k => doneSet[k]).length;

  const sectionsHTML = PROJECTS.map(section => {
    const cards = section.items.map(p => {
      const done = doneSet[p.id];
      const skills = p.skills.map(s => `<span class="proj-skill">${s}</span>`).join('');
      return `
        <div class="proj-card ${done ? 'done' : ''}" data-proj="${p.id}">
          <div class="proj-card-head">
            <span class="proj-emoji">${p.emoji}</span>
            <span class="proj-title">${p.title}</span>
            <span class="proj-check">✓</span>
          </div>
          <div class="proj-desc">${p.desc}</div>
          <div class="proj-skills">${skills}</div>
        </div>`;
    }).join('');
    return `
      <div class="proj-section">
        <div class="proj-section-head">
          <span class="proj-badge ${section.tier}">${section.badge}</span>
          <span class="proj-section-title">${section.items.length} projects</span>
          <span class="proj-section-count">${section.count}</span>
        </div>
        <div class="proj-grid">${cards}</div>
      </div>`;
  }).join('');

  projectsEl.innerHTML = `
    <div class="projects-intro">
      <h2>Portfolio Projects</h2>
      <p>Each project forces you to combine what you've learned and produce something real. Tap a card when you've built it — track your portfolio as it grows. <strong style="color:var(--mint)">${doneCount} / ${totalProjects}</strong> built.</p>
    </div>
    ${sectionsHTML}`;

  projectsEl.querySelectorAll('.proj-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.proj;
      state.projectsDone = state.projectsDone || {};
      state.projectsDone[id] = !state.projectsDone[id];
      saveState(state);
      renderProjects();
    });
  });
}

// ============ PRACTICE ============
function collectWeaknesses() {
  const w = state.weaknesses || {};
  const items = [];
  Object.values(w).forEach(entry => {
    const lesson = LESSON_INDEX[entry.lessonId];
    if (!lesson) return;
    const card = lesson.cards[entry.cardIdx];
    if (!card) return;
    items.push({ ...entry, lesson, card });
  });
  items.sort((a, b) => (b.misses - a.misses) || (b.lastMiss - a.lastMiss));
  return items;
}

function renderPractice() {
  const el = document.getElementById('tab-practice');
  const items = collectWeaknesses();

  if (items.length === 0) {
    el.innerHTML = `
      <div class="practice-intro">
        <h2>Practice</h2>
        <p>Drill the stuff you got wrong. Every time you miss a question in a lesson, it lands here so you can hammer it until it sticks.</p>
      </div>
      <div class="practice-empty">
        <div class="pe-emoji">🎯</div>
        <div class="pe-title">No weak spots yet</div>
        <div>Keep doing lessons. Anything you miss will show up here for focused drills.</div>
      </div>`;
    return;
  }

  const cardsHTML = items.map(w => {
    const preview = (w.card.prompt || w.card.title || (w.card.body || '').replace(/<[^>]+>/g, '').slice(0, 100)) || 'Question';
    const intense = w.misses >= 3 ? 'intense' : '';
    return `
      <div class="weak-card ${intense}" data-lesson="${w.lessonId}" data-card="${w.cardIdx}">
        <div class="wc-miss">${w.misses}×</div>
        <div class="wc-body">
          <div class="wc-lesson">${w.lesson.title} · Card ${w.cardIdx + 1}</div>
          <div class="wc-prompt">${preview.replace(/<[^>]+>/g, '')}</div>
        </div>
        <div class="wc-chev">›</div>
      </div>`;
  }).join('');

  const totalMisses = items.reduce((n, w) => n + w.misses, 0);

  el.innerHTML = `
    <div class="practice-intro">
      <h2>Practice Your Weaknesses</h2>
      <p><strong style="color:var(--yellow)">${items.length}</strong> weak spot${items.length === 1 ? '' : 's'} · <strong style="color:#e89999">${totalMisses}</strong> total miss${totalMisses === 1 ? '' : 'es'}. Work through these until they feel easy.</p>
    </div>
    <div class="practice-actions">
      <button class="practice-cta" id="pr-drill">Start Drill Session</button>
      <button class="practice-cta secondary" id="pr-clear">Clear All</button>
    </div>
    <div class="weak-list">${cardsHTML}</div>`;

  el.querySelectorAll('.weak-card').forEach(card => {
    card.addEventListener('click', () => {
      startPractice([{ lessonId: card.dataset.lesson, cardIdx: parseInt(card.dataset.card) }]);
    });
  });
  document.getElementById('pr-drill').addEventListener('click', () => {
    startPractice(items.slice(0, 10).map(w => ({ lessonId: w.lessonId, cardIdx: w.cardIdx })));
  });
  document.getElementById('pr-clear').addEventListener('click', () => {
    if (!confirm('Clear all tracked weaknesses?')) return;
    state.weaknesses = {};
    saveState(state);
    renderPractice();
  });
}

function startPractice(entries) {
  const cards = entries.map(e => {
    const lesson = LESSON_INDEX[e.lessonId];
    return lesson && lesson.cards[e.cardIdx];
  }).filter(Boolean);
  if (cards.length === 0) return;

  const synth = {
    id: '__practice__',
    icon: '🎯',
    title: 'Practice Drill',
    sub: 'Just the stuff you missed',
    cards,
    __practiceSources: entries,
  };
  // Track mapping so correct answers clear original weakness
  window.__practiceMode = true;
  window.__practiceEntries = entries;

  currentLesson = synth;
  cardIdx = 0;
  mistakes = 0;
  readerEl.classList.add('active');
  renderCard();
}

// ============ PLAYGROUND ============
const PG_SNIPPETS = {
  python: `# Python Playground (runs client-side via Pyodide)\nname = "World"\nprint(f"Hello, {name}!")\n\nfor i in range(3):\n    print(i * 2)\n`,
  javascript: `// JavaScript Playground — executes in your browser\nconst name = "World";\nconsole.log(\`Hello, \${name}!\`);\n\nfor (let i = 0; i < 3; i++) {\n  console.log(i * 2);\n}\n`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; background: #f2f4f7; padding: 40px; }\n    h1 { color: #4b8bf5; }\n  </style>\n</head>\n<body>\n  <h1>Hello from HTML</h1>\n  <p>Edit the code and click Run.</p>\n</body>\n</html>\n`,
  css: `<!-- Live preview: edit CSS, see result -->\n<style>\n  body { background: #1a1f2e; color: white; font-family: sans-serif; padding: 30px; }\n  .box {\n    padding: 20px; border-radius: 12px;\n    background: linear-gradient(135deg, #7ce0a0, #4bb3ff);\n    color: #06231a; font-weight: 800;\n  }\n</style>\n<div class="box">Style me!</div>\n`,
  sql: `-- SQL Playground (copy & run in your DB of choice)\nSELECT name, age\nFROM users\nWHERE age >= 18\nORDER BY age DESC\nLIMIT 10;\n`,
  swift: `// Swift — copy into a Playground in Xcode\nlet name = "World"\nprint("Hello, \\(name)!")\n\nfor i in 0..<3 {\n    print(i * 2)\n}\n`,
  go: `// Go — copy to go.dev/play or your local Go installation\npackage main\n\nimport "fmt"\n\nfunc main() {\n    name := "World"\n    fmt.Printf("Hello, %s!\\n", name)\n    for i := 0; i < 3; i++ {\n        fmt.Println(i * 2)\n    }\n}\n`,
  rust: `// Rust — copy to play.rust-lang.org\nfn main() {\n    let name = "World";\n    println!("Hello, {}!", name);\n    for i in 0..3 {\n        println!("{}", i * 2);\n    }\n}\n`,
};
const PG_LANG_LABELS = {
  python: '🐍 Python', javascript: '🟨 JavaScript', html: '📄 HTML', css: '🎨 CSS',
  sql: '🗄️ SQL', swift: '🦅 Swift', go: '🐹 Go', rust: '🦀 Rust'
};
let _pyodide = null;
let _pyodideLoading = false;

function renderPlayground() {
  const el = document.getElementById('tab-playground');
  const currentLang = state.pgLang || 'python';
  const saved = (state.pgSnippets && state.pgSnippets[currentLang]) || PG_SNIPPETS[currentLang];

  el.innerHTML = `
    <div class="pg-header">
      <h2>⚡ Playground</h2>
      <select class="pg-lang-select" id="pg-lang">
        ${Object.keys(PG_LANG_LABELS).map(k =>
          `<option value="${k}" ${k === currentLang ? 'selected' : ''}>${PG_LANG_LABELS[k]}</option>`
        ).join('')}
      </select>
      <button class="pg-run" id="pg-run">▶ Run</button>
    </div>
    <div class="pg-hint" id="pg-hint"></div>
    <div class="pg-editor-wrap">
      <div class="pg-editor-header">
        <span id="pg-fname">script.py</span>
        <div class="pg-editor-actions">
          <button class="pg-mini-btn" id="pg-reset">RESET</button>
          <button class="pg-mini-btn" id="pg-copy">COPY</button>
        </div>
      </div>
      <textarea class="pg-editor" id="pg-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
    </div>
    <div class="pg-output-wrap" id="pg-output-wrap">
      <div class="pg-output-header">
        <span>Output</span>
        <span class="pg-output-status" id="pg-status">idle</span>
      </div>
      <div class="pg-output" id="pg-output"><span class="pg-output-empty">Click Run to execute.</span></div>
    </div>`;

  const editor = document.getElementById('pg-editor');
  const langSel = document.getElementById('pg-lang');
  const runBtn = document.getElementById('pg-run');
  const hint = document.getElementById('pg-hint');
  const fname = document.getElementById('pg-fname');
  const outputEl = document.getElementById('pg-output');

  editor.value = saved;
  updatePgHint(currentLang, hint, fname);

  editor.addEventListener('input', () => {
    state.pgSnippets = state.pgSnippets || {};
    state.pgSnippets[editor.dataset.lang || currentLang] = editor.value;
    saveState(state);
  });
  editor.dataset.lang = currentLang;

  // Tab indentation
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart, end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
    }
  });

  langSel.addEventListener('change', () => {
    state.pgLang = langSel.value;
    saveState(state);
    renderPlayground();
  });

  document.getElementById('pg-reset').addEventListener('click', () => {
    if (!confirm('Reset to starter snippet?')) return;
    editor.value = PG_SNIPPETS[currentLang];
    state.pgSnippets = state.pgSnippets || {};
    state.pgSnippets[currentLang] = editor.value;
    saveState(state);
  });
  document.getElementById('pg-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      const btn = document.getElementById('pg-copy');
      btn.textContent = 'COPIED';
      setTimeout(() => { btn.textContent = 'COPY'; }, 1200);
    } catch (e) {}
  });

  runBtn.addEventListener('click', () => runPlayground(currentLang, editor.value));
}

function updatePgHint(lang, hintEl, fnameEl) {
  const fnames = { python: 'script.py', javascript: 'script.js', html: 'index.html', css: 'style.css', sql: 'query.sql', swift: 'main.swift', go: 'main.go', rust: 'main.rs' };
  if (fnameEl) fnameEl.textContent = fnames[lang] || 'code';
  const hints = {
    python: 'Runs in your browser via <code>Pyodide</code>. First run downloads ~10MB — later runs are instant.',
    javascript: 'Runs instantly in a sandboxed iframe. Use <code>console.log()</code> to print output.',
    html: 'Renders as a live preview below. Edit and hit Run.',
    css: 'Mix HTML + <code>&lt;style&gt;</code> to preview your CSS.',
    sql: 'SQL can\'t run in the browser. The Copy button grabs your query for any SQL shell.',
    swift: 'Swift needs Xcode or a Swift toolchain. The Copy button is your friend.',
    go: 'Copy your code and paste it into <code>go.dev/play</code> to run instantly.',
    rust: 'Copy to <code>play.rust-lang.org</code> — full compile + run in your browser.'
  };
  if (hintEl) hintEl.innerHTML = hints[lang] || '';
}

async function runPlayground(lang, code) {
  const output = document.getElementById('pg-output');
  const status = document.getElementById('pg-status');
  const outputWrap = document.getElementById('pg-output-wrap');
  const runBtn = document.getElementById('pg-run');

  // Remove any preview iframe
  const existingIframe = outputWrap.querySelector('iframe');
  if (existingIframe) existingIframe.remove();
  output.style.display = 'block';
  output.classList.remove('error');

  if (lang === 'javascript') {
    status.textContent = 'running'; status.className = 'pg-output-status';
    const lines = [];
    const orig = console.log;
    try {
      console.log = (...args) => lines.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      const result = new Function(code)();
      if (result !== undefined) lines.push('→ ' + (typeof result === 'object' ? JSON.stringify(result) : String(result)));
      output.textContent = lines.length ? lines.join('\n') : '(no output)';
      status.textContent = 'ok'; status.className = 'pg-output-status ok';
    } catch (e) {
      output.textContent = e.name + ': ' + e.message;
      output.classList.add('error');
      status.textContent = 'error'; status.className = 'pg-output-status err';
    } finally {
      console.log = orig;
    }
    return;
  }

  if (lang === 'html' || lang === 'css') {
    output.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.className = 'pg-preview';
    iframe.srcdoc = code;
    outputWrap.appendChild(iframe);
    status.textContent = 'rendered'; status.className = 'pg-output-status ok';
    return;
  }

  if (lang === 'python') {
    status.textContent = 'loading python…'; status.className = 'pg-output-status';
    runBtn.disabled = true;
    try {
      if (!_pyodide) {
        output.textContent = 'Downloading Pyodide (~10MB, first time only)…';
        if (!_pyodideLoading) {
          _pyodideLoading = true;
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
          document.head.appendChild(script);
          await new Promise((res, rej) => { script.onload = res; script.onerror = rej; });
        }
        _pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
      }
      const buf = [];
      _pyodide.setStdout({ batched: (s) => buf.push(s) });
      _pyodide.setStderr({ batched: (s) => buf.push(s) });
      status.textContent = 'running'; status.className = 'pg-output-status';
      await _pyodide.runPythonAsync(code);
      output.textContent = buf.join('\n') || '(no output)';
      status.textContent = 'ok'; status.className = 'pg-output-status ok';
    } catch (e) {
      output.textContent = String(e.message || e);
      output.classList.add('error');
      status.textContent = 'error'; status.className = 'pg-output-status err';
    } finally {
      runBtn.disabled = false;
    }
    return;
  }

  // Fallback for languages we can't run
  output.textContent = `Can't run ${lang} in the browser directly. Click COPY and paste into a ${lang === 'go' ? 'go.dev/play' : lang === 'rust' ? 'play.rust-lang.org' : 'local toolchain'}.`;
  status.textContent = 'info'; status.className = 'pg-output-status';
}

// ============ PROGRESS / CERTIFICATES ============
const CERT_ICON_BADGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5 3.5 9 9 10 5.5-1 9-5 9-10V7l-9-5z"/><path d="M9 12l2 2 4-4"/></svg>';
const CERT_ICON_CODE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5 3.5 9 9 10 5.5-1 9-5 9-10V7l-9-5z"/><polyline points="9 11 7 13 9 15"/><polyline points="15 11 17 13 15 15"/></svg>';

// Each certificate defines which courses/sections/projects satisfy it
const CERTIFICATES = {
  professional: [
    { id: 'cert-fs',     name: 'Full-Stack Developer',  sub: 'Python + JS + HTML + CSS + SQL',       kind: 'professional', req: { courses: ['python', 'javascript', 'html', 'css', 'sql'] } },
    { id: 'cert-py',     name: 'Python Developer',       sub: 'Python course + 5 projects',            kind: 'professional', req: { courses: ['python'], projects: 5 } },
    { id: 'cert-be',     name: 'Back-End Developer',     sub: 'Python + SQL + 3 back-end projects',    kind: 'professional', req: { courses: ['python', 'sql'], projects: 3 } },
    { id: 'cert-fe',     name: 'Front-End Developer',    sub: 'HTML + CSS + JS + 3 front-end projects',kind: 'professional', req: { courses: ['html', 'css', 'javascript'], projects: 3 } },
  ],
  completion: [
    { id: 'comp-py',     name: 'Python',                 sub: 'Finish the Python course',             kind: 'completion', req: { courses: ['python'] } },
    { id: 'comp-js',     name: 'JavaScript',             sub: 'Finish the JavaScript course',         kind: 'completion', req: { courses: ['javascript'] } },
    { id: 'comp-ts',     name: 'TypeScript',             sub: 'Finish the TypeScript course',         kind: 'completion', req: { courses: ['typescript'] } },
    { id: 'comp-html',   name: 'HTML',                   sub: 'Finish the HTML course',               kind: 'completion', req: { courses: ['html'] } },
    { id: 'comp-css',    name: 'CSS',                    sub: 'Finish the CSS course',                kind: 'completion', req: { courses: ['css'] } },
    { id: 'comp-react',  name: 'React',                  sub: 'Finish the React course',              kind: 'completion', req: { courses: ['react'] } },
    { id: 'comp-sql',    name: 'SQL',                    sub: 'Finish the SQL course',                kind: 'completion', req: { courses: ['sql'] } },
    { id: 'comp-swift',  name: 'Swift',                  sub: 'Finish the Swift course',              kind: 'completion', req: { courses: ['swift'] } },
    { id: 'comp-go',     name: 'Go',                     sub: 'Finish the Go course',                 kind: 'completion', req: { courses: ['go'] } },
    { id: 'comp-rust',   name: 'Rust',                   sub: 'Finish the Rust course',               kind: 'completion', req: { courses: ['rust'] } },
  ]
};

function coursePct(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  if (!course) return 0;
  const total = course.sections.reduce((n, s) => n + s.lessonIds.length, 0);
  if (total === 0) return 0;
  const done = course.sections.reduce((n, s) => n + s.lessonIds.filter(id => state.completed[id]).length, 0);
  return Math.round((done / total) * 100);
}
function projectsDoneCount() {
  return Object.values(state.projectsDone || {}).filter(Boolean).length;
}
function certProgress(cert) {
  const parts = [];
  if (cert.req.courses) {
    cert.req.courses.forEach(cid => parts.push(coursePct(cid)));
  }
  if (cert.req.projects) {
    parts.push(Math.min(100, Math.round((projectsDoneCount() / cert.req.projects) * 100)));
  }
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function renderProgress() {
  const el = document.getElementById('tab-progress');
  const allCerts = [...CERTIFICATES.professional, ...CERTIFICATES.completion];
  const earnedCount = allCerts.filter(c => certProgress(c) === 100).length;
  const overallPct = Math.round(allCerts.reduce((n, c) => n + certProgress(c), 0) / allCerts.length);

  const rowHTML = (cert, kind) => {
    const pct = certProgress(cert);
    const earned = pct === 100;
    const klass = earned ? 'earned' : (pct > 0 ? 'partial' : 'locked');
    const icon = cert.name.toLowerCase().includes('code') || kind === 'completion' ? CERT_ICON_CODE : CERT_ICON_BADGE;
    return `
      <div class="cert-row ${klass}" data-cert="${cert.id}">
        <div class="cert-icon">${icon}</div>
        <div class="cert-body">
          <div class="cert-name">${cert.name}</div>
          <div class="cert-sub">${cert.sub}</div>
        </div>
        <div class="cert-pct" style="--p:${pct}%"><span>${pct}%</span></div>
      </div>`;
  };

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const activeCourse = getCurrentCourse();
  const totalInCourse = activeCourse.sections.reduce((n, s) => n + s.lessonIds.length, 0);
  const doneInCourse = activeCourse.sections.reduce((n, s) => n + s.lessonIds.filter(id => state.completed[id]).length, 0);
  const coursePctNow = totalInCourse ? Math.round((doneInCourse / totalInCourse) * 100) : 0;
  const dailyGoal = 3;
  const doneToday = state.doneToday || 0;

  el.innerHTML = `
    <div class="greeting-row">
      <div>
        <div class="greeting-label">${greet}</div>
        <div class="greeting-title">Learn <span class="greeting-chip" id="greet-chip">${activeCourse.icon} ${activeCourse.name}</span></div>
      </div>
    </div>

    <div class="mini-stats">
      <div class="mini-stat">
        <div class="mini-stat-icon streak">🔥</div>
        <div class="mini-stat-val">${state.streak}</div>
        <div class="mini-stat-lbl">days streak</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-icon goal">🎯</div>
        <div class="mini-stat-val">${Math.min(doneToday, dailyGoal)}/${dailyGoal}</div>
        <div class="mini-stat-lbl">Today's Goal</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-icon done">🏆</div>
        <div class="mini-stat-val">${earnedCount}</div>
        <div class="mini-stat-lbl">Completed</div>
      </div>
    </div>

    <div class="progress-box">
      <div class="progress-box-chip"><span class="pc-arrow">↗</span>Progress</div>
      <div class="progress-box-head">
        <div>
          <div class="progress-box-stat">${doneInCourse}/${totalInCourse}</div>
          <div class="progress-box-sub">${activeCourse.name} lessons</div>
        </div>
        <div class="progress-box-pct" style="--p:${coursePctNow}%"><span>${coursePctNow}%</span></div>
      </div>
      <div class="progress-box-track"><div class="progress-box-fill" style="width:${coursePctNow}%"></div></div>
      <div class="progress-box-details" id="pb-details">View details ›</div>
    </div>

    <div class="quick-heading">Quick Access</div>
    <div class="quick-grid">
      <div class="quick-item" data-go="tutor">
        <div class="quick-icon tutor">🤖</div>
        <div class="quick-label">AI Tutor</div>
        <div class="quick-chev">›</div>
      </div>
      <div class="quick-item" data-go="practice">
        <div class="quick-icon notes">📝</div>
        <div class="quick-label">Practice</div>
        <div class="quick-chev">›</div>
      </div>
      <div class="quick-item" data-go="playground">
        <div class="quick-icon sheet">⚡</div>
        <div class="quick-label">Playground</div>
        <div class="quick-chev">›</div>
      </div>
      <div class="quick-item" data-go="projects">
        <div class="quick-icon help">🛠</div>
        <div class="quick-label">Projects</div>
        <div class="quick-chev">›</div>
      </div>
    </div>

    <div class="progress-hero" style="margin-top:22px">
      <div class="progress-hero-ring" style="--p:${overallPct}%"><span class="ph-pct">${overallPct}%</span></div>
      <div class="progress-hero-text">
        <div class="progress-hero-title">Your Certificates</div>
        <div class="progress-hero-sub"><strong style="color:var(--mint)">${earnedCount}</strong> of ${allCerts.length} earned. Keep finishing lessons and shipping projects to unlock the rest.</div>
      </div>
    </div>

    <div class="cert-section">
      <div class="cert-section-head">
        <div class="cert-section-title">Professional Certificates</div>
        <div class="cert-info-icon" title="Multi-course career tracks">i</div>
      </div>
      <div class="cert-list">
        ${CERTIFICATES.professional.map(c => rowHTML(c, 'professional')).join('')}
      </div>
      <div class="cert-upgrade">Professional certs are earned by finishing a full track of courses plus real projects shipped.</div>
    </div>

    <div class="cert-section">
      <div class="cert-section-head">
        <div class="cert-section-title">Certificates of Completion</div>
        <div class="cert-info-icon" title="Earned by finishing a single course">i</div>
      </div>
      <div class="cert-list">
        ${CERTIFICATES.completion.map(c => rowHTML(c, 'completion')).join('')}
      </div>
    </div>`;

  el.querySelectorAll('.cert-row').forEach(row => {
    row.addEventListener('click', () => openCertificate(row.dataset.cert));
  });
  el.querySelectorAll('.quick-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.go;
      const btn = document.querySelector(`[data-tab="${tab}"]`);
      if (btn) btn.click();
    });
  });
  const gc = document.getElementById('greet-chip');
  if (gc) gc.addEventListener('click', openCoursePicker);
  const pbd = document.getElementById('pb-details');
  if (pbd) pbd.addEventListener('click', () => {
    document.querySelector('[data-tab="path"]').click();
  });
}

// ============ AI TUTOR ============
const TUTOR_QUICK_ASKS = [
  { icon: '💡', tint: 'yellow', text: 'Explain this concept', prompt: 'Can you explain the concept I just saw in simpler terms?' },
  { icon: '&lt;/&gt;', tint: 'purple', text: 'Show me an example', prompt: 'Show me a real-world example of this in action.' },
  { icon: '✨', tint: 'mint', text: 'Best practices',      prompt: 'What are the best practices for this topic?' },
  { icon: '🐛', tint: 'pink', text: 'Help me debug',       prompt: 'I have a bug. Here is my code:\n\n' },
];

function renderTutor() {
  const el = document.getElementById('tab-tutor');
  const course = getCurrentCourse();
  state.tutorHistory = state.tutorHistory || [];
  const hasHistory = state.tutorHistory.some(m => m.role === 'user');

  el.innerHTML = `
    <button class="tutor-reset ${hasHistory ? '' : 'hidden'}" id="tutor-reset" title="Start a new chat">
      <span class="tutor-reset-icon">↻</span> New chat
    </button>

    <div class="tutor-hero ${hasHistory ? 'hidden' : ''}" id="tutor-hero">
      <div class="tutor-pill-layer">
        ${TUTOR_QUICK_ASKS.map((q, i) => `
          <button class="tutor-pill float-${i}" data-prompt="${encodeURIComponent(q.prompt)}">
            <span class="tutor-pill-icon tint-${q.tint}">${q.icon}</span>
            <span class="tutor-pill-text">${q.text}</span>
          </button>
        `).join('')}
      </div>
      <div class="tutor-center">
        <div class="tutor-bot-badge">🤖</div>
        <h1 class="tutor-heading">How can I help you today?</h1>
        <p class="tutor-sub">Ask me anything about ${course.name}</p>
      </div>
    </div>

    <div class="chat-window tutor-chat ${hasHistory ? '' : 'no-history'}" id="tutor-chat">
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-input-row">
        <textarea class="chat-input" id="chat-input" placeholder="Message AI Assistant..." rows="1"></textarea>
        <button class="chat-send" id="chat-send" aria-label="Send">↑</button>
      </div>
    </div>`;

  const resetBtn = document.getElementById('tutor-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('Clear this chat and start a new one?')) return;
    state.tutorHistory = [];
    saveState(state);
    renderTutor();
  });

  drawChatLog();
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');

  el.querySelectorAll('.tutor-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = decodeURIComponent(btn.dataset.prompt);
      input.value = prompt;
      input.focus();
    });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTutorMessage();
    }
  });
  send.addEventListener('click', sendTutorMessage);

  function sendTutorMessage() {
    const text = input.value.trim();
    if (!text) return;
    const hero = document.getElementById('tutor-hero');
    if (hero) hero.classList.add('hidden');
    const chatBox = document.getElementById('tutor-chat');
    if (chatBox) chatBox.classList.remove('no-history');
    state.tutorHistory.push({ role: 'user', text });
    input.value = '';
    drawChatLog();
    saveState(state);

    // Show typing indicator
    const log = document.getElementById('chat-log');
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    setTimeout(() => {
      typing.remove();
      const reply = tutorReply(text);
      state.tutorHistory.push({ role: 'bot', text: reply });
      saveState(state);
      drawChatLog();
    }, 600 + Math.random() * 600);
  }
}

function drawChatLog() {
  const log = document.getElementById('chat-log');
  if (!log) return;
  log.innerHTML = state.tutorHistory.map(m =>
    `<div class="chat-msg ${m.role}">${m.role === 'bot' ? m.text : escapeHtml(m.text)}</div>`
  ).join('');
  log.scrollTop = log.scrollHeight;
}

// Local knowledge-based tutor (no network). Matches keywords and returns canned
// but useful answers drawn from the curriculum.
function tutorReply(q) {
  const t = q.toLowerCase();
  const course = getCurrentCourse();

  // Quiz mode
  if (/quiz me|test me|ask me/.test(t)) {
    const lessons = CURRICULUM.flatMap(u => u.lessons);
    const pool = lessons.flatMap(l => l.cards
      .filter(c => (c.type === 'mc' || c.type === 'predict'))
      .map(c => ({ ...c, lessonTitle: l.title }))
    );
    if (pool.length === 0) return "I couldn't find any quiz cards — finish a lesson first!";
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const body = picked.map((c, i) => {
      const opts = c.options.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}`).join('\n');
      return `<strong>${i + 1}. ${c.prompt}</strong>${c.code ? `\n<pre>${c.code.replace(/<[^>]+>/g, '')}</pre>` : ''}\n${opts}`;
    }).join('\n\n');
    return `Here are 3 questions from <strong>${picked[0].lessonTitle}</strong>:\n\n${body}\n\n<em>Tap a quick-ask to check your answers, or tell me your picks (like "1A 2C 3B") and I'll grade you.</em>`;
  }

  if (/hint|stuck/.test(t)) {
    return `Here's a hint strategy that works:\n\n1. <strong>Re-read the error message</strong> — Python errors are usually specific.\n2. Add <code>print()</code> to check values at each step.\n3. If a loop misbehaves, check the <strong>stop condition</strong> and <strong>counter update</strong>.\n4. For quizzes, reread the prompt — one word often decides the answer.\n\nShare the code or question and I'll dig deeper with you.`;
  }

  if (/debug|bug|error|traceback/.test(t)) {
    return `Walk me through it — paste the <strong>full traceback</strong> and the <strong>line of code</strong> that triggered it. While you do, here's the golden debug checklist:\n\n<pre># The 5 questions that solve 80% of bugs\n1. What did you EXPECT to happen?\n2. What ACTUALLY happened?\n3. What's the exact error message / traceback?\n4. What was the LAST thing you changed?\n5. Have you confirmed the input is what you think it is?</pre>`;
  }

  if (/explain|what is|what are|how does|how do|define/.test(t)) {
    // Search curriculum for a matching term
    const topics = CURRICULUM.flatMap(u => u.lessons);
    const match = topics.find(l => l.title.toLowerCase().split(' ').some(w => t.includes(w.toLowerCase())));
    if (match) {
      const firstConcept = match.cards.find(c => c.type === 'concept' && c.body);
      const body = firstConcept ? firstConcept.body : match.sub;
      return `Great question! Here's the gist from the <strong>${match.title}</strong> lesson:\n\n${body}\n\n<em>Want a code example or a practice question on this?</em>`;
    }
  }

  if (/thanks|thank you|thx/.test(t)) {
    return "Anytime 💜 Keep that streak going.";
  }

  if (/hello|hi|hey|yo/.test(t)) {
    return `Hey! What ${course.name} topic do you want to dig into?`;
  }

  // Default helpful reply
  return `I hear you. I can help best when you give me one of:\n\n• A <strong>specific concept</strong> to explain (e.g. "explain decorators")\n• A <strong>code snippet</strong> that's not working\n• A request to <strong>quiz you</strong> on a topic\n• A lesson from the Path you want simplified\n\nWhich would help most right now?`;
}

function openCertificate(certId) {
  const cert = [...CERTIFICATES.professional, ...CERTIFICATES.completion].find(c => c.id === certId);
  if (!cert) return;
  const pct = certProgress(cert);
  const earned = pct === 100;
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const userName = 'Learner'; // could be pulled from settings

  const modal = document.createElement('div');
  modal.className = 'cert-modal';
  modal.innerHTML = `
    <div class="cert-certificate">
      <button class="cert-close" id="cert-close">×</button>
      <div class="cert-banner">${earned ? 'Certificate of ' + (cert.kind === 'completion' ? 'Completion' : 'Achievement') : 'Locked Certificate'}</div>
      <div class="cert-big-icon">${cert.name.includes('Front') || cert.name.includes('JavaScript') || cert.name.includes('TypeScript') ? CERT_ICON_CODE : CERT_ICON_BADGE}</div>
      <div class="cert-title-name">${cert.name}</div>
      <div class="cert-kind">${cert.sub}</div>
      ${earned ? `
        <div class="cert-awarded">This certifies that <strong>${userName}</strong> has successfully completed the <strong>${cert.name}</strong> track on PyPath.</div>
        <div class="cert-date">Awarded · ${dateStr}</div>
      ` : `
        <div class="cert-locked-msg">
          <strong>${pct}% complete</strong>
          Finish the required courses ${cert.req.projects ? `and ship at least ${cert.req.projects} projects ` : ''}to unlock this certificate.
        </div>
      `}
      <button class="cert-action" id="cert-action">${earned ? 'Share' : 'Keep going'}</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('cert-close').addEventListener('click', () => modal.remove());
  document.getElementById('cert-action').addEventListener('click', () => modal.remove());
}

// ============ GAMES ============
const BUG_PUZZLES = [
  {
    lang: 'Python',
    code: [
      'def greet(name):',
      '    print("Hi, " + name',
      '    return None',
      '',
      'greet("Ada")',
    ],
    bugLines: [1], // 0-indexed line with missing `)`
    explain: 'Line 2 is missing the closing parenthesis: <code>print("Hi, " + name)</code>.'
  },
  {
    lang: 'Python',
    code: [
      'nums = [1, 2, 3, 4, 5]',
      'total = 0',
      'for n in nums:',
      '  total = total + n',
      'print(Total)',
    ],
    bugLines: [4],
    explain: 'Line 5 uses <code>Total</code> (capital T) but the variable is <code>total</code>. Python names are case-sensitive.'
  },
  {
    lang: 'Python',
    code: [
      'def divide(a, b):',
      '    return a / b',
      '',
      'result = divide(10, 0)',
      'print(result)',
    ],
    bugLines: [3],
    explain: 'Line 4 divides by zero → <code>ZeroDivisionError</code>. Guard with <code>if b == 0</code> or wrap in try/except.'
  },
  {
    lang: 'JavaScript',
    code: [
      'const items = ["a", "b", "c"];',
      'for (let i = 0; i <= items.length; i++) {',
      '    console.log(items[i]);',
      '}',
    ],
    bugLines: [1],
    explain: 'Line 2 uses <code>&lt;=</code> — loops one past the end, printing <code>undefined</code>. Should be <code>&lt;</code>.'
  },
];

function renderGames() {
  const el = document.getElementById('tab-games');

  el.innerHTML = `
    <div class="games-topbar">
      <h2>🎮 Games</h2>
    </div>

    <div class="game-section">
      <div class="game-section-title">Bug Hunter</div>
      <div class="game-section-sub">Can you spot the bugs in the code and extend your streak?</div>
      <div class="bug-hunter-card" id="bug-hunter-launch">
        <span class="bh-bug">🐞</span>
        <div class="bh-title">Bug<br>Hunter</div>
        <div class="bh-sub">WITH AI</div>
      </div>
    </div>

    <div class="game-section">
      <div class="game-section-title">Code Diff</div>
      <div class="game-section-sub">You get working code. Tweak it so it does something slightly different. Runs live in your browser.</div>
      <div class="game-card code-diff-card" id="code-diff-launch">
        <span class="gc-icon">🔀</span>
        <div class="gc-title">Code<br>Diff</div>
        <div class="gc-sub">LIVE RUN</div>
      </div>
    </div>

    <div class="game-section">
      <div class="game-section-title">Constellation Map</div>
      <div class="game-section-sub">Every lesson is a star. Stars you've finished light up — units form constellations across the sky.</div>
      <div class="game-card constellation-card" id="constellation-launch">
        <span class="gc-icon">✨</span>
        <div class="gc-title">Constellation<br>Map</div>
        <div class="gc-sub">PROGRESS SKY</div>
      </div>
    </div>`;

  document.getElementById('bug-hunter-launch').addEventListener('click', openBugHunter);
  document.getElementById('code-diff-launch').addEventListener('click', openCodeDiff);
  document.getElementById('constellation-launch').addEventListener('click', openConstellation);
}

function openBugHunter() {
  const puzzle = BUG_PUZZLES[Math.floor(Math.random() * BUG_PUZZLES.length)];
  const picked = new Set();
  let done = false;

  const modal = document.createElement('div');
  modal.className = 'bh-modal';
  modal.innerHTML = `
    <div class="bh-modal-inner">
      <button class="bh-close" id="bh-close">×</button>
      <div class="bh-header">
        <div class="bh-modal-title">🐞 Bug Hunter</div>
        <div class="bh-modal-sub">${puzzle.lang} · Tap the line(s) with the bug</div>
      </div>
      <div class="bh-instructions">Read the code below. Tap any line you think has a bug, then Check.</div>
      <div class="bh-code-block" id="bh-code">
        ${puzzle.code.map((line, i) =>
          `<span class="bh-code-line" data-line="${i}"><span class="bh-lineno">${i + 1}</span>${escapeHtml(line) || '&nbsp;'}</span>`
        ).join('')}
      </div>
      <div class="bh-feedback" id="bh-feedback"></div>
      <div class="bh-actions">
        <button class="bh-btn secondary" id="bh-skip">Skip</button>
        <button class="bh-btn primary" id="bh-check">Check</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const codeBlock = modal.querySelector('#bh-code');
  codeBlock.querySelectorAll('.bh-code-line').forEach(line => {
    line.addEventListener('click', () => {
      if (done) return;
      const idx = parseInt(line.dataset.line);
      if (picked.has(idx)) { picked.delete(idx); line.classList.remove('picked'); }
      else { picked.add(idx); line.classList.add('picked'); line.style.background = 'rgba(138, 175, 234, 0.12)'; }
    });
  });

  const close = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.getElementById('bh-close').addEventListener('click', close);
  document.getElementById('bh-skip').addEventListener('click', close);

  document.getElementById('bh-check').addEventListener('click', () => {
    if (done) { close(); return; }
    done = true;
    const bugSet = new Set(puzzle.bugLines);
    const correct = picked.size === bugSet.size && [...picked].every(i => bugSet.has(i));
    codeBlock.querySelectorAll('.bh-code-line').forEach(line => {
      const idx = parseInt(line.dataset.line);
      line.style.background = '';
      if (bugSet.has(idx)) line.classList.add('picked', 'correct');
      else if (picked.has(idx)) line.classList.add('picked', 'wrong');
    });
    const fb = document.getElementById('bh-feedback');
    fb.className = 'bh-feedback show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = (correct ? '✓ Bug spotted! ' : '✗ Not quite. ') + puzzle.explain;
    if (correct) { state.xp = (state.xp || 0) + 5; saveState(state); }
    document.getElementById('bh-check').textContent = 'Close';
  });
}

function renderStats() {
  const flat = flatLessons();
  const done = flat.filter(l => state.completed[l.id]).length;
  statsEl.innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile"><div class="st-val">${state.xp}</div><div class="st-lbl">Total XP</div></div>
      <div class="stat-tile"><div class="st-val">${state.streak}</div><div class="st-lbl">Day Streak</div></div>
      <div class="stat-tile"><div class="st-val">${done}</div><div class="st-lbl">Lessons Done</div></div>
      <div class="stat-tile"><div class="st-val">${flat.length - done}</div><div class="st-lbl">To Go</div></div>
    </div>`;
}

const langPill = document.getElementById('lang-pill');
if (langPill) langPill.addEventListener('click', openCoursePicker);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'overview') renderOverview();
    if (btn.dataset.tab === 'projects') renderProjects();
    if (btn.dataset.tab === 'practice') renderPractice();
    if (btn.dataset.tab === 'playground') renderPlayground();
    if (btn.dataset.tab === 'progress') renderProgress();
    if (btn.dataset.tab === 'tutor') renderTutor();
    if (btn.dataset.tab === 'games') renderGames();
    if (btn.dataset.tab === 'stats') renderStats();
  });
});

// ============ LESSON READER ============
function openLesson(id) {
  for (const u of CURRICULUM) for (const l of u.lessons) if (l.id === id) currentLesson = l;
  cardIdx = 0;
  mistakes = 0;
  readerEl.classList.add('active');
  renderCard();
}
function closeLesson() {
  readerEl.classList.remove('active');
  readerEl.innerHTML = '';
  const wasPractice = window.__practiceMode;
  currentLesson = null;
  window.__practiceMode = false;
  window.__practiceEntries = null;
  if (wasPractice) renderPractice();
  renderPath();
}

// Main card renderer — Enki layout
function renderCard() {
  const card = currentLesson.cards[cardIdx];
  const n = currentLesson.cards.length;

  const segs = Array.from({ length: n }, (_, i) => {
    const cls = i < cardIdx ? 'done' : (i === cardIdx ? 'active' : '');
    return `<div class="rp-seg ${cls}"></div>`;
  }).join('');

  // Build body
  let bodyHTML = '';
  switch (card.type) {
    case 'concept':     bodyHTML = renderConcept(card); break;
    case 'code':        bodyHTML = renderCode(card); break;
    case 'mc':          bodyHTML = renderQuiz(card, 'check'); break;
    case 'predict':     bodyHTML = renderQuiz(card, 'predict'); break;
    case 'tapfill':     bodyHTML = renderTapfill(card); break;
    case 'bugfix':      bodyHTML = renderBugfix(card); break;
    case 'reorder':     bodyHTML = renderReorder(card); break;
    case 'output':      bodyHTML = renderOutput(card); break;
    case 'multiselect': bodyHTML = renderMultiselect(card); break;
    case 'fillin':      bodyHTML = renderFillin(card); break;
  }

  const footer = renderFooter(card);

  readerEl.innerHTML = `
    <div class="reader-topbar">
      <div class="reader-topbar-inner">
        <button class="rt-btn" id="rt-back">←</button>
        <div class="rt-spacer"></div>
        <div class="rt-title">${currentLesson.title}</div>
        <div class="rt-spacer"></div>
        <button class="rt-btn" id="rt-close">✕</button>
      </div>
      <div class="reader-progress">${segs}</div>
    </div>
    <div class="reader-body">${bodyHTML}</div>
    ${footer}`;

  document.getElementById('rt-back').addEventListener('click', () => {
    if (cardIdx === 0) closeLesson();
    else { cardIdx--; renderCard(); }
  });
  document.getElementById('rt-close').addEventListener('click', () => {
    if (confirm('Exit this lesson? Progress will be lost.')) closeLesson();
  });

  wireCard(card);
  wireCopyButtons();
  wireAiAvatar();
  if (window.__bossMode) mountBossTimer();
}

function stageTagFor(card) {
  if (card.stage) return [card.stage.toLowerCase().replace(/\s+/g, '-'), card.stage];
  if (card.type === 'concept') return ['must-know', 'Must Know'];
  if (card.type === 'code')    return ['feature', 'Feature'];
  if (card.type === 'mc')      return ['test-yourself', 'Test Yourself'];
  if (card.type === 'predict') return ['test-yourself', 'Test Yourself'];
  if (card.type === 'tapfill') return ['test-yourself', 'Test Yourself'];
  if (card.type === 'multiselect') return ['test-yourself', 'Test Yourself'];
  if (card.type === 'fillin') return ['test-yourself', 'Test Yourself'];
  if (card.type === 'bugfix') return ['test-yourself', 'Test Yourself'];
  return ['must-know', 'Must Know'];
}

function viewCountHTML(card) {
  return '';
}

function renderCallout(card) {
  if (!card.callout) return '';
  const type = card.calloutType || 'info';
  const icon = type === 'warn' ? '⚠️' : (type === 'tip' ? '💡' : 'ℹ️');
  return `<div class="enki-callout ${type}"><span class="callout-icon">${icon}</span><span>${card.callout}</span></div>`;
}

function renderLearnMore(card) {
  if (!card.learnMore || !card.learnMore.length) return '';
  const links = card.learnMore.map(lm =>
    `<div class="learn-more-link"><span class="lm-icon">💎</span>${lm}</div>`
  ).join('');
  return `<div class="learn-more"><div class="learn-more-title">Learn more</div>${links}</div>`;
}

// ---- Glossary: clickable keyword pills ----
const GLOSSARY = {
  'index':         'The position of an item in a sequence. Python counts from 0 — so list[0] is the first item, list[1] the second.',
  'indexing':      'Accessing an item by its position with square brackets, e.g. names[2]. Python uses zero-based indexing.',
  'zero-indexed':  'A counting scheme where the first item is at position 0, not 1. Standard in Python and most programming languages.',
  'mutable':       'Can be changed after it\'s created. Lists and dicts are mutable — you can add, remove, or replace items.',
  'immutable':     'Cannot be changed after creation. Strings, tuples, and numbers are immutable — operations on them return new values.',
  'iterable':      'Anything you can loop over one item at a time: lists, strings, ranges, dicts, files, tuples, sets.',
  'iteration':     'One single pass through the body of a loop. A loop over 5 items does 5 iterations.',
  'concatenation': 'Joining two strings (or lists) end-to-end, usually with the + operator.',
  'concatenate':   'To join strings or lists together, typically with the + operator.',
  'parameter':     'A name in a function\'s definition — the slot that a value fills when you call the function.',
  'parameters':    'The names in a function\'s definition — slots that values fill when you call it.',
  'argument':      'The actual value you pass to a function when calling it. Arguments fill the function\'s parameters.',
  'arguments':     'The actual values passed to a function at call time. They fill the function\'s parameters.',
  'keyword':       'A word built into the language that you can\'t use as a variable name, like if, def, for, return.',
  'keywords':      'Words built into the language that you can\'t use as variable names — if, def, for, return, and ~30 others.',
  'interpreter':   'The program that reads and runs your Python code line by line.',
  'syntax':        'The rules for how Python code must be written — spelling, punctuation, and structure.',
  'dynamic typing': 'Python figures out a variable\'s type from its value at runtime. You don\'t declare types ahead of time.',
  'snake_case':    'A naming style where words are lowercase and separated by underscores: user_name, total_count. Python\'s default for variables and functions.',
  'scope':         'The region of code where a name is visible. A variable defined inside a function is only visible there.',
  'local':         'A variable created inside a function. It only exists during that function call.',
  'global':        'A variable defined at the top level of a file. It can be read anywhere; writing to it from inside a function needs the global keyword.',
  'nonlocal':      'A keyword that lets an inner function modify a variable in the enclosing (not global) function.',
  'lambda':        'A tiny, one-expression function written inline with "lambda args: expr" — no name, no def block.',
  'docstring':     'A string written at the very top of a function, class, or module to describe what it does. Usually in triple quotes.',
  'truthy':        'A value that counts as True in a boolean context. Any non-empty, non-zero, non-None value is truthy.',
  'falsy':         'A value that counts as False in a boolean context: False, 0, 0.0, "", [], {}, None.',
  'short-circuit': 'Python stops evaluating a boolean expression as soon as the answer is determined. "True or X" skips X entirely.',
  'slice':         'A sub-section of a sequence, taken with list[start:stop] syntax. The stop index is not included.',
  'slicing':       'Grabbing a sub-section of a list or string using list[start:stop] — start is included, stop is not.',
  'tuple':         'An ordered, IMMUTABLE collection. Looks like (1, 2, 3). Used for fixed groups of values.',
  'dictionary':    'A collection of key → value pairs. Looks like {"name": "Ada", "age": 36}. Fast to look up by key.',
  'boolean':       'A type with only two values: True and False. Used for yes/no conditions.',
  'booleans':      'Values that are either True or False. Used for yes/no conditions.',
  'float':         'A number with a decimal point, like 3.14. Short for "floating-point number".',
  'floats':        'Numbers with decimal points, like 3.14 and 0.5. Short for "floating-point".',
  'integer':       'A whole number (positive, negative, or zero) with no decimal point.',
  'integers':      'Whole numbers — no decimal point. Positive, negative, or zero.',
  'string':        'A sequence of characters — text wrapped in quotes, like "hello" or \'world\'.',
  'strings':       'Sequences of characters — text wrapped in quotes.',
  'function':      'A named, reusable block of code. Define with "def name(params):" and call with "name(args)".',
  'functions':     'Named reusable blocks of code. Define once with def, call as many times as you want.',
  'method':        'A function that belongs to an object. Called with a dot: "hi".upper().',
  'methods':       'Functions that belong to an object. Called with a dot, like "hi".upper().',
  'module':        'A Python file you can import. The standard library has modules like math, random, and os.',
  'accumulator':   'A pattern where you build up a result by adding each item onto a running total inside a loop.',
  'sentinel':      'A special value that signals "stop" or "not found". Often used to end an input loop.',
  'PEMDAS':        'The order of operations: Parentheses → Exponents → Multiplication/Division → Addition/Subtraction.',
  'REPL':          'Read–Eval–Print Loop — the interactive Python prompt where you type one line at a time and see the result.',
  'f-string':      'A string prefixed with f that lets you embed variables in curly braces: f"Hi {name}".',
  'f-strings':     'Strings prefixed with f that let you embed variables in curly braces: f"Hi {name}".',
  'escape sequence': 'A backslash + letter inside a string that stands for a special character: \\n is a newline, \\t is a tab.',
  'LEGB':          'The order Python searches for a name: Local → Enclosing → Global → Built-in.',
};

function pillifyHTML(html) {
  if (!html) return html;
  const terms = Object.keys(GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return html;
  const termRe = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
  const seen = new Set();
  return html.replace(
    /(<code>[\s\S]*?<\/code>|<pre>[\s\S]*?<\/pre>|<[^>]+>)|([^<]+)/g,
    (_, skip, text) => {
      if (skip) return skip;
      return text.replace(termRe, (m) => {
        const key = m.toLowerCase();
        if (seen.has(key)) return m;
        seen.add(key);
        return `<span class="kw-pill" data-term="${key}">${m}</span>`;
      });
    }
  );
}

function bodyHTML(raw) {
  if (!raw) return '';
  const withBreaks = raw.replace(/\n\n/g, '<br><br>').replace(/\n(?!<)/g, '<br>');
  return `<div class="body-text">${pillifyHTML(withBreaks)}</div>`;
}

document.addEventListener('click', (e) => {
  const pill = e.target.closest && e.target.closest('.kw-pill');
  if (!pill) return;
  e.stopPropagation();
  const term = pill.dataset.term;
  const def = GLOSSARY[term];
  if (!def) return;
  const displayTerm = pill.textContent;
  const existing = document.getElementById('kw-modal-overlay');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'kw-modal-overlay';
  modal.className = 'ai-modal-overlay';
  modal.innerHTML = `
    <div class="ai-modal kw-modal">
      <div class="ai-modal-header">
        <div class="ai-modal-title"><span class="ai-modal-emoji">📖</span>${displayTerm}</div>
        <button class="ai-modal-close" id="kw-modal-close" aria-label="Close">×</button>
      </div>
      <div class="ai-modal-body"><p>${def}</p></div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('kw-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
});

function renderConcept(card) {
  const [stageCls, stageLbl] = stageTagFor(card);
  const title = card.title ? `
    <h1 class="lesson-heading">
      ${card.emoji ? `<span class="lh-emoji">${card.emoji}</span>` : ''}
      <span>${card.title}</span>
    </h1>` : '';
  const body = bodyHTML(card.body);
  const code = card.code ? codePanelHTML(card.code, 'script.py') : '';
  const output = card.output ? `
    <div class="output-label">Output</div>
    <div class="output-block">${card.output}</div>` : '';
  const callout = renderCallout(card);
  const learnMore = renderLearnMore(card);
  return `
    <div>
      <span class="stage-pill ${stageCls}">${stageLbl}</span>
      ${viewCountHTML(card)}
    </div>
    ${title}${body}${code}${output}${callout}${learnMore}
    ${actionRowHTML(card)}`;
}

function renderCode(card) {
  const [stageCls, stageLbl] = stageTagFor(card);
  const title = card.title ? `<h1 class="lesson-heading">${card.title}</h1>` : '';
  const body = bodyHTML(card.body);
  const code = card.code ? codePanelHTML(card.code, 'script.py') : '';
  const output = card.output ? `
    <div class="output-label">Output</div>
    <div class="output-block">${card.output}</div>` : '';
  const callout = renderCallout(card);
  const learnMore = renderLearnMore(card);
  return `
    <div>
      <span class="stage-pill ${stageCls}">${stageLbl}</span>
      ${viewCountHTML(card)}
    </div>
    ${title}${body}${code}${output}${callout}${learnMore}
    ${actionRowHTML(card)}`;
}

function renderQuiz(card, kind) {
  const stageCls = kind === 'predict' ? 'predict' : 'test-yourself';
  const stageLbl = kind === 'predict' ? 'Predict' : 'Test Yourself';
  const code = card.code ? codePanelHTML(card.code, 'script.py') : '';

  // Build prompt — if "???" is present, render it as a blank placeholder chip
  const promptHTML = card.prompt.replace(/\?\?\?/g, '<span class="blank-placeholder">???</span>');

  const optsHTML = card.options.map((o, i) =>
    `<button class="quiz-chip ${card.code_options ? 'code-opt' : ''}" data-i="${i}">${escapeHtml(o)}</button>`
  ).join('');

  return `
    <div>
      <span class="stage-pill ${stageCls}">${stageLbl}</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">${promptHTML}</div>
    ${code}
    <div class="quiz-chips" id="quiz-chips">${optsHTML}</div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function renderTapfill(card) {
  window.__tapfill = {
    filled: new Array(card.blanks.length).fill(null),
    tokenUsed: new Array(card.tokens.length).fill(false),
    card
  };
  return `
    <div>
      <span class="stage-pill build">Build the Code</span>
      ${viewCountHTML(card)}
    </div>
    <div class="tapfill-intro">${card.prompt}</div>
    <div class="tapfill-code">
      <div class="code-header">
        <span class="fname">script.py</span>
        <button class="copy-btn" disabled style="opacity:0.4">${ICON.copy}<span>Copy</span></button>
      </div>
      <div class="tapfill-body" id="tf-body"></div>
    </div>
    <div class="tokens" id="tf-tokens"></div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function codePanelHTML(code, fname) {
  // Add line numbers like Enki
  const lines = code.split('\n');
  const numbered = lines.map((line, i) =>
    `<span class="code-line"><span class="line-num">${i + 1}</span>${line}</span>`
  ).join('\n');
  return `
    <div class="code-panel">
      <div class="code-header">
        <span class="fname"></span>
        <button class="copy-btn" data-copy="${encodeURIComponent(plainText(code))}">${ICON.copy}<span>Copy</span></button>
      </div>
      <div class="code-body">${numbered}</div>
    </div>`;
}

function actionRowHTML(card) {
  return '';
}

// ---- footer (sticky bottom bar) ----
function renderFooter(card) {
  const n = currentLesson.cards.length;
  const isLast = cardIdx === n - 1;
  const needsAnswer = (card.type === 'mc' || card.type === 'predict' || card.type === 'tapfill' || card.type === 'bugfix' || card.type === 'reorder' || card.type === 'output' || card.type === 'multiselect' || card.type === 'fillin');
  const isMulti = card.type === 'multiselect';
  const primaryLabel = needsAnswer
    ? (isMulti ? 'Choose ' + (card.answers ? card.answers.length : 2) + ' answers' : 'Choose answer')
    : 'Ask question';
  const nextLabel = isLast ? 'Finish' : 'Next';
  return `
    <div class="reader-footer">
      <div class="ai-avatar" id="ai-avatar-btn" title="Ask PyPath AI">✨</div>
      <button class="primary-dark" id="primary-btn" ${needsAnswer ? 'disabled' : ''}>${primaryLabel}</button>
      <button class="white-btn" id="next-btn">${needsAnswer ? 'Skip' : nextLabel}</button>
    </div>`;
}

// ---- wiring ----
function wireCopyButtons() {
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = decodeURIComponent(btn.dataset.copy);
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        btn.innerHTML = ICON.copy + '<span>Copied!</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = ICON.copy + '<span>Copy</span>';
        }, 1500);
      } catch (e) {}
    });
  });
}

function wireCard(card) {
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', advance);

  const interactiveTypes = ['mc', 'predict', 'tapfill', 'bugfix', 'reorder', 'output', 'multiselect', 'fillin'];
  if (!interactiveTypes.includes(card.type)) {
    const primaryBtn = document.getElementById('primary-btn');
    if (primaryBtn) primaryBtn.addEventListener('click', () => openAiResponse('ask'));
  }

  if (card.type === 'mc' || card.type === 'predict' || card.type === 'bugfix') wireQuiz(card);
  if (card.type === 'tapfill') wireTapfill(card);
  if (card.type === 'reorder') wireReorder(card);
  if (card.type === 'output') wireOutput(card);
  if (card.type === 'multiselect') wireMultiselect(card);
  if (card.type === 'fillin') wireFillin(card);
}

function wireQuiz(card) {
  let picked = null;
  const chips = readerEl.querySelectorAll('.quiz-chip');
  const fb = document.getElementById('feedback');
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      picked = parseInt(chip.dataset.i);
      primaryBtn.disabled = false;
      primaryBtn.textContent = 'Check answer';
      nextBtn.textContent = 'Skip';
      nextBtn.disabled = false;
    });
  });

  primaryBtn.addEventListener('click', () => {
    if (picked === null) return;
    const correct = picked === card.answer;
    chips.forEach((c, i) => {
      c.disabled = true;
      c.classList.remove('selected');
      if (i === card.answer) c.classList.add('correct');
      else if (i === picked) c.classList.add('wrong');
    });
    fb.className = 'feedback-box show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = (correct ? '✓ Correct. ' : '✗ Not quite. ') + (card.explain || '');
    if (!correct) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    primaryBtn.textContent = correct ? 'Correct' : 'Answered';
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = false;
  });
}

function wireTapfill(card) {
  const ctx = window.__tapfill;
  const body = document.getElementById('tf-body');
  const toks = document.getElementById('tf-tokens');
  const fb = document.getElementById('feedback');
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');
  let answered = false;

  function draw() {
    let bi = 0;
    body.innerHTML = card.template.replace(/___/g, () => {
      const idx = bi++;
      const v = ctx.filled[idx];
      return `<span class="blank ${v !== null ? 'filled' : ''}" data-blank="${idx}">${v !== null ? escapeHtml(card.tokens[v]) : '&nbsp;&nbsp;&nbsp;'}</span>`;
    });
    toks.innerHTML = card.tokens.map((t, i) =>
      `<div class="token ${ctx.tokenUsed[i] ? 'used' : ''}" data-tok="${i}">${escapeHtml(t)}</div>`
    ).join('');
    body.querySelectorAll('.blank').forEach(el => {
      el.addEventListener('click', () => {
        if (answered) return;
        const idx = parseInt(el.dataset.blank);
        if (ctx.filled[idx] === null) return;
        ctx.tokenUsed[ctx.filled[idx]] = false;
        ctx.filled[idx] = null;
        draw();
        updatePrimary();
      });
    });
    toks.querySelectorAll('.token').forEach(el => {
      el.addEventListener('click', () => {
        if (answered) return;
        const i = parseInt(el.dataset.tok);
        if (ctx.tokenUsed[i]) return;
        const next = ctx.filled.findIndex(x => x === null);
        if (next === -1) return;
        ctx.filled[next] = i;
        ctx.tokenUsed[i] = true;
        draw();
        updatePrimary();
      });
    });
  }
  function updatePrimary() {
    const ready = ctx.filled.every(x => x !== null);
    primaryBtn.disabled = !ready || answered;
    primaryBtn.textContent = ready ? 'Check answer' : 'Fill the blanks';
    nextBtn.textContent = 'Skip';
    nextBtn.disabled = false;
  }

  primaryBtn.addEventListener('click', () => {
    if (answered || !ctx.filled.every(x => x !== null)) return;
    answered = true;
    const answer = ctx.filled.map(i => card.tokens[i]);
    const correct = answer.every((v, i) => v === card.blanks[i]);
    body.querySelectorAll('.blank').forEach((el, i) => {
      el.style.background = answer[i] === card.blanks[i] ? 'rgba(124,224,160,0.2)' : 'rgba(224,90,90,0.2)';
      el.style.borderColor = answer[i] === card.blanks[i] ? 'var(--mint)' : '#e05a5a';
      el.style.color = answer[i] === card.blanks[i] ? 'var(--mint)' : '#e89999';
    });
    fb.className = 'feedback-box show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = correct
      ? '✓ Nicely done — that\'s the correct syntax.'
      : '✗ Expected: <code>' + escapeHtml(card.blanks.join(' … ')) + '</code>';
    if (!correct) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    primaryBtn.textContent = correct ? 'Correct' : 'Answered';
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
  });

  draw();
  updatePrimary();
}

// ============ BUGFIX CARD ============
// card: { type:'bugfix', code: '...', options: ['fix A','fix B','fix C','fix D'], answer: 0, explain: '...' }
function renderBugfix(card) {
  const optsHTML = card.options.map((o, i) =>
    `<button class="quiz-chip code-opt" data-i="${i}">${escapeHtml(o)}</button>`
  ).join('');
  return `
    <div>
      <span class="stage-pill" style="background:#ffe0e6;color:#a1304d;">Bug Fix</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">This code has a bug. Which fix is correct?</div>
    <div class="code-panel">
      <div class="code-header"><span class="fname">script.py</span><span style="color:#e05a5a;font-weight:800">🐞 BUGGY</span></div>
      <div class="code-body">${card.code}</div>
    </div>
    <div class="quiz-chips" id="quiz-chips">${optsHTML}</div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

// ============ REORDER CARD ============
// card: { type:'reorder', prompt:'...', lines: ['line1','line2',...], correctOrder: [2,0,1,...] }
function renderReorder(card) {
  const shuffled = card.lines.map((l, i) => ({ text: l, origIdx: i }));
  // shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  window.__reorder = { items: shuffled, card };
  return `
    <div>
      <span class="stage-pill" style="background:#e0e8ff;color:#2c4a7c;">Reorder</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">${card.prompt}</div>
    <div class="reorder-list" id="reorder-list"></div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function drawReorder() {
  const list = document.getElementById('reorder-list');
  if (!list) return;
  const ctx = window.__reorder;
  list.innerHTML = ctx.items.map((item, i) =>
    `<div class="reorder-line" data-idx="${i}">
      <span class="rl-grip">⠿</span>
      <span class="rl-num">${i + 1}</span>
      <code class="rl-code">${escapeHtml(item.text)}</code>
      <span class="rl-arrows">
        <button class="rl-up" data-idx="${i}" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="rl-down" data-idx="${i}" ${i === ctx.items.length - 1 ? 'disabled' : ''}>▼</button>
      </span>
    </div>`
  ).join('');
  list.querySelectorAll('.rl-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx);
      if (i <= 0) return;
      [ctx.items[i], ctx.items[i - 1]] = [ctx.items[i - 1], ctx.items[i]];
      drawReorder();
    });
  });
  list.querySelectorAll('.rl-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx);
      if (i >= ctx.items.length - 1) return;
      [ctx.items[i], ctx.items[i + 1]] = [ctx.items[i + 1], ctx.items[i]];
      drawReorder();
    });
  });
}

function wireReorder(card) {
  drawReorder();
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');
  const fb = document.getElementById('feedback');
  primaryBtn.disabled = false;
  primaryBtn.textContent = 'Check order';

  primaryBtn.addEventListener('click', () => {
    const ctx = window.__reorder;
    const userOrder = ctx.items.map(it => it.origIdx);
    const correct = userOrder.every((v, i) => v === card.correctOrder[i]);
    const list = document.getElementById('reorder-list');
    list.querySelectorAll('.reorder-line').forEach((el, i) => {
      const isRight = ctx.items[i].origIdx === card.correctOrder[i];
      el.style.borderLeftColor = isRight ? 'var(--mint)' : '#e05a5a';
      el.style.background = isRight ? 'rgba(124,224,160,0.08)' : 'rgba(224,90,90,0.08)';
    });
    fb.className = 'feedback-box show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = correct
      ? '✓ Perfect order!'
      : '✗ Not quite. The correct order was: <code>' + card.correctOrder.map(i => card.lines[i].trim().slice(0, 30)).join(' → ') + '</code>';
    if (!correct) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = false;
  });
}

// ============ OUTPUT CARD (type the output) ============
// card: { type:'output', code:'...', answer:'exact output', explain:'...' }
function renderOutput(card) {
  return `
    <div>
      <span class="stage-pill" style="background:#d9ecdb;color:#2c5f39;">Type Output</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">What does this code print? Type the <strong>exact</strong> output.</div>
    <div class="code-panel">
      <div class="code-header"><span class="fname">script.py</span><span>PREDICT</span></div>
      <div class="code-body">${card.code}</div>
    </div>
    <div class="output-input-wrap">
      <input type="text" class="output-input" id="output-input" placeholder="Type the output..." autocomplete="off" spellcheck="false" />
    </div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function wireOutput(card) {
  const input = document.getElementById('output-input');
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');
  const fb = document.getElementById('feedback');
  primaryBtn.disabled = true;
  primaryBtn.textContent = 'Check';

  input.addEventListener('input', () => {
    primaryBtn.disabled = input.value.trim().length === 0;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !primaryBtn.disabled) primaryBtn.click();
  });

  primaryBtn.addEventListener('click', () => {
    const userAnswer = input.value.trim();
    const expected = card.answer.trim();
    const correct = userAnswer === expected;
    input.disabled = true;
    input.style.borderColor = correct ? 'var(--mint)' : '#e05a5a';
    input.style.color = correct ? 'var(--mint)' : '#e89999';
    fb.className = 'feedback-box show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = correct
      ? '✓ Spot on!'
      : '✗ Expected: <code>' + escapeHtml(expected) + '</code>' + (card.explain ? ' — ' + card.explain : '');
    if (!correct) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = false;
  });
}

// ============ MULTISELECT CARD (choose N answers) ============
// card: { type:'multiselect', prompt:'...', code?:'...', options:['A','B','C','D','E'], answers:[2,3], explain:'...' }
function renderMultiselect(card) {
  const count = card.answers.length;
  const code = card.code ? codePanelHTML(card.code, 'script.py') : '';
  const promptHTML = card.prompt.replace(/\?\?\?/g, '<span class="blank-placeholder">???</span>');
  const optsHTML = card.options.map((o, i) =>
    `<button class="quiz-chip ${card.code_options ? 'code-opt' : ''}" data-i="${i}">${escapeHtml(o)}</button>`
  ).join('');
  return `
    <div>
      <span class="stage-pill test-yourself">Test Yourself</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">${promptHTML}</div>
    ${code}
    <div class="quiz-chips" id="quiz-chips">${optsHTML}</div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function wireMultiselect(card) {
  const count = card.answers.length;
  const picked = new Set();
  const chips = readerEl.querySelectorAll('.quiz-chip');
  const fb = document.getElementById('feedback');
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');
  let answered = false;

  primaryBtn.textContent = 'Choose ' + count + ' answers';

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (answered) return;
      const idx = parseInt(chip.dataset.i);
      if (picked.has(idx)) {
        picked.delete(idx);
        chip.classList.remove('multi-selected');
      } else {
        if (picked.size >= count) return;
        picked.add(idx);
        chip.classList.add('multi-selected');
      }
      const ready = picked.size === count;
      primaryBtn.disabled = !ready;
      primaryBtn.textContent = ready ? 'Check answer' : 'Choose ' + count + ' answers';
      nextBtn.textContent = 'Skip';
      nextBtn.disabled = false;
    });
  });

  primaryBtn.addEventListener('click', () => {
    if (answered || picked.size !== count) return;
    answered = true;
    const pickedArr = Array.from(picked).sort();
    const ansArr = card.answers.slice().sort();
    const correct = pickedArr.length === ansArr.length && pickedArr.every((v, i) => v === ansArr[i]);

    chips.forEach((c, i) => {
      c.disabled = true;
      c.classList.remove('multi-selected');
      if (card.answers.includes(i)) c.classList.add('correct');
      else if (picked.has(i)) c.classList.add('wrong');
    });

    fb.className = 'feedback-box show ' + (correct ? 'good' : 'bad');
    fb.innerHTML = (correct ? '✓ Correct! ' : '✗ Not quite. ') + (card.explain || '');
    if (!correct) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    primaryBtn.textContent = correct ? 'Correct' : 'Answered';
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = false;
  });
}

// ============ FILLIN CARD (type into blanks inside code) ============
// card: { type:'fillin', prompt:'...', code:'... ??? ... ??? ...', answers:['my_house', 'copy'], explain:'...' }
function renderFillin(card) {
  const count = card.answers.length;
  return `
    <div>
      <span class="stage-pill test-yourself">Test Yourself</span>
      ${viewCountHTML(card)}
    </div>
    <div class="quiz-prompt">${card.prompt}</div>
    <div class="fillin-code">
      <div class="code-header">
        <span class="fname">script.py</span>
        <button class="copy-btn" disabled style="opacity:0.4">${ICON.copy}<span>Copy</span></button>
      </div>
      <div class="fillin-body" id="fillin-body"></div>
    </div>
    <div class="feedback-box" id="feedback"></div>
    ${actionRowHTML(card)}`;
}

function wireFillin(card) {
  const body = document.getElementById('fillin-body');
  const fb = document.getElementById('feedback');
  const primaryBtn = document.getElementById('primary-btn');
  const nextBtn = document.getElementById('next-btn');
  let answered = false;

  // Render code with input blanks where ??? appears
  let bi = 0;
  const html = card.code.replace(/\?\?\?/g, () => {
    const idx = bi++;
    const width = Math.max(60, card.answers[idx].length * 12 + 20);
    return `<input type="text" class="fillin-input" data-idx="${idx}" style="width:${width}px" autocomplete="off" spellcheck="false" placeholder="???">`;
  });
  body.innerHTML = html;

  primaryBtn.textContent = 'Type in ' + card.answers.length + ' answer' + (card.answers.length > 1 ? 's' : '');
  primaryBtn.disabled = true;

  const inputs = body.querySelectorAll('.fillin-input');
  inputs.forEach(inp => {
    inp.addEventListener('input', () => {
      const allFilled = Array.from(inputs).every(i => i.value.trim().length > 0);
      primaryBtn.disabled = !allFilled || answered;
      if (allFilled && !answered) primaryBtn.textContent = 'Check answer';
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !primaryBtn.disabled) primaryBtn.click();
    });
  });

  primaryBtn.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    let allCorrect = true;
    inputs.forEach((inp, i) => {
      const val = inp.value.trim();
      const expected = card.answers[i];
      const ok = val === expected;
      inp.disabled = true;
      inp.classList.add(ok ? 'correct-input' : 'wrong-input');
      if (!ok) allCorrect = false;
    });
    fb.className = 'feedback-box show ' + (allCorrect ? 'good' : 'bad');
    fb.innerHTML = allCorrect
      ? '✓ Nicely done!'
      : '✗ Expected: <code>' + escapeHtml(card.answers.join(', ')) + '</code>' + (card.explain ? ' — ' + card.explain : '');
    if (!allCorrect) { mistakes++; recordWeakness(currentLesson.id, cardIdx); }
    else if (window.__practiceMode) clearWeakness(currentLesson.id, cardIdx);
    primaryBtn.disabled = true;
    primaryBtn.textContent = allCorrect ? 'Correct' : 'Answered';
    nextBtn.textContent = cardIdx === currentLesson.cards.length - 1 ? 'Finish' : 'Next';
    nextBtn.disabled = false;
  });
}

function advance() {
  cardIdx++;
  if (cardIdx >= currentLesson.cards.length) finishLesson();
  else renderCard();
}

function finishLesson() {
  if (window.__bossMode) return finishBoss();
  if (window.__practiceMode) {
    const drilled = currentLesson.cards.length;
    readerEl.innerHTML = `
      <div class="reader-topbar">
        <div class="reader-topbar-inner">
          <button class="rt-btn" id="rt-back">←</button>
          <div class="rt-spacer"></div>
          <div class="rt-title">Practice Drill</div>
          <div class="rt-spacer"></div>
          <button class="rt-btn" id="rt-close">✕</button>
        </div>
        <div class="reader-progress">${Array.from({length: drilled}, () => '<div class="rp-seg done"></div>').join('')}</div>
      </div>
      <div class="lesson-complete">
        <div class="complete-icon">🎯</div>
        <div class="complete-title">Drill Done</div>
        <div class="complete-sub">${mistakes === 0 ? 'Clean run — weaknesses cleared.' : mistakes + ' still tripped you up. They\'ll stay on the list.'}</div>
        <div class="complete-stats">
          <div class="complete-stat"><div class="cs-val">${drilled}</div><div class="cs-lbl">Drilled</div></div>
          <div class="complete-stat"><div class="cs-val">${drilled - mistakes}</div><div class="cs-lbl">Correct</div></div>
          <div class="complete-stat"><div class="cs-val">${mistakes}</div><div class="cs-lbl">Missed</div></div>
        </div>
      </div>
      <div class="reader-footer">
        <div class="ai-avatar">🎯</div>
        <button class="primary-dark" id="primary-btn">Dismiss</button>
        <button class="white-btn" id="next-btn">Back to Practice</button>
      </div>`;
    document.getElementById('rt-back').addEventListener('click', closeLesson);
    document.getElementById('rt-close').addEventListener('click', closeLesson);
    document.getElementById('primary-btn').addEventListener('click', closeLesson);
    document.getElementById('next-btn').addEventListener('click', () => {
      closeLesson();
      document.querySelector('[data-tab="practice"]').click();
    });
    return;
  }
  const xpGained = Math.max(5, 15 - mistakes * 2);
  state.xp += xpGained;
  const today = new Date().toDateString();
  if (state.lastDay !== today) { state.streak += 1; state.lastDay = today; state.doneToday = 0; }
  state.doneToday = (state.doneToday || 0) + 1;
  state.completed[currentLesson.id] = true;
  // Detect unit completion — fires confetti the first time every lesson in the unit is done.
  const completedUnit = CURRICULUM.find(u => u.lessons.some(l => l.id === currentLesson.id))
    || null;
  const unitJustCompleted = completedUnit
    && completedUnit.lessons.every(l => state.completed[l.id])
    && !(state.unitCelebrated || {})[completedUnit.id];
  if (unitJustCompleted) {
    state.unitCelebrated = state.unitCelebrated || {};
    state.unitCelebrated[completedUnit.id] = true;
    state.xp += 25; // extra bonus for clearing a unit
  }
  saveState(state);
  refreshHeader();

  if (unitJustCompleted) {
    confettiBurst();
    showUnitCompleteBanner(completedUnit);
  }

  const flat = flatLessons();
  const idx = flat.findIndex(l => l.id === currentLesson.id);
  const next = flat[idx + 1];
  const courseComplete = !next;
  const n = currentLesson.cards.length;

  readerEl.innerHTML = `
    <div class="reader-topbar">
      <div class="reader-topbar-inner">
        <button class="rt-btn" id="rt-back">←</button>
        <div class="rt-spacer"></div>
        <div class="rt-title">${currentLesson.title}</div>
        <div class="rt-spacer"></div>
        <button class="rt-btn" id="rt-close">✕</button>
      </div>
      <div class="reader-progress">${Array.from({length: n}, () => '<div class="rp-seg done"></div>').join('')}</div>
    </div>
    <div class="lesson-complete">
      <div class="complete-icon">${courseComplete ? '🏆' : '🎉'}</div>
      <div class="complete-title">${courseComplete ? 'Course Complete!' : 'Lesson Complete!'}</div>
      <div class="complete-sub">${mistakes === 0 ? 'Perfect run — no mistakes.' : mistakes + ' mistake' + (mistakes === 1 ? '' : 's') + ' — you still nailed it.'}</div>
      <div class="complete-stats">
        <div class="complete-stat"><div class="cs-val">+${xpGained}</div><div class="cs-lbl">XP</div></div>
        <div class="complete-stat"><div class="cs-val">${state.streak}</div><div class="cs-lbl">Streak</div></div>
        <div class="complete-stat"><div class="cs-val">${Object.keys(state.completed).length}</div><div class="cs-lbl">Done</div></div>
      </div>
    </div>
    <div class="reader-footer">
      <div class="ai-avatar" id="ai-avatar-btn" title="Ask PyPath AI">✨</div>
      <button class="primary-dark" id="primary-btn">${courseComplete ? 'Share' : 'Review'}</button>
      <button class="white-btn" id="next-btn">${courseComplete ? 'Back to Path' : 'Next Lesson'}</button>
    </div>`;

  document.getElementById('rt-back').addEventListener('click', closeLesson);
  document.getElementById('rt-close').addEventListener('click', closeLesson);
  document.getElementById('next-btn').addEventListener('click', () => {
    if (courseComplete) closeLesson();
    else openLesson(next.id);
  });
  document.getElementById('primary-btn').addEventListener('click', closeLesson);
  wireAiAvatar();
}

// ============ AI MENU (lesson-level AI helper) ============
const AI_MENU_OPTIONS = [
  { id: 'summarise', emoji: '📝', label: 'Summarise' },
  { id: 'ask',       emoji: '💬', label: 'Ask a question' },
  { id: 'eli5',      emoji: '🧒', label: "Explain like I'm 5" },
  { id: 'why',       emoji: '🤔', label: 'Why do I need to know this?' },
  { id: 'example',   emoji: '🌍', label: 'Give a real-world example' },
  { id: 'quiz',      emoji: '🎯', label: 'Quiz me about this' },
];

function wireAiAvatar() {
  const btn = document.getElementById('ai-avatar-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAiMenu();
  });
}

function toggleAiMenu() {
  if (document.getElementById('ai-menu')) { closeAiMenu(); return; }
  const menu = document.createElement('div');
  menu.id = 'ai-menu';
  menu.className = 'ai-menu';
  menu.innerHTML = `
    <div class="ai-menu-header">
      <span class="ai-menu-title">✨ AI Tutor</span>
      <button class="ai-menu-close" id="ai-menu-close" aria-label="Close">×</button>
    </div>
    <div class="ai-menu-list">
      ${AI_MENU_OPTIONS.map(o => `
        <button class="ai-menu-item" data-opt="${o.id}">
          <span class="ai-menu-emoji">${o.emoji}</span>
          <span class="ai-menu-label">${o.label}</span>
        </button>`).join('')}
    </div>`;
  document.body.appendChild(menu);

  document.getElementById('ai-menu-close').addEventListener('click', closeAiMenu);
  menu.querySelectorAll('.ai-menu-item').forEach(b => {
    b.addEventListener('click', () => {
      const opt = b.dataset.opt;
      closeAiMenu();
      openAiResponse(opt);
    });
  });
  setTimeout(() => document.addEventListener('click', outsideAiMenu), 0);
}

function outsideAiMenu(e) {
  const menu = document.getElementById('ai-menu');
  const btn = document.getElementById('ai-avatar-btn');
  if (!menu) { document.removeEventListener('click', outsideAiMenu); return; }
  if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
  closeAiMenu();
}

function closeAiMenu() {
  const menu = document.getElementById('ai-menu');
  if (menu) menu.remove();
  document.removeEventListener('click', outsideAiMenu);
}

function openAiResponse(opt) {
  const card = currentLesson && currentLesson.cards[cardIdx];
  const option = AI_MENU_OPTIONS.find(o => o.id === opt);
  if (!option) return;
  let body = '';
  let canAsk = false;
  switch (opt) {
    case 'summarise': body = generateSummary(card); break;
    case 'ask':       canAsk = true; body = `<p class="ai-hint">Ask anything about <strong>${stripAiHtml(currentLesson?.title || 'this lesson')}</strong>.</p>`; break;
    case 'eli5':      body = generateEli5(card); break;
    case 'why':       body = generateWhy(card); break;
    case 'example':   body = generateExample(card); break;
    case 'quiz':      body = generateAiQuiz(); break;
  }
  showAiModal(option, body, canAsk);
}

function showAiModal(option, body, canAsk) {
  const existing = document.getElementById('ai-modal-overlay');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'ai-modal-overlay';
  modal.className = 'ai-modal-overlay';
  modal.innerHTML = `
    <div class="ai-modal" role="dialog" aria-label="${option.label}">
      <div class="ai-modal-header">
        <div class="ai-modal-title"><span class="ai-modal-emoji">${option.emoji}</span>${option.label}</div>
        <button class="ai-modal-close" id="ai-modal-close" aria-label="Close">×</button>
      </div>
      <div class="ai-modal-body" id="ai-modal-body">${body}</div>
      ${canAsk ? `
        <div class="ai-modal-ask">
          <textarea id="ai-ask-input" class="ai-ask-input" placeholder="Type your question..." rows="2"></textarea>
          <button id="ai-ask-send" class="ai-ask-send">Send</button>
        </div>` : ''}
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('ai-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  if (canAsk) {
    const input = document.getElementById('ai-ask-input');
    const send = document.getElementById('ai-ask-send');
    const bodyEl = document.getElementById('ai-modal-body');
    setTimeout(() => input.focus(), 0);
    const submit = () => {
      const q = input.value.trim();
      if (!q) return;
      bodyEl.insertAdjacentHTML('beforeend', `<div class="ai-chat-user">${escapeHtml(q)}</div>`);
      input.value = '';
      const reply = (typeof tutorReply === 'function') ? tutorReply(q) : "I'm not sure — try rephrasing your question.";
      bodyEl.insertAdjacentHTML('beforeend', `<div class="ai-chat-bot">${reply}</div>`);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    };
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
  }
}

function stripAiHtml(s) { return (s || '').replace(/<[^>]+>/g, ''); }

function aiCardText(card) {
  if (!card) return '';
  const parts = [];
  if (card.title)   parts.push(stripAiHtml(card.title));
  if (card.body)    parts.push(stripAiHtml(card.body));
  if (card.prompt)  parts.push(stripAiHtml(card.prompt));
  if (card.callout) parts.push(stripAiHtml(card.callout));
  return parts.join(' ');
}

function generateSummary(card) {
  const lessonTitle = stripAiHtml(currentLesson?.title || 'This lesson');
  if (!card) return `<p><strong>${lessonTitle}</strong></p><p>You've finished this lesson — great job!</p>`;
  const title = stripAiHtml(card.title || lessonTitle);
  const text = aiCardText(card);
  if (!text) return `<p><strong>${title}</strong></p><p>This is a practice card — try answering it to check what you've learned.</p>`;
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const key = sentences.slice(0, 3);
  const bullets = key.map(s => `<li>${s}</li>`).join('');
  return `<p><strong>${title}</strong></p><ul class="ai-sum-list">${bullets}</ul>`;
}

const AI_TOPIC_KEYS = [
  ['dictionary', 'dictionary'], ['dict', 'dictionary'],
  ['function', 'function'], ['def ', 'function'],
  ['loop', 'loop'], ['for ', 'loop'], ['while', 'loop'],
  ['condition', 'condition'], ['if ', 'condition'], ['elif', 'condition'],
  ['list', 'list'], ['tuple', 'list'],
  ['string', 'string'], ["quote", 'string'],
  ['variable', 'variable'], ['assign', 'variable'],
  ['python', 'python'],
];

function detectTopic(card) {
  const hay = (aiCardText(card) + ' ' + stripAiHtml(currentLesson?.title || '')).toLowerCase();
  for (const [needle, key] of AI_TOPIC_KEYS) if (hay.includes(needle)) return key;
  return null;
}

function generateEli5(card) {
  const topic = stripAiHtml(card?.title || currentLesson?.title || 'this idea');
  const hints = {
    python:     `Python is like giving instructions to a super-patient robot. You tell it exactly what to do, step by step, and it does it without complaining.`,
    variable:   `A variable is a labelled box. You write a name on it (like <code>age</code>) and drop something inside (like <code>12</code>). Later, whenever you say the name, Python peeks in and grabs what's inside.`,
    string:     `A string is just text — anything in quotes, like <code>"hello"</code>. The quotes tell Python "treat this as words, not a number to do maths with".`,
    list:       `A list is a row of drawers. Each drawer holds one thing and they're numbered starting at 0. You can open any drawer by its number.`,
    loop:       `A loop tells the computer to repeat something, like saying "keep stirring the pot until it's done". Instead of writing the same line 100 times, you write it once inside a loop.`,
    function:   `A function is a little machine you build once, then use as many times as you want. You feed it something, it does its job, and hands you back the result.`,
    condition:  `An <code>if</code> is a fork in the road. The computer asks "is this true?" — if yes, it goes one way; if no, it goes the other.`,
    dictionary: `A dictionary is like a phone book. You look up a <em>key</em> (like a name) and get back its <em>value</em> (like a number). Each key has its own value.`,
  };
  const key = detectTopic(card);
  const explain = key ? hints[key] : `Imagine you're teaching a friend who's never coded before. The main idea is simple — we just add details as you get comfy.`;
  return `<p><strong>${topic}</strong></p><p>${explain}</p>`;
}

function generateWhy(card) {
  const topic = stripAiHtml(card?.title || currentLesson?.title || 'this');
  const reasons = {
    python:     `Python powers Google, Netflix, NASA, and Instagram. It's the top language for AI, data science, web backends, and automating boring tasks. Learning it opens doors to nearly every tech career.`,
    variable:   `Variables are the foundation of every program. Without them, code can't remember anything — no usernames, no scores, no settings. Every app on your phone uses thousands of them.`,
    string:     `Strings handle every piece of text your program touches — messages, names, search queries, passwords. Any app that talks to humans uses strings constantly.`,
    list:       `Lists let you work with collections — users, scores, products, messages. Nearly every real-world program juggles lists, so this is essential.`,
    loop:       `Loops turn a computer into a tireless worker. Sending 10,000 emails, processing every pixel in an image, checking every file in a folder — loops do it in seconds.`,
    function:   `Functions keep code clean and reusable. Pros reuse functions instead of copy-pasting — it's the difference between a 100-line script and a 100,000-line app that still makes sense.`,
    condition:  `<code>if</code>-statements are how programs make decisions. Login forms, game logic, recommendation systems — every app branches on conditions.`,
    dictionary: `Dictionaries let you look things up fast. User profiles, settings, caches, JSON responses — they're all dictionaries under the hood.`,
  };
  const key = detectTopic(card);
  const why = key ? reasons[key] : `Every concept here builds toward making you a confident coder. Skipping the basics now means hitting walls later — this is the foundation real developers rely on daily.`;
  return `<p><strong>Why learn ${topic}?</strong></p><p>${why}</p>`;
}

function generateExample(card) {
  const topic = stripAiHtml(card?.title || currentLesson?.title || 'this');
  const examples = {
    python:     `NASA uses Python to analyse data from Mars rovers. Netflix uses it to recommend your next show. Instagram's backend runs on Python. You're learning the language powering the internet.`,
    variable:   `When you log into Instagram, your username sits in a variable. Score counters in games, timers in workout apps, your battery percentage — all variables.`,
    string:     `When you text a friend, the message is a string. Google searches, Netflix show titles, Spotify song names — all strings being passed around and displayed.`,
    list:       `Your Spotify playlist is a list of songs. Your Amazon cart is a list of products. Your inbox is a list of emails. Instagram's feed is a list of posts.`,
    loop:       `Instagram loops to display every post in your feed. A payroll system loops through every employee to calculate pay. A spam filter loops through every email to check it.`,
    function:   `Instagram has a function like <code>likePost(id)</code>. Every time anyone taps the heart, that same function runs. Written once, used billions of times a day.`,
    condition:  `Netflix: "IF user is under 18, hide adult content." Shopping sites: "IF cart total &gt; $50, apply free shipping." Games: "IF health &lt;= 0, show game over."`,
    dictionary: `Your user profile is a dictionary: <code>{ "username": "qanita", "joined": 2024 }</code>. Settings menus, game save files, and API responses are almost always dictionaries.`,
  };
  const key = detectTopic(card);
  const ex = key ? examples[key] : `This shows up in nearly every app you use daily — any feature that tracks, transforms, or displays data is probably built on this concept.`;
  return `<p><strong>Real-world use of ${topic}:</strong></p><p>${ex}</p>`;
}

function generateAiQuiz() {
  const localPool = (currentLesson?.cards || []).filter(c => c.type === 'mc' || c.type === 'predict');
  let pool = localPool;
  if (pool.length === 0 && typeof CURRICULUM !== 'undefined') {
    pool = CURRICULUM.flatMap(u => u.lessons).flatMap(l => l.cards).filter(c => c.type === 'mc' || c.type === 'predict');
  }
  if (!pool.length) return `<p>No quiz questions available for this lesson yet — try a later one!</p>`;
  const c = pool[Math.floor(Math.random() * pool.length)];
  const opts = (c.options || []).map((o, i) =>
    `<div class="ai-quiz-opt"><span class="ai-quiz-letter">${String.fromCharCode(65 + i)}</span>${stripAiHtml(o)}</div>`
  ).join('');
  const answerIdx = typeof c.answer === 'number'
    ? c.answer
    : (Array.isArray(c.answers) ? c.answers[0] : 0);
  const answerLetter = String.fromCharCode(65 + answerIdx);
  return `
    <p class="ai-quiz-q"><strong>${stripAiHtml(c.prompt || 'Quick check:')}</strong></p>
    ${c.code ? `<pre class="ai-quiz-code">${escapeHtml(stripAiHtml(c.code))}</pre>` : ''}
    <div class="ai-quiz-opts">${opts}</div>
    <details class="ai-quiz-answer"><summary>Tap to reveal answer</summary>
      <p>The answer is <strong>${answerLetter}</strong>${c.explanation ? ` — ${stripAiHtml(c.explanation)}` : '.'}</p>
    </details>`;
}

// ---- keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
  if (!readerEl.classList.contains('active')) return;
  if (document.getElementById('ai-modal-overlay')) return;
  if (document.getElementById('ai-menu')) return;
  if (document.getElementById('kw-modal-overlay')) return;

  const active = document.activeElement;
  const inTextField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

  if (e.key === 'ArrowRight') {
    if (inTextField) return;
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && !nextBtn.disabled) { e.preventDefault(); nextBtn.click(); }
  } else if (e.key === 'ArrowLeft') {
    if (inTextField) return;
    const backBtn = document.getElementById('rt-back');
    if (backBtn) { e.preventDefault(); backBtn.click(); }
  } else if (e.key === 'Enter' && !e.shiftKey) {
    const primaryBtn = document.getElementById('primary-btn');
    if (primaryBtn && !primaryBtn.disabled) { e.preventDefault(); primaryBtn.click(); }
  }
});

// ============================================================
// ===================== BOSS FIGHT MODE ======================
// ============================================================
// End-of-unit mixed-review quiz. 10 cards, 5-minute timer, 80% to pass.
// On fail, missed cards are routed straight into Practice.

const BOSS_QUIZ_TYPES = ['mc', 'predict', 'tapfill', 'fillin', 'multiselect', 'bugfix', 'output', 'reorder'];
const BOSS_TOTAL = 10;
const BOSS_SECONDS = 300; // 5 minutes
const BOSS_PASS_PCT = 0.8;

let _bossTimerId = null;
let _bossDeadline = 0;

function openBoss(unitId) {
  const unit = CURRICULUM.find(u => u.id === unitId);
  if (!unit) return;
  const unitDone = unit.lessons.every(l => state.completed[l.id]);
  if (!unitDone) {
    alert(`Finish every lesson in "${unit.title.replace(/^Unit \d+\s*—\s*/, '')}" to unlock the boss.`);
    return;
  }

  // Collect every quiz-type card from the unit, shuffle, take BOSS_TOTAL.
  const pool = [];
  unit.lessons.forEach(l => {
    (l.cards || []).forEach((c, i) => {
      if (BOSS_QUIZ_TYPES.includes(c.type)) {
        pool.push({ lessonId: l.id, cardIdx: i, card: c });
      }
    });
  });
  if (pool.length === 0) {
    alert('No quiz questions in this unit — nothing to fight!');
    return;
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.min(BOSS_TOTAL, pool.length));

  window.__bossMode = {
    unitId,
    unitTitle: unit.title.replace(/^Unit \d+\s*—\s*/, ''),
    total: picked.length,
    sources: picked.map(p => ({ lessonId: p.lessonId, cardIdx: p.cardIdx })),
    missed: [],
  };

  currentLesson = {
    id: '__boss_' + unitId,
    icon: '🔥',
    title: `Boss · ${window.__bossMode.unitTitle}`,
    sub: `${picked.length} questions · 5 min`,
    cards: picked.map(p => p.card),
  };
  cardIdx = 0;
  mistakes = 0;
  _bossDeadline = Date.now() + BOSS_SECONDS * 1000;
  readerEl.classList.add('active');
  renderCard();
}

function mountBossTimer() {
  if (!window.__bossMode) return;
  // Clean up any existing timer
  if (_bossTimerId) { clearInterval(_bossTimerId); _bossTimerId = null; }
  document.getElementById('boss-timer')?.remove();

  const topbar = readerEl.querySelector('.reader-topbar');
  if (!topbar) return;
  const el = document.createElement('div');
  el.id = 'boss-timer';
  el.className = 'boss-timer';
  topbar.appendChild(el);

  const tick = () => {
    const remain = Math.max(0, Math.round((_bossDeadline - Date.now()) / 1000));
    const m = String(Math.floor(remain / 60));
    const s = String(remain % 60).padStart(2, '0');
    const q = (window.__bossMode && cardIdx + 1) || 0;
    const tot = (window.__bossMode && window.__bossMode.total) || 0;
    el.innerHTML = `<span class="bt-icon">🔥</span><span class="bt-time ${remain <= 30 ? 'bt-danger' : ''}">${m}:${s}</span><span class="bt-count">Q ${q} / ${tot}</span>`;
    if (remain <= 0) {
      clearInterval(_bossTimerId); _bossTimerId = null;
      finishBoss(true); // time up
    }
  };
  tick();
  _bossTimerId = setInterval(tick, 500);
}

function teardownBossTimer() {
  if (_bossTimerId) { clearInterval(_bossTimerId); _bossTimerId = null; }
  document.getElementById('boss-timer')?.remove();
}

// Track misses at the card level so we can route them to Practice on failure.
// Hook into the existing recordWeakness to also capture the boss's miss list.
const _origRecordWeakness = recordWeakness;
recordWeakness = function (lessonId, cardIdxArg) {
  if (window.__bossMode) {
    // lessonId here will be the synthetic boss id — map back to the source card.
    const src = window.__bossMode.sources[cardIdxArg];
    if (src) {
      window.__bossMode.missed.push(src);
      // Also track weakness on the REAL lesson/card so it shows in Practice.
      return _origRecordWeakness(src.lessonId, src.cardIdx);
    }
    return;
  }
  return _origRecordWeakness(lessonId, cardIdxArg);
};

function finishBoss(timeout = false) {
  teardownBossTimer();
  const b = window.__bossMode;
  if (!b) return;

  const answered = timeout ? cardIdx : b.total;
  const correct = Math.max(0, answered - mistakes);
  const pct = b.total > 0 ? correct / b.total : 0;
  const passed = pct >= BOSS_PASS_PCT && !timeout;

  // Persist best
  state.bossBests = state.bossBests || {};
  const best = state.bossBests[b.unitId];
  if (!best || correct > best.score) {
    state.bossBests[b.unitId] = { score: correct, total: b.total, date: Date.now() };
  }
  if (passed) {
    state.bossesDone = state.bossesDone || {};
    if (!state.bossesDone[b.unitId]) {
      state.bossesDone[b.unitId] = true;
      state.xp = (state.xp || 0) + 50;
    }
  }
  saveState(state);
  refreshHeader();
  updatePet();

  const uniqMissed = (() => {
    const seen = new Set();
    return b.missed.filter(m => {
      const k = m.lessonId + ':' + m.cardIdx;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  })();

  const icon = passed ? '👑' : (timeout ? '⏰' : '💀');
  const title = passed ? 'Boss defeated!' : (timeout ? 'Time\'s up' : 'Not quite');
  const sub = passed
    ? `${correct}/${b.total} correct · +50 XP`
    : `${correct}/${b.total} · need ${Math.ceil(b.total * BOSS_PASS_PCT)} to pass`;

  readerEl.innerHTML = `
    <div class="reader-topbar">
      <div class="reader-topbar-inner">
        <button class="rt-btn" id="rt-back">←</button>
        <div class="rt-spacer"></div>
        <div class="rt-title">Boss · ${b.unitTitle}</div>
        <div class="rt-spacer"></div>
        <button class="rt-btn" id="rt-close">✕</button>
      </div>
    </div>
    <div class="lesson-complete boss-result ${passed ? 'win' : 'lose'}">
      <div class="complete-icon">${icon}</div>
      <div class="complete-title">${title}</div>
      <div class="complete-sub">${sub}</div>
      <div class="complete-stats">
        <div class="complete-stat"><div class="cs-val">${correct}/${b.total}</div><div class="cs-lbl">Score</div></div>
        <div class="complete-stat"><div class="cs-val">${Math.round(pct * 100)}%</div><div class="cs-lbl">Accuracy</div></div>
        <div class="complete-stat"><div class="cs-val">${passed ? '+50' : '0'}</div><div class="cs-lbl">XP</div></div>
      </div>
      ${!passed && uniqMissed.length ? `<p class="boss-tip">Hit "Drill weak spots" to replay the questions you missed.</p>` : ''}
    </div>
    <div class="reader-footer">
      <div class="ai-avatar">${passed ? '🏆' : '🎯'}</div>
      <button class="primary-dark" id="primary-btn">${passed ? 'Back to Path' : (uniqMissed.length ? 'Drill weak spots' : 'Try again')}</button>
      <button class="white-btn" id="next-btn">Done</button>
    </div>`;

  if (passed) confettiBurst();

  document.getElementById('rt-back').addEventListener('click', exitBoss);
  document.getElementById('rt-close').addEventListener('click', exitBoss);
  document.getElementById('next-btn').addEventListener('click', exitBoss);
  document.getElementById('primary-btn').addEventListener('click', () => {
    const sources = uniqMissed.slice();
    exitBoss();
    if (passed) {
      // Already back on path
    } else if (sources.length) {
      // Jump directly into practice with the missed cards.
      startPractice(sources);
    } else {
      // No saved misses — reopen the boss
      openBoss(b.unitId);
    }
  });
}

function exitBoss() {
  window.__bossMode = null;
  teardownBossTimer();
  readerEl.classList.remove('active');
  readerEl.innerHTML = '';
  currentLesson = null;
  renderPath();
}

// ---- confetti (lightweight, no dependency) ----
function confettiBurst() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4a9eff', '#b06bff'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 3,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -12 - 4,
    g: 0.35 + Math.random() * 0.2,
    s: 6 + Math.random() * 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frames = 0;
  const maxFrames = 140;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });
    frames++;
    if (frames < maxFrames) requestAnimationFrame(draw);
    else canvas.remove();
  })();
}

// ============================================================
// ======================= PET MASCOT =========================
// ============================================================
// Floating Kirby-style buddy that levels with XP, wilts if idle.
// Click to rename / view stats. Hide via the overflow menu.

const PET_XP_PER_LEVEL = 150;
const PET_EVOLUTIONS = [
  { min: 1,  emoji: '🐣', name: 'Egg'    },
  { min: 2,  emoji: '🐥', name: 'Chick'  },
  { min: 5,  emoji: '🐤', name: 'Fledgling' },
  { min: 10, emoji: '🦆', name: 'Duck'   },
  { min: 15, emoji: '🦚', name: 'Peacock' },
  { min: 20, emoji: '🐲', name: 'Dragon' },
  { min: 30, emoji: '🔥', name: 'Phoenix' },
];

function petLevel() {
  return Math.max(1, Math.floor((state.xp || 0) / PET_XP_PER_LEVEL) + 1);
}
function petStage() {
  const lvl = petLevel();
  let stage = PET_EVOLUTIONS[0];
  for (const s of PET_EVOLUTIONS) { if (lvl >= s.min) stage = s; }
  return stage;
}
function daysSinceActivity() {
  if (!state.lastDay) return 999;
  const last = new Date(state.lastDay);
  const today = new Date();
  last.setHours(0,0,0,0); today.setHours(0,0,0,0);
  return Math.round((today - last) / 86400000);
}
function petMood() {
  const days = daysSinceActivity();
  if (days === 0) return { key: 'happy',   face: '😊', tint: '#7ce0a0' };
  if (days === 1) return { key: 'neutral', face: '🙂', tint: '#ffd93d' };
  if (days === 2) return { key: 'sleepy',  face: '😴', tint: '#8aa0c2' };
  return { key: 'sad', face: '🥀', tint: '#e89999' };
}

function renderPetWidget() {
  if (state.petHidden) {
    document.getElementById('pet-widget')?.remove();
    let restore = document.getElementById('pet-restore');
    if (!restore) {
      restore = document.createElement('button');
      restore.id = 'pet-restore';
      restore.className = 'pet-restore';
      restore.title = 'Bring back your pet';
      restore.textContent = '🐥';
      restore.addEventListener('click', () => {
        state.petHidden = false;
        saveState(state);
        restore.remove();
        renderPetWidget();
      });
      document.body.appendChild(restore);
    }
    return;
  }
  document.getElementById('pet-restore')?.remove();
  let w = document.getElementById('pet-widget');
  if (!w) {
    w = document.createElement('div');
    w.id = 'pet-widget';
    w.className = 'pet-widget';
    document.body.appendChild(w);
    w.addEventListener('click', openPetPanel);
  }
  const stage = petStage();
  const mood = petMood();
  const lvl = petLevel();
  const xpInLvl = (state.xp || 0) - (lvl - 1) * PET_XP_PER_LEVEL;
  const pct = Math.min(100, Math.round((xpInLvl / PET_XP_PER_LEVEL) * 100));
  const name = state.petName || 'Pip';
  w.innerHTML = `
    <div class="pet-avatar pet-mood-${mood.key}" style="--pet-tint:${mood.tint}">
      <span class="pet-emoji">${stage.emoji}</span>
      <span class="pet-mood-face">${mood.face}</span>
    </div>
    <div class="pet-meta">
      <div class="pet-name">${escapeHtml(name)}</div>
      <div class="pet-level">Lv ${lvl}</div>
    </div>
    <div class="pet-xpbar"><div class="pet-xpbar-fill" style="width:${pct}%"></div></div>
  `;
}

function openPetPanel() {
  const existing = document.getElementById('pet-panel-overlay');
  if (existing) { existing.remove(); return; }

  const stage = petStage();
  const mood = petMood();
  const lvl = petLevel();
  const xpInLvl = (state.xp || 0) - (lvl - 1) * PET_XP_PER_LEVEL;
  const name = state.petName || 'Pip';
  const days = daysSinceActivity();
  const moodText = {
    happy: 'Bouncing with energy. Keep the streak up!',
    neutral: 'Doing fine — a lesson today would cheer them up.',
    sleepy: 'Getting drowsy. 2 days without activity.',
    sad: 'Wilting. Please come back and learn something!',
  }[mood.key];
  const nextEv = PET_EVOLUTIONS.find(e => e.min > lvl);
  const evText = nextEv ? `Next evolution at Lv ${nextEv.min} · ${nextEv.emoji} ${nextEv.name}` : 'Final form reached 🏆';

  const overlay = document.createElement('div');
  overlay.id = 'pet-panel-overlay';
  overlay.className = 'pet-panel-overlay';
  overlay.innerHTML = `
    <div class="pet-panel">
      <button class="pet-close" aria-label="Close">×</button>
      <div class="pet-panel-avatar pet-mood-${mood.key}" style="--pet-tint:${mood.tint}">
        <span class="pet-panel-emoji">${stage.emoji}</span>
        <span class="pet-panel-mood">${mood.face}</span>
      </div>
      <input class="pet-name-input" maxlength="16" value="${escapeHtml(name)}">
      <div class="pet-panel-stage">${stage.name} · Level ${lvl}</div>
      <div class="pet-panel-mood-text">${moodText}</div>
      <div class="pet-panel-grid">
        <div class="pet-panel-stat"><div class="pps-val">${state.xp || 0}</div><div class="pps-lbl">Total XP</div></div>
        <div class="pet-panel-stat"><div class="pps-val">${state.streak || 0}</div><div class="pps-lbl">Streak</div></div>
        <div class="pet-panel-stat"><div class="pps-val">${days === 999 ? '∞' : days}d</div><div class="pps-lbl">Since last</div></div>
      </div>
      <div class="pet-panel-xp"><div class="pet-panel-xp-lbl">${xpInLvl} / ${PET_XP_PER_LEVEL} XP</div><div class="pet-panel-xp-bar"><div class="pet-panel-xp-fill" style="width:${Math.min(100, (xpInLvl / PET_XP_PER_LEVEL) * 100)}%"></div></div></div>
      <div class="pet-panel-evo">${evText}</div>
      <div class="pet-panel-actions">
        <button class="pet-action" id="pet-hide">Hide pet</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.pet-close').addEventListener('click', () => overlay.remove());
  const nameInput = overlay.querySelector('.pet-name-input');
  nameInput.addEventListener('change', () => {
    const v = nameInput.value.trim().slice(0, 16) || 'Pip';
    state.petName = v;
    saveState(state);
    renderPetWidget();
  });
  overlay.querySelector('#pet-hide').addEventListener('click', () => {
    if (!confirm('Hide your pet? You can bring them back from Stats.')) return;
    state.petHidden = true;
    saveState(state);
    overlay.remove();
    renderPetWidget();
  });
}

function updatePet() {
  const prevLevel = window.__lastPetLevel ?? petLevel();
  renderPetWidget();
  const newLevel = petLevel();
  if (newLevel > prevLevel) {
    petBounce(true);
  } else {
    petBounce(false);
  }
  window.__lastPetLevel = newLevel;
}

function petBounce(big) {
  const w = document.getElementById('pet-widget');
  if (!w) return;
  w.classList.remove('bounce', 'bounce-big');
  void w.offsetWidth;
  w.classList.add(big ? 'bounce-big' : 'bounce');
  if (big) {
    // Level up notice
    const note = document.createElement('div');
    note.className = 'pet-levelup';
    note.textContent = `Lv ${petLevel()}!`;
    w.appendChild(note);
    setTimeout(() => note.remove(), 1500);
  }
}

// Patch refreshHeader so pet updates on XP changes
const _origRefreshHeader = refreshHeader;
refreshHeader = function () {
  _origRefreshHeader();
  updatePet();
};

// ============================================================
// ======================= CODE DIFF ==========================
// ============================================================
// Starter code that works. A goal that's a small tweak away.
// User edits; we run via Pyodide and diff stdout against the expected.

const CODE_DIFF_CHALLENGES = [
  {
    title: 'Reverse the countdown',
    goal: 'Make this count DOWN from 5 to 1 instead of up from 1 to 5.',
    starter: 'for i in range(1, 6):\n    print(i)\n',
    expected: '5\n4\n3\n2\n1',
    hint: 'Check range(start, stop, step). A negative step counts backwards.',
  },
  {
    title: 'Squares, not doubles',
    goal: 'This prints each number doubled. Change it so it prints each number squared instead.',
    starter: 'for n in [1, 2, 3, 4]:\n    print(n * 2)\n',
    expected: '1\n4\n9\n16',
    hint: 'n * 2 doubles. n ** 2 squares.',
  },
  {
    title: 'Only the evens',
    goal: 'Print ONLY the even numbers from 1 to 10.',
    starter: 'for n in range(1, 11):\n    print(n)\n',
    expected: '2\n4\n6\n8\n10',
    hint: 'Guard with `if n % 2 == 0:` — n is even when it has no remainder mod 2.',
  },
  {
    title: 'Word length table',
    goal: 'Print each word followed by its length, like "hello: 5".',
    starter: 'words = ["hi", "hello", "world"]\nfor w in words:\n    print(w)\n',
    expected: 'hi: 2\nhello: 5\nworld: 5',
    hint: 'Use an f-string: f"{w}: {len(w)}"',
  },
  {
    title: 'Sum it up',
    goal: 'Instead of printing each number, print the TOTAL of 1 through 5.',
    starter: 'for n in range(1, 6):\n    print(n)\n',
    expected: '15',
    hint: 'Accumulate into a variable, print after the loop. Or use sum(range(1, 6)).',
  },
  {
    title: 'Uppercase names',
    goal: 'Print each name in ALL CAPS.',
    starter: 'names = ["ada", "bob", "charlie"]\nfor n in names:\n    print(n)\n',
    expected: 'ADA\nBOB\nCHARLIE',
    hint: 'Strings have an .upper() method.',
  },
  {
    title: 'Swap keys & values',
    goal: 'Build a dict with keys and values swapped, then print it.',
    starter: 'prices = {"apple": 1, "banana": 2}\nprint(prices)\n',
    expected: "{1: 'apple', 2: 'banana'}",
    hint: '{v: k for k, v in prices.items()}',
  },
  {
    title: 'Count the letters',
    goal: 'Print just the NUMBER of letters in the sentence (excluding spaces).',
    starter: 'sentence = "hello world"\nprint(sentence)\n',
    expected: '10',
    hint: 'len(sentence.replace(" ", ""))',
  },
];

async function ensurePyodide(statusEl) {
  if (_pyodide) return _pyodide;
  if (statusEl) statusEl.textContent = 'loading Python (~10MB first time)…';
  if (!_pyodideLoading) {
    _pyodideLoading = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
    document.head.appendChild(script);
    await new Promise((res, rej) => { script.onload = res; script.onerror = rej; });
  }
  _pyodide = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
  return _pyodide;
}

function openCodeDiff() {
  let idx = Math.floor(Math.random() * CODE_DIFF_CHALLENGES.length);
  const solved = new Set();

  const modal = document.createElement('div');
  modal.className = 'cd-modal';
  modal.innerHTML = `
    <div class="cd-modal-inner">
      <button class="cd-close" id="cd-close">×</button>
      <div class="cd-header">
        <div class="cd-title">🔀 Code Diff</div>
        <div class="cd-sub" id="cd-challenge-title"></div>
        <div class="cd-progress" id="cd-progress"></div>
      </div>
      <div class="cd-goal" id="cd-goal"></div>
      <div class="cd-editor-wrap">
        <div class="cd-editor-head">
          <span>your code</span>
          <div>
            <button class="cd-mini-btn" id="cd-reset">RESET</button>
            <button class="cd-mini-btn" id="cd-hint">HINT</button>
          </div>
        </div>
        <textarea class="cd-editor" id="cd-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
      </div>
      <div class="cd-io-grid">
        <div class="cd-io-box">
          <div class="cd-io-head">your output</div>
          <pre class="cd-io" id="cd-actual">—</pre>
        </div>
        <div class="cd-io-box">
          <div class="cd-io-head">expected</div>
          <pre class="cd-io cd-expected" id="cd-expected"></pre>
        </div>
      </div>
      <div class="cd-status" id="cd-status"></div>
      <div class="cd-actions">
        <button class="cd-btn secondary" id="cd-skip">Skip</button>
        <button class="cd-btn primary" id="cd-run">▶ Run</button>
        <button class="cd-btn primary" id="cd-next" style="display:none">Next →</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const editor = modal.querySelector('#cd-editor');
  const goalEl = modal.querySelector('#cd-goal');
  const titleEl = modal.querySelector('#cd-challenge-title');
  const progEl = modal.querySelector('#cd-progress');
  const expectedEl = modal.querySelector('#cd-expected');
  const actualEl = modal.querySelector('#cd-actual');
  const statusEl = modal.querySelector('#cd-status');
  const runBtn = modal.querySelector('#cd-run');
  const nextBtn = modal.querySelector('#cd-next');
  const hintBtn = modal.querySelector('#cd-hint');

  function loadChallenge() {
    const c = CODE_DIFF_CHALLENGES[idx];
    titleEl.textContent = c.title;
    goalEl.textContent = c.goal;
    editor.value = c.starter;
    expectedEl.textContent = c.expected;
    actualEl.textContent = '—';
    statusEl.textContent = '';
    statusEl.className = 'cd-status';
    nextBtn.style.display = 'none';
    runBtn.style.display = '';
    progEl.textContent = `Solved ${solved.size} / ${CODE_DIFF_CHALLENGES.length}`;
  }
  loadChallenge();

  // tab indentation
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart, en = editor.selectionEnd;
      editor.value = editor.value.slice(0, s) + '    ' + editor.value.slice(en);
      editor.selectionStart = editor.selectionEnd = s + 4;
    }
  });

  modal.querySelector('#cd-reset').addEventListener('click', () => {
    editor.value = CODE_DIFF_CHALLENGES[idx].starter;
  });
  hintBtn.addEventListener('click', () => {
    statusEl.textContent = '💡 ' + CODE_DIFF_CHALLENGES[idx].hint;
    statusEl.className = 'cd-status cd-hint-msg';
  });

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    statusEl.textContent = '';
    statusEl.className = 'cd-status';
    try {
      await ensurePyodide(statusEl);
      const buf = [];
      _pyodide.setStdout({ batched: (s) => buf.push(s) });
      _pyodide.setStderr({ batched: (s) => buf.push(s) });
      statusEl.textContent = 'running…';
      await _pyodide.runPythonAsync(editor.value);
      const actual = buf.join('\n').trim();
      actualEl.textContent = actual || '(no output)';
      const expected = CODE_DIFF_CHALLENGES[idx].expected.trim();
      if (actual === expected) {
        statusEl.textContent = '🎉 Correct! +15 XP';
        statusEl.className = 'cd-status cd-ok';
        if (!solved.has(idx)) {
          solved.add(idx);
          state.xp = (state.xp || 0) + 15;
          saveState(state);
          refreshHeader();
        }
        progEl.textContent = `Solved ${solved.size} / ${CODE_DIFF_CHALLENGES.length}`;
        runBtn.style.display = 'none';
        nextBtn.style.display = '';
      } else {
        statusEl.textContent = "Not yet — outputs don't match.";
        statusEl.className = 'cd-status cd-err';
      }
    } catch (e) {
      actualEl.textContent = String(e.message || e);
      statusEl.textContent = 'Python error — read the message above.';
      statusEl.className = 'cd-status cd-err';
    } finally {
      runBtn.disabled = false;
    }
  });

  nextBtn.addEventListener('click', () => {
    // pick a non-solved challenge if any remain, else random
    const remaining = CODE_DIFF_CHALLENGES.map((_, i) => i).filter(i => !solved.has(i));
    idx = remaining.length
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : Math.floor(Math.random() * CODE_DIFF_CHALLENGES.length);
    loadChallenge();
  });

  const close = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('#cd-close').addEventListener('click', close);
  modal.querySelector('#cd-skip').addEventListener('click', () => {
    idx = (idx + 1) % CODE_DIFF_CHALLENGES.length;
    loadChallenge();
  });
}

// ============================================================
// ===================== CONSTELLATION MAP ====================
// ============================================================
// Every lesson = a star. Completed lessons shine bright.
// Each unit forms a constellation cluster.

function openConstellation() {
  const modal = document.createElement('div');
  modal.className = 'sky-modal';
  modal.innerHTML = `
    <div class="sky-modal-inner">
      <button class="sky-close" id="sky-close">×</button>
      <div class="sky-header">
        <div>
          <div class="sky-title">✨ Constellation Map</div>
          <div class="sky-sub" id="sky-sub"></div>
        </div>
      </div>
      <div class="sky-canvas" id="sky-canvas"></div>
      <div class="sky-legend">
        <span><span class="sky-dot dim"></span>unlearned</span>
        <span><span class="sky-dot next"></span>next up</span>
        <span><span class="sky-dot bright"></span>mastered</span>
        <span><span class="sky-dot boss"></span>boss beaten</span>
      </div>
      <div class="sky-tooltip" id="sky-tooltip"></div>
    </div>`;
  document.body.appendChild(modal);

  const canvas = modal.querySelector('#sky-canvas');
  const tooltip = modal.querySelector('#sky-tooltip');
  const subEl = modal.querySelector('#sky-sub');

  const done = Object.keys(state.completed || {}).length;
  const totalLessons = CURRICULUM.reduce((n, u) => n + u.lessons.length, 0);
  const bossesBeaten = Object.keys(state.bossesDone || {}).length;
  subEl.textContent = `${done} / ${totalLessons} stars lit · ${bossesBeaten} bosses defeated`;

  const nextId = nextLessonId();

  // Lay out constellations: one cluster per unit
  const W = canvas.clientWidth || 800;
  const H = canvas.clientHeight || 600;

  // Place cluster centers in a loose grid
  const n = CURRICULUM.length;
  const cols = Math.ceil(Math.sqrt(n * W / H));
  const rows = Math.ceil(n / cols);
  const cellW = W / cols;
  const cellH = H / rows;

  // Sprinkle tiny background stars for atmosphere
  const bgStars = 120;
  const bgFrag = document.createDocumentFragment();
  for (let i = 0; i < bgStars; i++) {
    const s = document.createElement('div');
    s.className = 'sky-bg-star';
    s.style.left = (Math.random() * 100) + '%';
    s.style.top = (Math.random() * 100) + '%';
    s.style.opacity = (0.15 + Math.random() * 0.45).toFixed(2);
    s.style.animationDelay = (Math.random() * 4) + 's';
    bgFrag.appendChild(s);
  }
  canvas.appendChild(bgFrag);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'sky-lines');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  canvas.appendChild(svg);

  // Seeded random so star positions are stable across renders
  function seeded(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  CURRICULUM.forEach((u, ui) => {
    const col = ui % cols;
    const row = Math.floor(ui / cols);
    const cx = (col + 0.5) * cellW;
    const cy = (row + 0.5) * cellH;
    const rand = seeded(ui * 131 + 7);

    // Position each lesson on a rough circle with jitter
    const radius = Math.min(cellW, cellH) * 0.35;
    const lessonPositions = u.lessons.map((l, li) => {
      const angle = (li / u.lessons.length) * Math.PI * 2 + (ui * 0.3);
      const jitter = radius * 0.35;
      const r = radius * (0.6 + rand() * 0.5);
      return {
        x: cx + Math.cos(angle) * r + (rand() - 0.5) * jitter,
        y: cy + Math.sin(angle) * r + (rand() - 0.5) * jitter,
        lesson: l,
      };
    });

    // Draw constellation lines connecting completed stars in order
    const completedPath = lessonPositions.filter(p => state.completed[p.lesson.id]);
    if (completedPath.length >= 2) {
      const d = completedPath.map((p, i) =>
        (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)
      ).join(' ');
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'sky-link');
      svg.appendChild(path);
    }

    // Unit label near the cluster center
    const label = document.createElement('div');
    label.className = 'sky-cluster-label';
    label.textContent = u.title.replace(/^Unit \d+\s*—\s*/, '').slice(0, 20);
    label.style.left = (cx / W * 100) + '%';
    label.style.top = (cy / H * 100) + '%';
    canvas.appendChild(label);

    // Draw lesson stars
    lessonPositions.forEach((p) => {
      const star = document.createElement('div');
      const isDone = !!state.completed[p.lesson.id];
      const isNext = p.lesson.id === nextId;
      star.className = 'sky-star ' + (isDone ? 'bright' : (isNext ? 'next' : 'dim'));
      star.style.left = (p.x / W * 100) + '%';
      star.style.top = (p.y / H * 100) + '%';
      star.dataset.lesson = p.lesson.id;
      star.dataset.name = p.lesson.title;
      star.dataset.unit = u.title.replace(/^Unit \d+\s*—\s*/, '');
      canvas.appendChild(star);
    });

    // Boss star at the cluster center
    const bossDone = !!(state.bossesDone || {})[u.id];
    const allDone = u.lessons.every(l => state.completed[l.id]);
    const boss = document.createElement('div');
    boss.className = 'sky-boss ' + (bossDone ? 'beaten' : (allDone ? 'ready' : 'locked'));
    boss.style.left = (cx / W * 100) + '%';
    boss.style.top = (cy / H * 100) + '%';
    boss.textContent = bossDone ? '👑' : (allDone ? '🔥' : '');
    boss.title = 'Boss: ' + u.title;
    canvas.appendChild(boss);
  });

  // Tooltip on hover/tap
  const showTip = (starEl, evt) => {
    tooltip.textContent = `${starEl.dataset.name} · ${starEl.dataset.unit}`;
    tooltip.classList.add('show');
    const rect = canvas.getBoundingClientRect();
    tooltip.style.left = (evt.clientX - rect.left + 12) + 'px';
    tooltip.style.top  = (evt.clientY - rect.top - 30) + 'px';
  };
  const hideTip = () => tooltip.classList.remove('show');
  canvas.addEventListener('mousemove', (e) => {
    const t = e.target.closest('.sky-star');
    if (t) showTip(t, e);
    else hideTip();
  });
  canvas.addEventListener('mouseleave', hideTip);
  canvas.addEventListener('click', (e) => {
    const t = e.target.closest('.sky-star');
    if (!t) return;
    const id = t.dataset.lesson;
    close();
    openLesson(id);
    // Make sure path tab is visible so reader doesn't float over nothing
    document.querySelector('[data-tab="path"]')?.click();
  });

  const close = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('#sky-close').addEventListener('click', close);
}

// ============================================================
// ==================== UNIT COMPLETE BANNER ==================
// ============================================================
// Toasts in after the confetti fires on the last lesson of a unit.

function showUnitCompleteBanner(unit) {
  const prev = document.querySelector('.unit-complete-banner');
  if (prev) prev.remove();

  const unitTitle = unit.title.replace(/^Unit \d+\s*—\s*/, '');
  const unitNum = CURRICULUM.findIndex(u => u.id === unit.id) + 1;
  const el = document.createElement('div');
  el.className = 'unit-complete-banner';
  el.innerHTML = `
    <div class="ucb-emoji">🎉</div>
    <div class="ucb-body">
      <div class="ucb-title">Unit ${unitNum} complete!</div>
      <div class="ucb-sub">${unitTitle} · +25 bonus XP · boss unlocked 🔥</div>
    </div>
    <button class="ucb-close" aria-label="Dismiss">×</button>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const dismiss = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  };
  el.querySelector('.ucb-close').addEventListener('click', dismiss);
  setTimeout(dismiss, 6000);
}

// ============================================================
// ==================== MORE LIKE THIS ========================
// ============================================================
// "Give me 5 more cards that look like this one." Pulls same-type cards
// from the same unit (or widens if sparse) and launches a practice drill.

const MLT_DRILL_SIZE = 5;
const MLT_ELIGIBLE_TYPES = ['mc', 'predict', 'tapfill', 'fillin', 'multiselect', 'bugfix', 'output', 'reorder'];

function findSimilarCards(card, fromLessonId) {
  if (!MLT_ELIGIBLE_TYPES.includes(card.type)) return [];

  // Find the unit that owns this lesson (synthetic lesson ids like __boss_u25 fall back to all)
  const unit = CURRICULUM.find(u => u.lessons.some(l => l.id === fromLessonId));
  const candidates = [];
  const pushFrom = (lessons) => {
    lessons.forEach(l => {
      (l.cards || []).forEach((c, i) => {
        if (c === card) return; // skip the exact card
        if (c.type !== card.type) return;
        // Extra filter for mc/predict: rough theme similarity via shared keywords in prompt
        candidates.push({ lessonId: l.id, cardIdx: i, card: c });
      });
    });
  };

  if (unit) pushFrom(unit.lessons);

  // If not enough in-unit, widen to the same card-type across whole curriculum
  if (candidates.length < MLT_DRILL_SIZE) {
    const seen = new Set(candidates.map(c => c.lessonId + ':' + c.cardIdx));
    CURRICULUM.forEach(u => {
      if (unit && u.id === unit.id) return; // already added
      u.lessons.forEach(l => {
        (l.cards || []).forEach((c, i) => {
          if (c === card) return;
          if (c.type !== card.type) return;
          const k = l.id + ':' + i;
          if (seen.has(k)) return;
          candidates.push({ lessonId: l.id, cardIdx: i, card: c });
          seen.add(k);
        });
      });
    });
  }

  // Shuffle (Fisher-Yates)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, MLT_DRILL_SIZE);
}

function mountMoreLikeThis() {
  // Called from renderCard after the body is in place. Inserts a pre-hidden
  // "More like this" button into the feedback area via a MutationObserver.
  if (!currentLesson) return;
  const card = currentLesson.cards[cardIdx];
  if (!MLT_ELIGIBLE_TYPES.includes(card.type)) return;

  const fb = document.getElementById('feedback');
  if (!fb) return;

  const existing = fb.querySelector('.mlt-btn');
  if (existing) existing.remove();

  const inject = () => {
    if (fb.querySelector('.mlt-btn')) return;
    // Only inject when feedback is actually visible (answered state)
    if (!fb.classList.contains('show')) return;

    // Figure out what lesson id to use — during a boss/practice synth, map back to the source
    let srcLessonId = currentLesson.id;
    if (window.__bossMode && window.__bossMode.sources && window.__bossMode.sources[cardIdx]) {
      srcLessonId = window.__bossMode.sources[cardIdx].lessonId;
    } else if (window.__practiceEntries && window.__practiceEntries[cardIdx]) {
      srcLessonId = window.__practiceEntries[cardIdx].lessonId;
    }

    const similar = findSimilarCards(card, srcLessonId);
    if (similar.length === 0) return;

    const btn = document.createElement('button');
    btn.className = 'mlt-btn';
    btn.innerHTML = `🔁 <span>More like this</span> <span class="mlt-count">${similar.length}</span>`;
    btn.title = `Drill ${similar.length} cards that match this pattern`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startPractice(similar.map(s => ({ lessonId: s.lessonId, cardIdx: s.cardIdx })));
    });
    fb.appendChild(btn);
  };

  // Inject now if already shown, else watch for class change
  if (fb.classList.contains('show')) inject();
  const obs = new MutationObserver(() => inject());
  obs.observe(fb, { attributes: true, attributeFilter: ['class'] });
  // Auto-clean on reader close / advance
  fb.__mltObs = obs;
}

// Hook into renderCard so every card installs the observer.
const _origRenderCard = renderCard;
renderCard = function () {
  _origRenderCard.apply(this, arguments);
  mountMoreLikeThis();
};

// ---- boot ----
refreshHeader();
renderPath();
window.__lastPetLevel = petLevel();
renderPetWidget();
