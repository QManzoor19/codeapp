# PyPath — Complete Python Syllabus

A full roadmap from "what is a variable?" to contributing to CPython. Split into **13 Parts + Portfolio Projects** (~200+ topics). You don't have to do all of it — pick a depth that matches your goal.

**Depth tiers** (each topic is tagged):
- 🟢 **Essential** — everyone writing Python needs this
- 🔵 **Professional** — expected of a working Python dev
- 🟣 **Advanced** — library authors, performance engineers, CPython contributors

The in-app skill tree (`pythonpath/`) currently implements Parts I–V (~40 lessons). Parts VI–XIII are your roadmap to true mastery.

---

## 🟢 PART I — FOUNDATIONS (Units 1–4)
*Read and write basic Python.*

### Unit 1 — First Steps
1. What is Python? History (Guido, 1991), philosophy, "the Zen of Python"
2. Python 2 vs Python 3 — key differences and why we only learn 3
3. Unique features (interpreted, dynamic typing, indentation-as-syntax, "batteries included")
4. Install Python & environment setup (python.org, pyenv, Homebrew, Windows)
5. Your first program, running `.py` files vs REPL
6. Identifiers & keywords (reserved words list)
7. Indentation as syntax (4 spaces, consistency, `IndentationError`)
8. Comments (`#`) and docstrings (`"""..."""`)
9. Getting user input with `input()`
10. Command-line arguments (`sys.argv` basics)
11. Strings & printing (`print`, separators, `end=`, `file=`)
12. Variables, assignment, naming rules (snake_case convention, reserved words)
13. Python data types overview (`int`, `float`, `str`, `bool`, `list`, `tuple`, `dict`, `set`, `None`)
14. Everything is an object — the mental model

### Unit 2 — Numbers, Math & Logic
15. `int`, `float`, `complex`
16. Operators: `+ - * / // % **`
17. Math module (`sqrt`, `pi`, `floor`, `ceil`, `log`)
18. Type conversion (`int()`, `float()`, `str()`, `bool()`)
19. Dynamic typing — what it means (strongly but dynamically typed)
20. Booleans & truthiness (falsy values: `0`, `""`, `[]`, `{}`, `None`)
21. Comparison operators
22. Logical operators: `and`, `or`, `not`, short-circuit evaluation
23. Randomisation with `random` (choice, randint, shuffle, seed)

### Unit 3 — Control Flow
24. `if` / `elif` / `else`
25. Ternary expression (`x if cond else y`)
26. `for` loops with any iterable
27. `range(start, stop, step)`
28. `while` loops
29. `break`, `continue`
30. Loop `else` clause (runs if loop completes without break)
31. `pass` (no-op placeholder)
32. `assert` (sanity check, `AssertionError`)
33. Flowchart programming — visualizing control flow

### Unit 4 — Functions
34. Defining functions with `def`
35. Parameters vs arguments
36. `return` (and `return` vs `print` — common beginner confusion)
37. Default values
38. Positional vs keyword arguments
39. `*args` (positional packing/unpacking)
40. `**kwargs` (keyword packing/unpacking)
41. Positional-only `/` and keyword-only `*` separators
42. Scope: LEGB rule, `global`, `nonlocal`, closures
43. `lambda` — anonymous functions
44. Higher-order functions (`map`, `filter`, `sorted(key=)`)
45. Returning functions (functions as first-class objects)
46. Docstrings (Google / NumPy / reST style) vs comments
47. Debugging techniques: `print`, `breakpoint()`, `pdb`, IDE debuggers

> **Capstone I** — CLI number guesser (functions + loops + input)

---

## 🟢 PART II — WORKING WITH DATA (Units 5–7)
*Manipulate real data structures fluently.*

### Unit 5 — Strings Deep Dive
48. String methods (`.upper`, `.lower`, `.title`, `.split`, `.strip`, `.replace`, `.join`)
49. `.find`, `.index`, `.count`, `.startswith`, `.endswith`
50. Slicing & indexing (`s[start:stop:step]`, negative indices)
51. f-strings (modern formatting, expressions, `{x:.2f}`, `{x:>10}`, `{x!r}`)
52. `str.format()` and `%`-formatting (for legacy code)
53. Unicode, `str` vs `bytes`, `.encode()` / `.decode()`
54. Raw strings (`r"..."`), escape sequences

### Unit 6 — Collections in Depth
55. Lists: create, index, slice, append, extend, insert, remove, pop
56. `sorted` vs `.sort()`, `reverse=True`, `key=`
57. Ranges (laziness, `range(n)` vs `list(range(n))`)
58. Tuples & immutability
59. Tuple unpacking (incl. `*rest`)
60. Ordered sets with tuples (as keys, return values)
61. Dictionaries: CRUD, `.get`, `.setdefault`, `.update`, merge with `|`
62. Dict iteration (`.keys`, `.values`, `.items`)
63. Sets & frozensets, set math (`|`, `&`, `-`, `^`)
64. Nested collections (list of dicts, dict of lists)
65. `enumerate`, `zip`, `reversed`
66. List comprehensions
67. Dict comprehensions
68. Set & generator comprehensions
69. Packing & unpacking everywhere (`a, *b = [1, 2, 3]`)

### Unit 7 — Errors & Exceptions
70. Error taxonomy: compile-time (syntax), runtime, logical
71. Reading tracebacks
72. Standard exceptions (`ValueError`, `TypeError`, `KeyError`, `IndexError`, `AttributeError`, `ZeroDivisionError`, `FileNotFoundError`, `StopIteration`, `RuntimeError`, etc.)
73. `try` / `except` / `else` / `finally`
74. Catching multiple exceptions (`except (A, B)`)
75. `raise` (raising exceptions)
76. `raise X from Y` (exception chaining)
77. Argument of an exception (`except X as e:`)
78. Creating custom exceptions (subclass `Exception`)
79. When NOT to catch — EAFP vs LBYL

> **Capstone II** — Text analyzer (word frequency in a file)

---

## 🟢 PART III — PROGRAM STRUCTURE (Units 8–10)
*Build and organize real programs.*

### Unit 8 — Modules & Packages
80. `import module`, `from module import name`, `import module as alias`, `from module import *` (and why to avoid it)
81. Module aliasing conventions (`import numpy as np`)
82. Writing your own module (any `.py` file)
83. Packages: directories + `__init__.py`, relative imports
84. Namespace packages (no `__init__.py`)
85. `if __name__ == "__main__":` pattern
86. Script vs module vs package
87. Python path (`sys.path`), how imports resolve
88. `pip` — install, upgrade, uninstall, freeze
89. `requirements.txt` & pinning
90. `venv` — creating, activating, deactivating
91. Standard library tour (math, random, os, sys, json, datetime, re, pathlib, collections, itertools)

### Unit 9 — Files & I/O
92. `open()` modes: `r`, `w`, `a`, `r+`, `rb`, `wb`
93. Reading text files — `.read()`, `.readline()`, `.readlines()`, iteration
94. Writing text files — `.write()`, `.writelines()`
95. Appending to files
96. `with` — context managers, auto-close
97. Writing binary files manually (`wb`, `struct`)
98. `pickle` — serializing Python objects
99. JSON (`json.dump`, `json.load`, `json.dumps`, `json.loads`)
100. CSV (`csv.reader`, `csv.writer`, `DictReader`, `DictWriter`)
101. `pathlib.Path` — the modern way to handle paths
102. File directories (`os.listdir`, `os.walk`, `glob`, `pathlib.Path.glob`)
103. Temporary files (`tempfile`)

### Unit 10 — Object-Oriented Programming
104. Overview of OOP — why classes exist
105. Defining classes with `class`
106. The `self` variable explained
107. Constructor (`__init__`)
108. Instance attributes vs class attributes
109. Types of variables: class, instance, local
110. Namespaces in classes (`instance.__dict__`, `Class.__dict__`)
111. Instance methods
112. `@classmethod` — methods on the class itself
113. `@staticmethod` — no `self` or `cls` needed
114. `@property` — computed attributes with getter/setter
115. Accessing attributes (`getattr`, `setattr`, `hasattr`, `delattr`)
116. Built-in class attributes (`__dict__`, `__name__`, `__doc__`, `__module__`, `__bases__`, `__mro__`)
117. Destroying objects (`__del__`, garbage collection caveats)
118. Inheritance & `super()`
119. Multiple inheritance & MRO (method resolution order)
120. Abstract Base Classes (`abc.ABC`, `@abstractmethod`)
121. Interfaces in Python (informal + via `Protocol`)
122. Dunder methods: `__str__`, `__repr__`, `__eq__`, `__hash__`, `__len__`, `__iter__`, `__contains__`, `__getitem__`, `__call__`
123. Operator overloading (`__add__`, `__lt__`, etc.)

> **Capstone III** — Text-based RPG with save files (classes + inheritance + pickle/JSON)

---

## 🟢 PART IV — PYTHONIC IDIOMS (Units 11–13)
*Write code that reads like Python.*

### Unit 11 — Iterators & Generators
124. Iterator protocol (`__iter__`, `__next__`)
125. Making your own iterator class
126. Generator functions with `yield`
127. Generator expressions `(x for x in ...)`
128. `next()` — consuming one value at a time
129. `yield from` — delegating to sub-generators
130. Lazy evaluation & memory efficiency
131. `itertools` essentials: `chain`, `zip_longest`, `groupby`, `product`, `accumulate`, `count`, `cycle`, `repeat`, `islice`, `takewhile`, `dropwhile`, `combinations`, `permutations`

### Unit 12 — Decorators & Context Managers
132. First-class functions — the foundation
133. Writing a simple decorator
134. Decorators with arguments (decorator factories)
135. Stacking decorators
136. `functools.wraps` — preserving metadata
137. `functools.lru_cache`, `functools.cache`
138. `functools.partial`, `functools.reduce`
139. Built-in decorators (`@staticmethod`, `@classmethod`, `@property`)
140. Class-based decorators
141. Writing a context manager (`__enter__`, `__exit__`)
142. `contextlib.contextmanager` (generator-based)
143. `contextlib.ExitStack`, `suppress`, `closing`

### Unit 13 — Standard Library Highlights
144. `collections`: `Counter`, `defaultdict`, `deque`, `namedtuple`, `OrderedDict`, `ChainMap`
145. `datetime`, `date`, `time`, `timedelta`
146. `zoneinfo` (modern timezone handling)
147. `pathlib` in depth
148. `re` — regular expressions
149. `re.match` vs `re.search` vs `re.findall` vs `re.finditer`
150. `re.sub` — search and replace
151. Extended regex (groups, lookahead, lookbehind, non-greedy)
152. Wildcards and character classes (`\d \w \s . ^ $ + * ? {n,m}`)
153. `subprocess` (running external commands safely)
154. `argparse` — professional CLI argument parsing
155. `logging` done properly (levels, handlers, formatters, rotating files)
156. `dataclasses` (`@dataclass`, `field`, `frozen`, `slots`)
157. `enum` (`Enum`, `IntEnum`, `auto`, `StrEnum`)
158. `abc` — abstract base classes
159. `typing` — type hint helpers
160. `heapq`, `bisect` — efficient algorithms
161. `weakref` — references without preventing GC
162. `shutil` — high-level file operations
163. `tempfile`, `uuid`, `hashlib`, `secrets`

> **Capstone IV** — CLI task tracker with argparse + JSON + logging

---

## 🟢 PART V — QUALITY & SCALE (Units 14–15)
*Ship code you're not embarrassed by.*

### Unit 14 — Type Hints & Static Analysis
164. Type hints basics (`int`, `str`, `list[int]`, `dict[str, int]`)
165. `Optional[X]` = `X | None`
166. `Union` / `|` types
167. `Any`, `Never`, `NoReturn`
168. `TypedDict`, `Literal`, `Final`
169. `Generic`, `TypeVar`, `ParamSpec`, `Self`
170. `Protocol` (structural typing)
171. `mypy` and `pyright` / Pylance in practice
172. Docstring styles (Google, NumPy, reST)
173. Linting & formatting (`ruff`, `black`, `isort` → now all in `ruff`)

### Unit 15 — Testing
174. Why test — red/green/refactor cycle
175. `unittest` basics (`TestCase`, `setUp`, `tearDown`, assertions)
176. `pytest` essentials: discovery, `assert`, fixtures
177. Parametrized tests (`@pytest.mark.parametrize`)
178. Markers, skipping, expected failures
179. Mocking with `unittest.mock` and `monkeypatch`
180. Coverage (`coverage.py`, `pytest-cov`)
181. Property-based testing (`hypothesis`)
182. CI with GitHub Actions (run tests on every push)
183. Test-driven development in practice

> **Capstone V** — Port Capstone IV with full type hints + pytest suite + CI

---

## 🔵 PART VI — ADVANCED OOP & DESIGN (Units 16–18)
*Beyond "class with methods."*

### Unit 16 — Deep OOP
184. MRO and diamond inheritance
185. Abstract classes vs interfaces vs protocols
186. `dataclasses` vs `attrs` vs `pydantic` — when to reach for each
187. `__slots__` — memory and speed tradeoffs
188. Descriptors (how `@property` actually works)
189. Metaclasses (when you actually need them)
190. `__init_subclass__` — the metaclass alternative
191. Mixin patterns
192. Frozen / immutable classes

### Unit 17 — Design Patterns in Python
193. Pythonic takes on GoF patterns: Singleton, Factory, Strategy, Observer, Adapter, Decorator, Command
194. Composition over inheritance
195. Dependency injection without a framework
196. SOLID applied to Python
197. Event-driven patterns with callables
198. State machines

### Unit 18 — Architecture
199. Module layout: flat vs deep
200. Clean / hexagonal / layered architecture
201. Service vs model separation
202. Configuration (`pydantic-settings`, env vars, TOML)
203. Repository & unit-of-work patterns
204. Interface boundaries & seam points

---

## 🔵 PART VII — CONCURRENCY & ASYNC (Units 19–21)
*Do more than one thing at once.*

### Unit 19 — Threading
205. What is multithreading?
206. Difference between a process and a thread
207. Concurrent programming and the GIL
208. Uses of threads (I/O-bound vs CPU-bound)
209. Starting a new thread (`threading.Thread`)
210. The `threading` module in depth
211. Thread synchronization — `Lock`, `RLock`
212. `Semaphore`, `BoundedSemaphore`
213. `Event`, `Condition`, `Barrier`
214. Thread-safe queues (`queue.Queue`)
215. Deadlock — what causes it
216. Avoiding deadlocks (lock ordering, timeouts)
217. Daemon threads
218. `concurrent.futures.ThreadPoolExecutor`

### Unit 20 — Multiprocessing
219. `multiprocessing.Process`
220. `multiprocessing.Pool`
221. Shared memory: `Value`, `Array`, `Manager`
222. `concurrent.futures.ProcessPoolExecutor`
223. Pickling constraints
224. Sub-interpreters (PEP 734 — future)

### Unit 21 — asyncio
225. The event loop mental model
226. `async def`, `await`, coroutines
227. `asyncio.run`, `asyncio.gather`
228. `TaskGroup`, `create_task`, cancellation
229. `asyncio.Queue`, locks, semaphores
230. `aiohttp` / `httpx` for async HTTP
231. Mixing sync and async safely
232. Structured concurrency (`trio`, `anyio`)
233. Debugging async: `PYTHONASYNCIODEBUG`, tracebacks

> **Capstone VII** — Parallel downloader: same app three ways (threads, processes, asyncio) + benchmark

---

## 🟣 PART VIII — PERFORMANCE & INTERNALS (Units 22–24)

### Unit 22 — Profiling & Optimization
234. Measuring: `timeit`, `cProfile`, `pstats`, `py-spy`, `scalene`
235. Memory profiling: `tracemalloc`, `memray`
236. Algorithmic wins vs micro-optimization
237. Caching strategies
238. Lazy evaluation patterns
239. `array`, `struct`, `memoryview` for tight data
240. Avoiding common perf traps (repeated string concat, `in` on lists)

### Unit 23 — Going Faster Than Python
241. `Cython` basics
242. `numba` JIT
243. `ctypes` / `cffi` — calling C
244. Writing a C extension (intro)
245. PyPy — when to reach for it
246. The `mojo` / `codon` landscape

### Unit 24 — Python Internals
247. How imports actually work (finders, loaders)
248. Bytecode & `dis`
249. The data model (`__dict__`, `__slots__`, descriptor protocol)
250. Reference counting & cyclic GC
251. The C API at a glance
252. Reading CPython source

---

## 🔵 PART IX — PACKAGING & DISTRIBUTION (Units 25–26)

### Unit 25 — Modern Packaging
253. `pyproject.toml` (PEP 621)
254. Build backends: `hatchling`, `setuptools`, `flit`, `poetry-core`
255. Entry points / console scripts
256. Namespace packages
257. Wheels vs sdists
258. Versioning (SemVer, calver)
259. `importlib.metadata`

### Unit 26 — Publishing & Maintaining
260. Uploading to PyPI (TestPyPI first)
261. `twine`, trusted publishers, GitHub Actions
262. Pinning vs floating deps (libs vs apps)
263. Changelogs, releases, deprecation policy
264. Type-stub distribution (`py.typed`)

---

## 🔵 PART X — TOOLING & WORKFLOW (Units 27–28)

### Unit 27 — Modern Toolchain
265. `uv` — the fast new env/package manager
266. `poetry`, `pipx`, `pip-tools`, `pipenv` — compare & contrast
267. `pre-commit` hooks
268. `ruff` — lint + format + import sort
269. `tox` / `nox` — testing across Python versions
270. Hosting Python code online (PythonAnywhere, Railway, Fly.io, Render)

### Unit 28 — Editors & Debugging
271. VS Code / Cursor setup (Pylance, debug config, Jupyter inside)
272. PyCharm essentials (tips & tricks, debugger, refactoring)
273. `ipdb`, `pudb`, `debugpy`
274. Remote debugging
275. Jupyter — notebooks for exploration, scripts for prod
276. HTML Markdown in Jupyter notebooks
277. Flame graphs & visual profilers

---

## 🔵 PART XI — DATABASES (Unit 29)

### Unit 29 — Python + Databases
278. `sqlite3` (stdlib — perfect starting point)
279. SQL basics refresher (SELECT, INSERT, UPDATE, DELETE, JOIN)
280. MySQL with `PyMySQL` / `mysqlclient` — install, packages
281. PostgreSQL with `psycopg` (v3)
282. Creating a database connection
283. CRUD operations through a driver
284. DML vs DDL operations
285. `SQLAlchemy` 2.x Core — query building
286. `SQLAlchemy` ORM — models, sessions, relationships
287. `alembic` migrations
288. Async DBs: `asyncpg`, `databases`
289. Connection pooling
290. Relational database schema design

---

## 🔵 PART XII — SPECIALIZATIONS (pick one or more)

### Track A — Data Science & ML

**NumPy**
- Introduction, creating arrays
- `dtype`, shape, reshape
- Indexing & slicing arrays
- Array transposition
- Universal functions (`ufunc`)
- Array processing (vectorization over loops)
- Array I/O (`save`, `load`, `savetxt`)
- Array slicing & subsetting, fancy indexing
- Matrix multiplication (`@`, `dot`)
- Broadcasting

**Pandas**
- What is pandas, where it's used
- `Series` (1D labeled arrays)
- `Index` objects
- `DataFrame` (2D labeled tables)
- Reindex, drop entry
- Selecting entries (`.loc`, `.iloc`, boolean masks)
- Data alignment
- Rank & sort
- Summary statistics (`describe`, `mean`, `median`, `std`)
- Index hierarchy (MultiIndex)
- Dataframe inspection
- Data cleaning (missing data, duplicates)
- Sorting values
- Arithmetic operations
- Bitwise & operators in pandas
- Creating pivot tables
- Method chaining
- Smoothing time-series data
- `polars` (faster, lazier alternative)

**Visualization**
- Matplotlib intro — line charts, scatter plots
- Figures, axes, subplots
- Seaborn — statistical plots, bubble charts
- Plotly — interactive bar/pie/donut/box plots

**Statistics & ML**
- Descriptive statistics
- Running regressions with `scikit-learn`
- Linear regression
- Non-parametric regression
- Multi-variable regression
- Log transformations
- Residuals analysis
- Student's t-tests and histograms
- Train/test split, cross-validation
- Classification basics (logistic regression, k-NN, trees)
- Deep learning touch: PyTorch fundamentals

### Track B — Web & APIs

**HTTP & Consuming APIs**
- `requests` — HTTP basics (GET/POST/PUT/DELETE)
- Sending parameters with the request (query, body, headers)
- Sessions, retries, timeouts
- APIs with authentication (API keys, OAuth2, JWT)
- Streaming responses

**Building APIs**
- Flask intro — routes, request objects, responses
- Jinja2 templating
- WTForms for validation
- Building your own REST API with Flask
- FastAPI (Pydantic, async, OpenAPI auto-docs)
- Django (when you want batteries-included)
- Authentication & sessions
- Deploying (Docker, Railway, Fly.io, PythonAnywhere)

**Classic web projects**
- Build your own blog
- Cafe and Wi-Fi website (real SQL data behind Flask)
- Todo list website
- Custom API-driven website
- An online shop

### Track C — Automation & Scripting

**Web Scraping**
- `requests` + `BeautifulSoup`
- Parsing HTML, CSS selectors
- Pagination, rate limiting, polite scraping
- `playwright` / `selenium` for JS-heavy sites
- Custom web scraper

**Browser Automation**
- Selenium WebDriver basics
- Automating the Google Dinosaur game
- Automating social media — Tinder / Twitter / LinkedIn / Instagram
- Custom browser automation

**System & Scheduled Tasks**
- `schedule`, cron, Task Scheduler, GitHub Actions
- Sending email via SMTP
- Sending SMS (Twilio)
- Working with date and time
- Local persistence (JSON, pickle, SQLite)

**CLIs**
- `argparse` (stdlib)
- `click`, `typer` — modern CLI builders
- `rich` for beautiful terminal output

### Track D — Async & Performance Engineering
- `asyncio` advanced: backpressure, cancellation, structured concurrency
- `trio` / `anyio`
- `aiohttp` / `httpx` at scale
- Workers: `celery`, `RQ`, `dramatiq`
- Streams: `kafka-python`, `faust`

### Track E — Data Engineering
- `dask` / `ray` for parallel data
- `airflow` / `prefect` / `dagster` pipelines
- Parquet, Arrow, `pyarrow`
- Stream processing basics

### Track F — Security
- Hashing (`hashlib`), signing (`hmac`)
- Password hashing (`argon2`, `bcrypt`)
- `cryptography` library (symmetric, asymmetric)
- Secrets management
- Common vulns: injection, SSRF, deserialization, prompt injection

### Track G — Desktop GUI
- `Tkinter` — stdlib GUI toolkit
- Widgets, layout managers (pack, grid, place)
- Event listeners
- Packing and unpacking in Tkinter
- `PyQt` / `PySide6` for polished apps
- Packaging GUI apps (`pyinstaller`, `briefcase`)

### Track H — Game & Creative Coding
- `Python Turtle` — beginner-friendly 2D graphics
- Game development with Turtle + OOP
- `pygame` — 2D games
- `arcade` — modern alternative
- `pyglet` for 3D/OpenGL
- Creative coding: `manim`, `pillow`, `opencv-python`
- Audio: `pydub`, `sounddevice`

---

## 🟣 PART XIII — MASTERY

### Unit 30 — Reading the Source
291. Navigating CPython
292. Reading PEPs (start with 8, 20, 257, 484, 517, 621)
293. Tracking `python-dev`, release notes
294. What changed in 3.10 / 3.11 / 3.12 / 3.13 / 3.14

### Unit 31 — Contributing
295. Filing good issues & minimal reproducers
296. Contributing to a library (docs first, then code)
297. Writing your own PEP-worthy idea
298. Maintaining a package long-term

### Unit 32 — Teaching Others
299. Writing tutorials that click
300. Speaking: lightning talks, conference proposals
301. Code review as a learning multiplier

---

## 🛠️ PORTFOLIO PROJECTS

Working projects to prove you can build real things. Ship them to GitHub, link them on your résumé.

### Beginner
- **Text to Morse Code Converter** — strings + dicts
- **Tic-Tac-Toe Game** — 2D state, win detection
- **Typing Speed Test** — input + timing
- **Password Generator** — random + strings

### Intermediate
- **Portfolio Website** — Flask + Jinja2
- **Image Watermarking App** — Pillow
- **Image Color Palette Generator** — Pillow + clustering
- **Breakout Game** — Turtle or Pygame
- **Space Invaders Game** — Pygame
- **Todo List Website** — Flask + SQLite
- **Cafe & Wifi Website** — Flask + SQLAlchemy
- **Disappearing Text Writing App** — Tkinter
- **Custom Web Scraper** — requests + BeautifulSoup

### Advanced
- **Build Your Own Blog** — Flask + SQLAlchemy + auth + deploy
- **Build Your Own REST API** — FastAPI + JWT + tests
- **An Online Shop** — Flask/Django + payments
- **Custom API-Driven Website** — consume & display 3rd-party APIs
- **Custom Browser Automation** — Selenium/Playwright bot
- **Automating the Google Dinosaur Game** — Selenium + computer vision

### Data Science
- **Analyse & Visualise the Space Race** — pandas + Plotly
- **Analyse Deaths Involving the Police in the US** — pandas + matplotlib + ethics
- **Predict Earnings using Multivariable Regression** — scikit-learn
- **Stock portfolio tracker** — yfinance + pandas + dashboards

---

## 📈 Learning Principles

1. **Every lesson ends with code you ran.** If you didn't type it, you didn't learn it.
2. **Spaced practice beats cramming.** 15 min/day beats 3 hours once a week.
3. **Build, then read the docs.** Try first, look it up when stuck.
4. **Debug out loud.** Rubber-duck every non-trivial bug.
5. **Ship early, refactor later.** Make it work → make it right → make it fast.
6. **Read code written by people better than you.** CPython stdlib, `requests`, `httpx`, `attrs`, `pydantic`, `rich`.
7. **Projects over courses.** A finished Tic-Tac-Toe teaches more than 10 hours of video.

---

## ⏱ Time Estimates

| Part | Level | Topics | Weeks (daily) |
|---|---|---|---|
| I — Foundations | 🟢 | 47 | 3 |
| II — Data | 🟢 | 32 | 2–3 |
| III — Structure | 🟢 | 44 | 3–4 |
| IV — Pythonic | 🟢 | 40 | 3 |
| V — Quality | 🟢 | 20 | 1–2 |
| VI — Adv OOP | 🔵 | 21 | 2–3 |
| VII — Concurrency | 🔵 | 29 | 2–3 |
| VIII — Internals | 🟣 | 19 | 3–4 |
| IX — Packaging | 🔵 | 12 | 1–2 |
| X — Tooling | 🔵 | 13 | 1 |
| XI — Databases | 🔵 | 13 | 1–2 |
| XII — Track | 🔵 | ~30–60 | 2–4 |
| XIII — Mastery | 🟣 | ongoing | lifelong |

### Realistic target paths

- **"I just want to automate stuff"** → Parts I–III + Track C (~3 months)
- **"100 Days of Python-style bootcamp"** → Parts I–V + Tracks B, C, A-lite + 15 portfolio projects (~100 days)
- **"Professional Python developer"** → Parts I–VII, XI + one deep track (~6–9 months)
- **"Senior Python dev"** → I–X + one track mastered + portfolio of 5+ shipped apps (~1 year)
- **"Data scientist"** → I–V + XI + Track A in depth (~6 months)
- **"Library maintainer / CPython contributor"** → everything + Part XIII (years)

Pick the tier that matches your goal. You don't need Part VIII to be productive — but you *do* need Parts I–V to be competent.
