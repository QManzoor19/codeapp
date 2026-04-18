// ========= MULTI-LANGUAGE COURSES =========
// Each course has an id, name, icon, color, and a list of sections.
// Each section contains lessons. Only Python has full lesson content (in lessons.js).
// Other languages have stub cards that teach the basics.

const COURSES = [
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    color: '#4b8bf5',
    tagline: 'Beginner-friendly, powerful, everywhere.',
    sections: [
      { id: 's-basics',     name: 'Python Basics',        lessonIds: ['l1', 'l2', 'l3'] },
      { id: 's-types',      name: 'Types & Comparisons',  lessonIds: ['l4', 'l5'] },
      { id: 's-cond',       name: 'Conditional Statements', lessonIds: ['l6'] },
      { id: 's-loops',      name: 'Loops',                lessonIds: ['l8', 'l9'] },
      { id: 's-lists',      name: 'Lists',                lessonIds: ['l7'] },
      { id: 's-listops',    name: 'List Operations',      lessonIds: ['l18', 'l20'] },
      { id: 's-dicts',      name: 'Dictionaries & Sets',  lessonIds: ['l19', 'l21'] },
      { id: 's-funcs',      name: 'Functions',            lessonIds: ['l10', 'l11', 'l12'] },
      { id: 's-scope',      name: 'Scope & Lambdas',      lessonIds: ['l13', 'l14'] },
      { id: 's-strings',    name: 'Strings Deep Dive',    lessonIds: ['l15', 'l16', 'l17'] },
      { id: 's-errors',     name: 'Errors & Debugging',   lessonIds: ['l22', 'l23'] },
      { id: 's-modules',    name: 'Modules & Files',      lessonIds: ['l24', 'l25', 'l26', 'l27'] },
      { id: 's-oop',        name: 'Classes & Objects',    lessonIds: ['l28', 'l29', 'l30', 'l31'] },
      { id: 's-advanced',   name: 'Advanced Python',      lessonIds: ['l32', 'l33', 'l34', 'l35', 'l36', 'l37', 'l38', 'l39', 'l40'] },
    ]
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '🟨',
    color: '#f7df1e',
    tagline: 'The language of the web.',
    sections: [
      { id: 'js-basics',    name: 'JS Basics',            lessonIds: [] },
      { id: 'js-types',     name: 'Types & Operators',    lessonIds: [] },
      { id: 'js-cond',      name: 'Conditional Statements', lessonIds: [] },
      { id: 'js-loops',     name: 'Loops',                lessonIds: [] },
      { id: 'js-arrays',    name: 'Arrays',               lessonIds: [] },
      { id: 'js-arrayops',  name: 'Array Methods',        lessonIds: [] },
      { id: 'js-objects',   name: 'Objects',              lessonIds: [] },
      { id: 'js-funcs',     name: 'Functions & Arrows',   lessonIds: [] },
      { id: 'js-async',     name: 'Promises & async/await', lessonIds: [] },
      { id: 'js-dom',       name: 'DOM Manipulation',     lessonIds: [] },
      { id: 'js-modules',   name: 'Modules & Tooling',    lessonIds: [] },
      { id: 'js-ts',        name: 'Intro to TypeScript',  lessonIds: [] },
    ]
  },
  {
    id: 'html',
    name: 'HTML',
    icon: '📄',
    color: '#e34f26',
    tagline: 'The skeleton of every web page.',
    sections: [
      { id: 'h-intro',      name: 'HTML Basics',          lessonIds: [] },
      { id: 'h-text',       name: 'Text & Headings',      lessonIds: [] },
      { id: 'h-links',      name: 'Links & Images',       lessonIds: [] },
      { id: 'h-lists',      name: 'Lists & Tables',       lessonIds: [] },
      { id: 'h-forms',      name: 'Forms & Inputs',       lessonIds: [] },
      { id: 'h-semantic',   name: 'Semantic HTML',        lessonIds: [] },
      { id: 'h-media',      name: 'Audio, Video, SVG',    lessonIds: [] },
      { id: 'h-access',     name: 'Accessibility',        lessonIds: [] },
    ]
  },
  {
    id: 'css',
    name: 'CSS',
    icon: '🎨',
    color: '#1572b6',
    tagline: 'Make the web beautiful.',
    sections: [
      { id: 'c-basics',     name: 'CSS Basics',           lessonIds: [] },
      { id: 'c-selectors',  name: 'Selectors',            lessonIds: [] },
      { id: 'c-boxmodel',   name: 'The Box Model',        lessonIds: [] },
      { id: 'c-flex',       name: 'Flexbox',              lessonIds: [] },
      { id: 'c-grid',       name: 'CSS Grid',             lessonIds: [] },
      { id: 'c-responsive', name: 'Responsive Design',    lessonIds: [] },
      { id: 'c-anim',       name: 'Transitions & Animation', lessonIds: [] },
      { id: 'c-vars',       name: 'Custom Properties',    lessonIds: [] },
    ]
  },
  {
    id: 'sql',
    name: 'SQL',
    icon: '🗄️',
    color: '#336791',
    tagline: 'Ask questions of your data.',
    sections: [
      { id: 'sql-basics',   name: 'SQL Basics',           lessonIds: [] },
      { id: 'sql-select',   name: 'SELECT & WHERE',       lessonIds: [] },
      { id: 'sql-agg',      name: 'Aggregates & GROUP BY', lessonIds: [] },
      { id: 'sql-joins',    name: 'JOINs',                lessonIds: [] },
      { id: 'sql-subq',     name: 'Subqueries',           lessonIds: [] },
      { id: 'sql-modify',   name: 'INSERT, UPDATE, DELETE', lessonIds: [] },
      { id: 'sql-schema',   name: 'Schema & Keys',        lessonIds: [] },
    ]
  },
  {
    id: 'swift',
    name: 'Swift',
    icon: '🦅',
    color: '#fa7343',
    tagline: 'Build apps for Apple platforms.',
    sections: [
      { id: 'sw-basics',    name: 'Swift Basics',         lessonIds: [] },
      { id: 'sw-optional',  name: 'Optionals',            lessonIds: [] },
      { id: 'sw-funcs',     name: 'Functions & Closures', lessonIds: [] },
      { id: 'sw-struct',    name: 'Structs & Classes',    lessonIds: [] },
      { id: 'sw-protocols', name: 'Protocols',            lessonIds: [] },
      { id: 'sw-swiftui',   name: 'Intro to SwiftUI',     lessonIds: [] },
    ]
  },
  {
    id: 'go',
    name: 'Go',
    icon: '🐹',
    color: '#00add8',
    tagline: 'Simple, fast, concurrent.',
    sections: [
      { id: 'go-basics',    name: 'Go Basics',            lessonIds: [] },
      { id: 'go-types',     name: 'Types & Structs',      lessonIds: [] },
      { id: 'go-funcs',     name: 'Functions & Methods',  lessonIds: [] },
      { id: 'go-errors',    name: 'Errors',               lessonIds: [] },
      { id: 'go-slices',    name: 'Slices & Maps',        lessonIds: [] },
      { id: 'go-concur',    name: 'Goroutines & Channels', lessonIds: [] },
    ]
  },
  {
    id: 'rust',
    name: 'Rust',
    icon: '🦀',
    color: '#ce422b',
    tagline: 'Fast, safe, no garbage collector.',
    sections: [
      { id: 'rs-basics',    name: 'Rust Basics',          lessonIds: [] },
      { id: 'rs-own',       name: 'Ownership',            lessonIds: [] },
      { id: 'rs-borrow',    name: 'Borrowing',            lessonIds: [] },
      { id: 'rs-struct',    name: 'Structs & Enums',      lessonIds: [] },
      { id: 'rs-pattern',   name: 'Pattern Matching',     lessonIds: [] },
      { id: 'rs-traits',    name: 'Traits & Generics',    lessonIds: [] },
    ]
  },
];

// Build a flat lesson lookup from the Python curriculum (other languages use stubs)
function _buildLessonIndex() {
  const idx = {};
  if (typeof CURRICULUM !== 'undefined') {
    CURRICULUM.forEach(u => u.lessons.forEach(l => { idx[l.id] = l; }));
  }
  return idx;
}
const LESSON_INDEX = _buildLessonIndex();

function getLessonById(id) {
  if (LESSON_INDEX[id]) return LESSON_INDEX[id];
  // stub for non-Python languages
  return {
    id,
    icon: '⭐',
    title: 'Lesson',
    sub: 'Coming soon',
    cards: [
      { type: 'concept', emoji: '🚧', title: 'Coming soon', body: 'This lesson isn\'t written yet. For now, the fully-built course is <strong>Python</strong> — switch back from the course picker.' }
    ]
  };
}
