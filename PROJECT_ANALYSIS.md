# Master System Architecture, Design Evolution, Improvements & Technical Reference: Nathan Liu Portfolio (Retro OS Edition)

> **Master Reference Purpose**: This document is the unified, single-source-of-truth architectural analysis, design evolution archive, technical specification, improvement catalog, and operational context window for developers and AI agents working on the `myportfolio` codebase. It consolidates all system diagrams, directory layouts, design tokens, academic/minimalist redesign case studies, accessibility/SEO/performance improvements, core subsystem architectures, full API references, historical bug audits, and strict agent guidelines without omitting any technical or historical context.

---

## Table of Contents
1. [Executive Summary & System Identity](#1-executive-summary--system-identity)
2. [Dual-Runtime Architecture & Data Flow](#2-dual-runtime-architecture--data-flow)
3. [Full Tech Stack & Dependencies Matrix](#3-full-tech-stack--dependencies-matrix)
4. [Comprehensive Repository Directory Map](#4-comprehensive-repository-directory-map)
5. [Design System & CSS Token Specifications](#5-design-system--css-token-specifications)
6. [Academic Foundation & Minimalist Redesign Case Study](#6-academic-foundation--minimalist-redesign-case-study)
7. [Completed Improvements, UX, Accessibility & SEO Upgrades](#7-completed-improvements-ux-accessibility--seo-upgrades)
   - [7.1 Retro OS Redesign & Refinements](#71-retro-os-redesign--refinements)
   - [7.2 Accessibility Enhancements (WCAG 2.1 AA)](#72-accessibility-enhancements-wcag-21-aa)
   - [7.3 SEO & Structured Data Optimization](#73-seo--structured-data-optimization)
   - [7.4 Project Cards Architecture](#74-project-cards-architecture)
   - [7.5 Personal Philosophy & About Note](#75-personal-philosophy--about-note)
   - [7.6 Modal Focus, Mobile Navigation & Standardized State Engine](#76-modal-focus-mobile-navigation--standardized-state-engine-september-2026)
   - [7.7 Photography Infinite Scroll Pagination & High-Priority Image Optimization](#77-photography-infinite-scroll-pagination--high-priority-image-optimization-september-2026)
8. [Core Subsystems & Feature Deep Dives](#8-core-subsystems--feature-deep-dives)
   - [8.1 Single-Page Scrolling, SPA Routing & Clean URL Handling](#81-single-page-scrolling-spa-routing--clean-url-handling)
   - [Skills: Categorized Badges](#skills-categorized-badges)
   - [Experience: Leadership & Community Subsection](#experience-leadership--community-subsection)
   - [8.2 Dynamic Markdown Blog Engine](#82-dynamic-markdown-blog-engine)
   - [8.3 Photography Gallery, EXIF Metadata & Infinite Scroll Pagination System](#83-photography-gallery-exif-metadata--infinite-scroll-pagination-system)
   - [8.4 Stateful Edge Analytics & Durable Objects](#84-stateful-edge-analytics--durable-objects)
   - [8.5 Automated Test Suites & Regression Safety Net](#85-automated-test-suites--regression-safety-net)
9. [Comprehensive API Reference (Dev & Production)](#9-comprehensive-api-reference-dev--production)
10. [Build, Optimization & CI/CD Pipelines](#10-build-optimization--cicd-pipelines)
11. [Performance Optimization, Image Pipelines & Recommendations](#11-performance-optimization-image-pipelines--recommendations)
12. [Historical Defect Audit & Resolved Deficiencies](#12-historical-defect-audit--resolved-deficiencies)
13. [Knowledge Transfer & High-Risk Gotchas for AI Agents](#13-knowledge-transfer--high-risk-gotchas-for-ai-agents)

---

## 1. Executive Summary & System Identity

- **Project Name**: `myportfolio3.0`
- **Author**: Nathan Liu (UC Berkeley Data Science & Computer Science, Class of 2026)
- **Production Domain**: [https://nathanliu.dev](https://nathanliu.dev)
- **Core Concept**: A **Minimalist Retro OS Workspace** modeling a classic desktop operating system (inspired by Carolyn Wang's layout and PostHog's retro-brutalist aesthetic). It combines retro window chrome, draggable modal dialogs, dynamic path indicators, live visitor telemetry, and interactive cursor spotlighting with modern serverless edge computing on Cloudflare.
- **Design Philosophy**: *"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."* — Antoine de Saint-Exupéry. Clean typography, brutalist high-contrast borders (`2px solid`), tactile micro-interactions, and zero visual clutter.

---

## 2. Dual-Runtime Architecture & Data Flow

The application utilizes a **dual-environment architecture** allowing zero-friction offline/local development with high-performance edge serverless deployment in production:

1. **Local Development (Express.js + Socket.IO)**: Runs a traditional Node.js server. Real-time active viewer tracking is handled via WebSockets (`socket.io`), with local mock analytics endpoints and AWS SDK v3 R2 integration.
2. **Production Deployment (Cloudflare Pages + Workers + Durable Objects)**: Deployed serverless at the Edge. Dynamic analytics, unique visitor counting, live viewer counters, and file download metrics are handled via **Cloudflare Durable Objects with SQLite storage**, while photos are served from **Cloudflare R2** with key-based category filters and Edge caching.

```mermaid
graph TD
    subgraph Client Browser
        UI[Retro OS Desktop Interface]
        ClientJS[script.js / viewers.js]
        ChartJS[Chart.js 7-Day Telemetry]
    end

    subgraph Local Dev Environment (Express)
        Server[server.js - Express Port 3000]
        SIO[Socket.IO WebSocket Server]
        MockDB[Local In-Memory Analytics]
        R2Local[AWS SDK v3 S3/R2 Client]
    end

    subgraph Production Cloudflare Edge
        CFPages[Cloudflare Pages Static Files]
        CFWorkers[functions/_worker.js]
        R2[Cloudflare R2 Bucket - myportfolio]
        
        subgraph Durable Objects (SQLite Backend)
            DO_Viewers[ViewerCounter]
            DO_Total[TotalCounter]
            DO_Unique[UniqueVisitors]
            DO_Resume[ResumeCounter]
        end
    end

    UI <--> ClientJS
    ClientJS <--> ChartJS
    ClientJS <-->|WebSockets| SIO
    ClientJS <-->|HTTP API /api/*| Server
    Server <--> MockDB
    Server <--> R2Local
    
    ClientJS <-->|HTTP API /api/*| CFWorkers
    CFWorkers <-->|Edge Cache /img/*| R2
    CFWorkers <--> DO_Viewers
    CFWorkers <--> DO_Total
    CFWorkers <--> DO_Unique
    CFWorkers <--> DO_Resume
    CFWorkers <-->|Static Fallback| CFPages
```

---

## 3. Full Tech Stack & Dependencies Matrix

| Layer | Technology | Details / Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, Vanilla CSS3, ES6 Modules | Zero-framework, lightweight, maximum performance |
| **Typography** | Space Grotesk & Space Mono | Grotesk for headings/body; Mono for telemetry/paths/code |
| **Icons & Visuals** | FontAwesome 6.4.0 (CDN) | UI actions, controls, status indicators, social links |
| **Data Visualization** | Chart.js 4.4.2 (UMD CDN) | 7-day traffic telemetry line chart with dynamic theming |
| **Dev Server** | Express 4.21.2 + Socket.IO 4.8.1 | Local static file server, live WebSocket viewer counter |
| **Serverless Edge** | Cloudflare Pages & Workers | Functions runtime (`_worker.js`, `_middleware.js`) |
| **Edge State Storage** | Cloudflare Durable Objects (SQLite) | Distributed stateful counters & visitor tracking (migrations v1-v5) |
| **Object Storage** | Cloudflare R2 + `@aws-sdk/client-s3` | High-res photography storage with Edge caching (`caches.default`) |
| **Image Processing** | `ExifReader`, `imagemagick` | EXIF extraction and multi-resolution downsizing scripts |
| **Bundler & Build** | `esbuild` + Node.js build scripts | Bundle worker into ESM, inject production `API_BASE` |
| **Automated Testing** | Node.js Test Runner (`node:test`, `node:assert/strict`, `node:vm`) | 18 isolated unit & subsystem tests verifying routing, motion, state & UX |
| **CI / CD** | GitHub Actions (`deploy.yml`) | Automated build and deploy to Cloudflare Pages on push |

---

## 4. Comprehensive Repository Directory Map

```
myportfolio/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD: Automated build & deploy to Cloudflare Pages via Wrangler
├── assets/                         # Static images, icons, and document assets
│   ├── Nathan_Liu_Resume.pdf       # Primary resume PDF (tracked via /api/resume/increment)
│   ├── Nathan_Liu_Resume(1).pdf    # Backup resume build
│   ├── favicon.ico                 # Site favicon
│   ├── berkeleylogo.png            # UC Berkeley seal / logo
│   ├── profile.jpeg                # Author avatar image
│   ├── featured-photo.png          # Fallback gallery photos
│   ├── landscape-photo.png
│   ├── urban-photo.png
│   ├── project1.png - project4.png # Project preview screenshots
├── blog/                           # Markdown-driven dynamic blog posts & metadata
│   ├── posts/                      # Core Markdown article files
│   │   ├── berkeley-classes.md     # Berkeley CS/DS/Physics class review matrix & ratings
│   │   ├── clickbait-classifier.md # BERT vs. TF-IDF NLP model deep dive
│   │   ├── datascience.md          # Data engineering & statistical reflection
│   │   ├── fujifilm-x100vi.md      # Fujifilm X100VI photography review & philosophy
│   │   ├── gym.md                  # Weekly fitness routine & mental clarity post
│   │   ├── market-pipeline.md      # Event-driven semantic market pipeline post
│   │   └── portfolio.md            # Architecture & tech stack breakdown post
│   ├── posts.json                  # Central blog metadata catalog & manifest
│   └── blog-style.css              # Typography & layout styles for blog reader
├── dist/                           # Generated production build artifacts (ephemeral, gitignored)
├── functions/                      # Cloudflare Pages / Workers serverless backend
│   ├── _worker.js                  # Main Worker entrypoint: DO routing, R2 streaming, SPA fallback
│   ├── _middleware.js              # Legacy middleware; ignored by advanced-mode Pages deployment
│   ├── photos-metadata.json        # Pre-extracted EXIF metadata array for photography assets
│   ├── resume_counter.js           # Durable Object: Tracks resume downloads
│   ├── session_tracker.js          # Durable Object: Active session management
│   ├── total_counter.js            # Durable Object: 7-day request history & total view counter
│   ├── unique_visitors.js          # Durable Object: IP-deduplicated unique visitor counts + auto-prune
│   └── viewers.js                  # Durable Object: Real-time concurrent viewer counter
├── tests/                          # Automated Node test runner suites (node:test)
│   ├── motion.test.js              # View Transitions, rapid navigation, reduced-motion fallback tests
│   ├── photography.test.js         # Pages R2 routing, worker cache headers, config bindings, error tests
│   ├── scrollspy.test.js           # Scrollspy bottom detection, reverse scrolling, navigation guards
│   └── ux.test.js                  # Standardized load states, modal accessibility, tab visibility, infinite scroll
├── utils/                          # Build tools, asset optimizers, and cloud utilities
│   ├── cloudflare.js               # AWS SDK v3 R2 client (category listing & signed URLs)
│   ├── downsize-images.js          # ImageMagick multi-resolution downscaler (large, medium, thumb)
│   ├── image-metadata.js           # ExifReader script to extract EXIF into photos-metadata.json
│   ├── image-optimizer.js          # Asset size analyzer & WebP suggestion tool
│   └── prepare-pages-config.js     # Build step: prepares dist/wrangler.toml & injects API_BASE
├── index.html                      # Main single-page application desktop interface
├── styles.css                      # Global Retro OS design system tokens, window chrome, and layout
├── script.js                       # Primary client controller (SPA routing, modals, chart, drag)
├── viewers.js                      # Client telemetry & live viewer counter bridge
├── server.js                       # Express.js local development server (port 3000)
├── wrangler.toml                   # Cloudflare Pages/Worker bindings & SQLite migrations
├── package.json                    # Project configuration, dependencies, and npm scripts
├── _headers                        # Cloudflare Edge HTTP headers (cache control policies)
├── QUICK_START.md                  # Developer quick start guide
└── PROJECT_ANALYSIS.md             # This document (Master Technical Reference)
```

---

## 5. Design System & CSS Token Specifications

The visual system is defined in [styles.css](file:///Users/natedogl/CODE/myportfolio/styles.css) using CSS custom properties.

### Design Tokens (`:root`)
```css
--bg-canvas: #f4f1ea;       /* Warm beige retro desktop wallpaper */
--bg-window: #ffffff;       /* Pure white window application canvas */
--bg-chrome: #eae6df;       /* Retro gray toolbar & menu background */
--bg-active: #ffe7a0;       /* PostHog warm gold active tab highlight */
--accent: #513989;          /* Deep Berkeley purple accent */
--text: #1e1e1e;            /* Dark charcoal high-contrast text */
--text-muted: #6a665e;      /* Muted brown-gray secondary text */
--border-color: #1e1e1e;    /* High contrast brutalist stroke */
--border: 2px solid var(--border-color);
--border-thin: 1px solid var(--border-color);
--shadow: 4px 4px 0px 0px var(--border-color);
--shadow-hover: 1px 1px 0px 0px var(--border-color);
--font-sans: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Space Mono', monospace;
--grid-color: rgba(30, 30, 30, 0.035);
```

### Current Layout & Typography (September 2026)

These values describe the current source in `index.html` and `styles.css`; earlier redesign examples below are historical.

| Element | Current styling | Responsive behavior |
| :--- | :--- | :--- |
| Main OS window (`.os-window`) | `max-width: 1197px; width: 100%` | Constrained to the available viewport width |
| Navigation (`.header-nav`) | Independent `max-width: 1000px` | Uses the existing compact, horizontally scrollable mobile layout |
| Section titles (`.section-divider-title`) | `1.53rem`, bold monospace, lowercase | Same font size on mobile; wraps naturally |
| Section dividers | Single thin bottom border, no background or shadow | Reduced gap and bottom margin at 768px or less |
| Filename labels (`.section-divider-file`) | `0.7rem`, muted text, no enclosing badge | Kept on one line |
| Education (`#panel-education`) | `padding-top: 3.5rem` | Applies on desktop and mobile |
| Profile frame (`.profile-pic-frame`) | `width: min(375px, 100%); aspect-ratio: 1` | Width becomes `min(270px, 100%)` at 768px or less |
| Experience columns (`.experience-columns`) | Two equal columns with a `2rem` gap | Stacks work experience above leadership at 768px or less |

The profile retains its circular border, offset shadow, and `object-fit: cover`. Experience and leadership share the existing retro card styles, while section headings and skill badges use lighter decoration.

### Key UI Features & Micro-Interactions
- **Interactive Ambient Wallpaper**: Mouse pointer movement updates `--mouse-x`, `--mouse-y`, `--mouse-px`, `--mouse-py` on `document.documentElement` to smoothly shift an ambient spotlight and parallax background grid.
- **Retro OS Window Chrome**: Features a classic titlebar with icon, dynamic file path (`C:\nathan\portfolio\...`), window control buttons (`_`, `口`, `X`), a retro menu bar (`File`, `Edit`, `View`, `Tools`, `Help`), and a bottom taskbar with a live digital clock and active viewer count.
- **Draggable Windows**: Both the main OS desktop window and all modal popups (`image_viewer.exe`, `blog_post.txt`, `notes.txt`) can be dragged via their titlebars using `makeElementDraggable()` in `script.js` (disabled on mobile <= 768px).
- **Interactive Sticky Note Widget (`notes.txt`)**: A floating desktop Post-It note widget with washi tape accent, fold/minimize states, taskbar integration (`#taskbar-sticky-btn`), editable content with debounced `localStorage` auto-saving, and quick reset controls.
- **Interactive Retro Terminal Console (`term.exe`)**: A bottom-left docked and draggable retro CLI console with interactive commands (`about`, `skills`, `projects`, `education`, `blog`, `matcha`, `photos`, `stats`, `goto`, `theme`, `contact`, `clear`), command history with up/down arrow cycling, tab completion, and taskbar launch controls.
- **Tactile Button Press**: Interactive cards and buttons use a brutalist offset shadow (`4px 4px 0px #1e1e1e`) that translates `translate(1px, 1px)` on hover and `translate(2px, 2px)` on click with reduced shadow.

---

## 6. Academic Foundation & Minimalist Redesign Case Study

During the portfolio's visual overhaul, the **Academic Foundation** (Education panel) underwent two major evolutionary redesign iterations.

### 6.1 Design Evolution & Layout Comparison

#### A. Original Complex Layout (Legacy)
```
┌─────────────────────────────────────────┐
│ 🖥️  Computer Science Core               │
│ Foundation in algorithms, systems...    │
├─────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ CS 61A   │ │ CS 61B   │ │ CS 61C   │ │
│ │ Structure│ │ Data     │ │ Computer │ │
│ │ Python   │ │ Java     │ │ C        │ │
│ │ Func Prog│ │ Algo     │ │ Assembly │ │
│ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```
- Heavy visual noise: ~200 lines HTML, ~150 lines CSS, 3 nested container layers, decorative icons, and redundant syllabus descriptions.

#### B. Balanced Category Cards Approach
```
┌─────────────────────────────────────────────────┐
│ 🖥️  Computer Science                            │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ CS 61A   │ │ CS 61B   │ │ CS 61C   │         │
│ │ Structure│ │ Data     │ │ Computer │         │
│ │ & Inter. │ │ Struct.  │ │ Arch.    │         │
│ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────┘
```
- Introduced category headers with FontAwesome icons (Computer Science, AI & ML, Data Science), gold course codes (`#ffe7a0`), card hover lift (`translateY(-3px)`), and dark background grids.

#### C. Final Minimalist Retro OS Pills (`index.html`)
```
┌─────────────────────────────────────────────────────────────┐
│ Computer Science                                            │
│ [CS 161] [CS 162] [CS 168] [CS 170] [CS 186] [CS 188] [CS 189]│
│                                                             │
│ Data Science                                                │
│ [DATA 8] [DATA 100] [DATA C101] [DATA C104] [DATA 140]     │
│                                                             │
│ Statistics & Analytics                                      │
│ [STAT 150] [STAT 153] [EECS 127] [INFO 159] [IEOR 162]      │
│                                                             │
│ Physics                                                     │
│ [PHYSICS 7A] [PHYSICS 7B] [PHYSICS 7C]                      │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Quantitative Performance Gains
- **HTML Markup**: Reduced from 200 lines to ~30 lines (**85% reduction**).
- **CSS Volume**: Reduced from 150 lines to ~40 lines (**73% reduction**).
- **DOM Nodes**: Reduced from ~60 elements to ~20 elements (**67% reduction**).
- **Mobile Usability**: Grid layout smoothly reflows across `display: flex; flex-wrap: wrap; gap: 0.5rem;` with clean touch targets and native title tooltips.

### 6.3 Complete Course Catalog & Matrix

| Category | Course Code | Full Course Title |
| :--- | :--- | :--- |
| **Computer Science** | `CS 161` | Computer Security |
| | `CS 162` | Operating Systems and Systems Programming |
| | `CS 170` | Efficient Algorithms and Intractable Problems |
| | `CS 186` | Introduction to Database Systems |
| | `CS 188` | Introduction to Artificial Intelligence |
| | `CS 189` | Introduction to Machine Learning |
| | `CS 198` | Introduction to Full-Stack Development |
| **Data Science** | `DATA 8` | Foundations of Data Science |
| | `DATA 100` | Principles of Data Science |
| | `DATA C101` | Data Engineering |
| | `DATA C104` | Human Contexts and Ethics of Data |
| | `DATA 140` | Probability for Data Science |
| **Engineering & Analytics** | `EECS 127` | Optimization Models in Engineering |
| | `INFO 159` | Natural Language Processing |
| | `IEOR 162` | Linear Programming and Network Flows |
| **Physics** | `PHYSICS 7A` | Physics for Scientists and Engineers I (Mechanics) |
| | `PHYSICS 7B` | Physics for Scientists and Engineers II (Electromagnetism) |
| | `PHYSICS 7C` | Physics for Scientists and Engineers III (Waves/Quantum) |

---

## 7. Completed Improvements, UX, Accessibility & SEO Upgrades

A comprehensive audit and implementation cycle established the following enhancements across the portfolio:

### 7.1 Retro OS Redesign & Refinements
- ✅ **Single-Page Scrolling Desktop Architecture**: Remodeled portfolio from tab-swapping to a unified vertical single-page scrolling experience while preserving the Retro OS aesthetic.
- ✅ **Scrollspy & Dynamic Path Morphing**: Integrated a scroll-position tracker that highlights the active nav tab, updates `#window-path-text`, and synchronizes the URL via `history.replaceState`. Updates are batched with `requestAnimationFrame`, and reaching the bottom explicitly selects the final section.
- ✅ **Minimal File Section Dividers**: Education, experience, projects, and skills use `1.53rem` monospace headings, muted filename labels, and a single thin underline. Semantic `h2` titles replace the former icon banners; backgrounds, boxed filename badges, and shadows are removed for a lighter Retro OS style.
- ✅ **Sliding Navigation Highlight**: A decorative `.nav-highlight` moves and resizes behind the active tab over 240ms. `updateActiveNav()` synchronizes it for clicks, scrollspy, and history navigation, and sets `aria-current="location"`. ResizeObserver and font readiness keep positioning aligned; reduced-motion preferences disable transitions.
- ✅ **Sticky Navigation Dock & Titlebar**: Frosted glass sticky navigation dock and pinned OS titlebar for effortless section jumps on desktop and mobile.
- ✅ **Embedded Statistics Dashboard**: Consolidated visitor telemetry into the Stats section running Chart.js trends, replacing legacy `database.html`.
- ✅ **Dynamic Blog Modal Reader**: Parses standalone markdown articles asynchronously inline inside `#blog-modal`.
- ✅ **Theme Variable Engine**: Global CSS variables supporting light/dark tones with `localStorage` persistence and dynamic Chart.js re-coloring.

### Motion Refinements
- **Page changes**: `navigateTo()` wraps cross-view changes in a 180ms View Transition scoped visually to `.window-body`, leaving OS chrome steady. Initial navigation and scrolling within the portfolio remain immediate at the routing layer. Unsupported browsers use a simple incoming fade. A navigation version counter prevents stale callbacks from applying older tab clicks. See the [View Transition API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).
- **Section entrances**: An IntersectionObserver rooted in `.window-body` adds a 200ms fade and 6px upward entrance once per section per page load. Content is not hidden while waiting for observation.
- **Modal entrances**: Image and blog overlays fade in over 180ms, with dialogs scaling from 0.98 to 1. The individual `scale` property keeps entrance animation separate from drag transforms.
- **Photo loading**: Gallery images fade in over 180ms after loading; cached images are revealed immediately. Existing 180px tiles reserve layout space, and failed images expose fallback alt text.
- **Tactile feedback**: Shared buttons and cards use 120ms transitions, a 1px hover translation, and a 2px pressed translation with reduced shadow.
- **Reduced motion**: CSS minimizes animations and transitions and disables smooth scrolling; JavaScript skips page transitions, section reveals, and pointer wallpaper updates. Changing the preference also skips an active page transition.
- **Validation**: `tests/motion.test.js` checks initial/in-page navigation, cross-view updates, superseded callbacks, history intent, reduced-motion behavior, and unsupported-browser fallback. Production build and all seven Node tests pass; these tests do not substitute for browser visual review.

### 7.2 Accessibility Enhancements (WCAG 2.1 AA)
- ✅ **Semantic Buttons**: Converted div scroll indicators to semantic `<button class="scroll-dot" aria-label="...">`.
- ✅ **ARIA Attributes**: Added descriptive `aria-label` to all social icons, download links, and navigation items.
- ✅ **Decorative Icons**: Marked decorative FontAwesome icons with `aria-hidden="true"`.
- ✅ **Security on External Links**: Enforced `rel="noopener noreferrer"` across all external anchor tags.
- ✅ **High-Contrast Focus Outlines**: Enhanced focus rings with high-visibility purple outlines for keyboard accessibility.

```html
<!-- Accessibility Implementation Pattern -->
<button class="scroll-dot" data-section="main" aria-label="Navigate to main section"></button>
<a href="https://www.linkedin.com/in/n8liu/" target="_blank" rel="noopener noreferrer" aria-label="Visit Nathan's LinkedIn profile">
  <i class="fab fa-linkedin" aria-hidden="true"></i>
</a>
```

### 7.3 SEO & Structured Data Optimization
- ✅ **Meta Tags**: Added description, keywords, viewport, and OpenGraph/Twitter Card social sharing tags.
- ✅ **Schema.org JSON-LD**: Embedded `Person` schema markup containing UC Berkeley education, job title, social profiles, and core competency entities.

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Nathan Liu",
  "jobTitle": "Data Science & Computer Science Student",
  "worksFor": { "@type": "EducationalOrganization", "name": "UC Berkeley" },
  "knowsAbout": ["Machine Learning", "Data Science", "Full Stack Development", "Python", "JavaScript"]
}
```

### 7.4 Project Cards Architecture
- **Uniform sizing**: `.projects-grid` uses equal-width columns and `grid-auto-rows: 1fr` so every project card shares the tallest card’s height. Flex card bodies align action buttons at the bottom without fixed heights or clipped descriptions.
- **Current layout**: `.projects-grid` displays `.retro-card` entries with titles, status badges, concise descriptions, technology pills, and demo links where provided. Per-project GitHub buttons are consolidated into a final “More projects on GitHub” card linking to `https://github.com/n8liu` with the shared button style and safe new-tab attributes. Cards use the shared offset shadow and hover movement.
- **Current order**: CardboardDex, Live Semantic Market, Clickbait Classifier, FleetManager, ItineraryAI, The IBD Digest, Spotify Analytics, SimplyMail, and More projects on GitHub.
- **FleetManager**: Marked `Completed (2025)`. Describes backend ownership of an electric-vehicle fleet platform: telemetry and electrical-utility ingestion, AWS S3 storage, backend API delivery, end-to-end debugging, and predictive maintenance using driver behavior and utilization data. Technology pills: Python, Django, PostgreSQL, AWS S3. No code or demo link is currently supplied.
- **Historical implementation**: Earlier project cards used expandable hover highlights for SimplyMail, Spotify Analytics, Pokédex API, and Live Semantic Market. The current markup presents descriptions directly.

### 7.5 Personal Philosophy & About Note
- ✅ **Personal Philosophy**: Added personal paragraph regarding photography, fitness, and continuous learning philosophy styled with an italic purple accent border.

```css
.personal-note {
  font-style: italic;
  background: rgba(81, 57, 137, 0.1);
  border-left: 3px solid #513989;
  padding: 15px;
}
```

### 7.6 Modal Focus, Mobile Navigation & Standardized State Engine (September 2026)
- ✅ **Polished Photo Viewer (`image_viewer.exe`)**:
  - Implemented sequential photo navigation with previous (`#photo-prev`) and next (`#photo-next`) buttons, counter indicator (`#photo-counter` with `role="status"` and `aria-live="polite"`), and automated disabled state toggling for single-photo categories.
  - Added native keyboard arrow navigation (`ArrowLeft` / `ArrowRight`) while the modal is open.
  - Image loading status overlay (`#photo-image-status`) with dark-theme contrast adaptation, indeterminate spinner, and retry callbacks for failed images.
  - Return focus synchronization: modal dismiss restores focus directly to the active photo's card button in the gallery.
- ✅ **Active Mobile Tab Visibility Preservation**:
  - Implemented `keepActiveTabVisible`: calculates horizontal scroll offsets on narrow screens (`@media (max-width: 768px)`), centering the active `.nav-tab` within `.header-nav`.
  - Automatically triggers on page transitions, direct deep links, scrollspy updates, device rotation, and keyboard focus events.
  - Preserves alignment with `.nav-highlight` and respects `prefers-reduced-motion`.
- ✅ **Accessible Modal Keyboard Focus Management**:
  - Integrated `showAccessibleModal` and `hideAccessibleModal` using native background `inert` attribute isolation.
  - Focus trapping (`trapModalFocus`) constrains `Tab` and `Shift+Tab` within open dialogs (`#photo-modal`, `#blog-modal`).
  - Escape key dismiss across all active dialogs with precise focus restoration to the triggering element (`modalReturnFocus`).
- ✅ **Standardized Loading & Retry States (Photos, Blog, Stats)**:
  - Unified `setLoadState(container, message, retry, busy)` engine across photo gallery, photo modal viewer, markdown blog reader, and stats dashboard.
  - Native semantic `<progress class="loading-spinner" aria-label="...">` styled with `conic-gradient` and modern fallbacks.
  - Standardized `.load-state` layout with accessible ARIA live regions (`role="status"` / `role="alert"`) and retro brutalist retry buttons (`.btn-retro.load-retry-btn`).
  - Full test coverage in `tests/ux.test.js` validating state transitions, focus cycles, and mobile scroll offsets.

### 7.7 Photography Infinite Scroll Pagination & High-Priority Image Optimization (September 2026)
- ✅ **Infinite Scroll Pagination Engine**:
  - Batches category photos into chunks of 12 items (`PHOTOS_PER_BATCH = 12`) to keep initial rendering instant, lightweight, and bandwidth-efficient.
  - Automatically resets to the initial batch of 12 photos when switching category filters (`#photo-category-filters`).
  - Hides infinite scroll container (`#photo-infinite-container[hidden]`) while category images are loading or when empty.
- ✅ **Sentinel IntersectionObserver & Accessible Fallback**:
  - Tracks a bottom sentinel element (`#photo-sentinel`) with `IntersectionObserver` (`root: scrollContainer`, `rootMargin: 300px`), automatically appending the next batch of 12 photos before the user reaches the bottom.
  - Displays dynamic status metrics (`#photo-infinite-status` with `role="status"`): `showing 12 of 34 photos` while scrolling, and `all 34 photos loaded.` once complete.
  - Accessible fallback: keeps the manual `#photo-load-more` button (`load more photos ↓`) visible whenever photos remain, including when IntersectionObserver is available.
- ✅ **Modern Web Image Priority Optimization**:
  - Implements modern browser image loading guidance: sets `fetchpriority="high"` on the first 2 above-the-fold images of the gallery without `loading="lazy"`.
  - Applies `loading="lazy"` on all remaining items to defer off-screen image decoding and network payload.
- ✅ **Photo Modal Viewer Synchronization**:
  - Modal viewer retains access to all category photos for continuous Previous/Next navigation and live counter indexing (`x / N`).
  - Stepping beyond the currently rendered batch dynamically appends missing batches to the DOM.
  - When the modal is closed, the active card button is guaranteed in the DOM, scrolled into view, and receives restored keyboard focus.
- ✅ **Automated Test Coverage**:
  - Unit tests in `tests/ux.test.js` validate initial 12-item batch rendering, image priority attributes, subsequent batch appending up to completion, and modal close batch loading with focus restoration.

---

## 8. Core Subsystems & Feature Deep Dives

### 8.1 Single-Page Scrolling, SPA Routing & Clean URL Handling
- **Section Anchor Map**:
  - `/` or `/home` -> `#panel-home` (`C:\nathan\portfolio\home.md`)
  - `/experience` -> `#panel-experience` (`C:\nathan\portfolio\experience.txt`)
  - `/projects` -> `#panel-projects` (`C:\nathan\portfolio\projects.bat`)
  - `/skills` -> `#panel-skills` (`C:\nathan\portfolio\skills.cfg`)
  - `/education` -> `#panel-education` (`C:\nathan\portfolio\academics.doc`)
  - `/photography` -> `#panel-photography` (`C:\nathan\portfolio\gallery.exe`)
  - `/blog` -> `#panel-blog` (`C:\nathan\portfolio\blog.ini`)
  - `/stats` -> `#panel-stats` (`C:\nathan\portfolio\dashboard.sys`)
- **Scrollspy Engine**: A passive `.window-body` scroll listener batches updates with `requestAnimationFrame`. The last section heading above 35% of the visible scroll area determines the active section; within 2px of the bottom, the final panel is selected explicitly so Skills does not need to reach that line. Resize events and ResizeObserver refresh tracking after layout changes. Separate page views and programmatic navigation are excluded. Regression coverage in `tests/scrollspy.test.js` verifies bottom detection, reverse scrolling, event batching, and navigation guards.
- **Direct Link Scroll Restoration**: On direct URL entry (e.g. `/projects` or `/photography`), the controller calculates sticky navigation offsets and smoothly scrolls to the target section on DOM ready.
- **Server Rewrite Support**: Express (`server.js`) and Cloudflare Workers (`functions/_worker.js`) rewrite clean URL paths without file extensions to serve `index.html`.

### Skills: Categorized Badges
- **Layout**: `#panel-skills` uses a semantic definition list (`.skills-summary`) with five category rows, monospace category labels, individual skill badges, and subtle horizontal separators. Badges use dark text, warm neutral backgrounds, and thin borders for readability.
- **Categories**: Languages, Data & AI, Data Systems, Cloud & Infrastructure, and Frameworks.
- **Badge styling**: `.skill-label` uses bold `0.85rem` monospace text, `var(--text)` foreground, `var(--bg-canvas)` background, a 1px muted border, and a 3px radius. Badges wrap with a `0.5rem` gap.
- **Responsive behavior**: Category rows use a `15rem` label column plus a flexible badge column; labels and badges stack at widths of 768px or less.
- **Visual simplification**: Removed the outer card, decorative icons, badge shadows, hover effects, and tooltip-only descriptions. Existing skills are retained; Linux / Bash is grouped under Cloud & Infrastructure.

### Experience: Leadership & Community Subsection
- **Location**: Inside `#panel-experience` in `index.html`, beside the professional experience column on desktop and below it at widths of 768px or less. The `.experience-columns` grid keeps both columns equal in width and aligns their minimal headings.
- **Design**: Both columns use the same minimal heading style and `.experience-list` layout. Leadership organizations reuse `.retro-card`, `.card-title`, `.card-subtitle`, and `.retro-badge` for matching borders, shadows, spacing, typography, and dates.
- **Work experience**: The interviewing placeholder is followed by Data Engineer Intern at Carbon Sustain, Software Engineer at UnifIBD, and Data Science Intern at L.A. Lucky Import & Export Inc. Happy Lemon appears exclusively in leadership & community.
- **Leadership content**: Organization titles and locations appear once per card; `.community-roles` groups individual roles with separate date badges that wrap on narrow screens.

| Organization | Role | Dates |
| :--- | :--- | :--- |
| Cal Vietnamese Student Association, Berkeley | Famhead | Jan. 2026 – May 2026 |
| Cal Vietnamese Student Association, Berkeley | Historian | May 2025 – Jan. 2026 |
| Cal Vietnamese Student Association, Berkeley | Secretary | Jan. 2025 – May 2025 |
| Cal Vietnamese Student Association, Berkeley | Intercollegiate Council (ICC) Intern | Aug. 2024 – May 2025 |
| Associated Students of the University of California | Web Design Director | Feb. 2025 – May 2026 |
| Associated Students of the University of California | Photography Director | Sep. 2025 – May 2026 |
| Happy Lemon USA | Operations Shift Manager | Oct. 2022 – Jun. 2024 |
| Happy Lemon USA | Bobarista | Sep. 2021 – Oct. 2022 |

- **Company links**: Work experience company names link to [Carbon Sustain](https://www.carbonsustain.io/), [UnifIBD](https://unifibd.com/), and [L.A. Lucky](https://www.lalucky.com/). They open in new tabs with `rel="noopener noreferrer"`. `.card-subtitle a` inherits the subtitle color, retains an underline, and changes to the accent color on hover or keyboard focus. Location text remains outside the links.
- **Accessibility & Routing**: The subsection is labelled by its heading and remains part of `/experience`; it does not create a separate navigation panel.

### 8.2 Dynamic Markdown Blog Engine
- **Decoupled Markdown Content**: Blog posts are authored in clean, portable Markdown format (`blog/posts/*.md`) with metadata declared in `blog/posts.json`. Individual post HTML files are no longer required.
- **Client-Side Markdown Rendering**: The reader utilizes `marked.js` to parse markdown content asynchronously on-the-fly and render rich elements (tables, code blocks, blockquotes, lists, badges) directly inside `#blog-modal` (`blog_post.txt`).
- **Dynamic Card Grid & Deep Linking**: Blog cards in `index.html` are dynamically rendered from `blog/posts.json`. The SPA routing engine automatically supports deep-link clean URLs (`/blog/:slug`, `/blog?post=:slug`, or `#blog/:slug`), opening directly to the requested article modal while preserving browser history navigation.

### 8.3 Photography Gallery, EXIF Metadata & Infinite Scroll Pagination System
- **Complete storage listings**: Production R2 listings follow `truncated` / `cursor`; local S3 listings follow `IsTruncated` / `NextContinuationToken`, for both images and categories. The API retains its array response and loads the complete metadata list before rendering; image elements are appended progressively in batches of 12. This is client-side rendering pagination, not incremental API requests.
- **Scroll continuity**: After each batch, the sentinel is unobserved and observed again so a sentinel still within the preload area triggers another batch. Category changes disconnect the observer and clear the previous photo state before fetching. The manual load-more control remains available until completion.
- **Regression coverage**: Tests simulate a continuously visible sentinel through 53 photos and multiple storage listing pages in both backends. These are mocked tests, not live browser or production verification.
- **Request Routing**: The browser loads `/api/categories`, `/api/images/:category`, and `/img/:key` from the site's own origin. Photography does not use the analytics `API_BASE`. Locally these API requests reach Express and return S3-presigned URLs; on Pages they reach the bundled `_worker.js` and its native `MY_BUCKET` binding.
- **Production Entry Point**: The build outputs `dist/_worker.js`, enabling Pages advanced mode. `functions/_middleware.js` is legacy code and is ignored in this mode ([Cloudflare documentation](https://developers.cloudflare.com/pages/functions/advanced-mode/)). Edit `functions/_worker.js` for production gallery changes.
- **R2 Storage Architecture**: Photography files are organized by folder categories in Cloudflare R2 (`california/`, `japan/`, `hawaii/`, `south_korea/`).
- **Metadata Extraction**: `utils/image-metadata.js` parses RAW/JPEG headers with `ExifReader`, creating `functions/photos-metadata.json`.
- **Edge Cache API**: `functions/_worker.js` handles `/img/:key` with a 1-year immutable cache header (`public, max-age=31536000, s-maxage=31536000, immutable`), cached asynchronously at Cloudflare edge POPs with `caches.default.put()`.
- **Infinite Scroll Pagination & Performance**: Batches category photos into chunks of 12 items (`PHOTOS_PER_BATCH = 12`) managed by an `IntersectionObserver` sentinel (`#photo-sentinel`, `rootMargin: 300px`), accompanied by dynamic count reporting (`#photo-infinite-status`), accessible manual trigger fallback (`#photo-load-more`), and modern image priority optimization (`fetchpriority="high"` on initial 2 items, `loading="lazy"` on remainder).
- **Modal Viewer**: Selecting a gallery photo opens `image_viewer.exe` modal, displaying image dimensions, camera model, lens, exposure time, aperture, ISO, and location. Features interactive Previous/Next photo cycling across all category photos, live counter, keyboard Arrow navigation (`ArrowLeft`/`ArrowRight`), background inertness, Tab trapping, and focus restoration to the triggering gallery card button with on-demand batch loading on close.

### 8.4 Stateful Edge Analytics & Durable Objects
Four SQLite-backed Cloudflare Durable Objects track site activity in real time:

1. **`ViewerCounter` (`functions/viewers.js`)**:
   - Manages active concurrent visitors.
   - Endpoint: `/api/viewers/connect` (increments), `/api/viewers/disconnect` (decrements on `beforeunload` with `keepalive: true`), `/api/viewers` (polls count every 5s).
2. **`TotalCounter` (`functions/total_counter.js`)**:
   - Tracks lifetime views and rolling 24-hour request counts.
   - Generates 7-day daily traffic buckets for Chart.js.
   - Endpoints: `/api/total`, `/api/total/increment`, `/api/total/requests24h`, `/api/total/history7d`.
3. **`UniqueVisitors` (`functions/unique_visitors.js`)**:
   - Deduplicates visitors by IP (`cf-connecting-ip` / `x-forwarded-for`) using daily keys `seen:YYYY-MM-DD:ip`.
   - Automatically prunes records older than 8 days to prevent storage bloat.
   - Endpoints: `/api/unique/count`, `/api/unique/increment`, `/api/unique/history7d`, `/api/unique/visitors24h`.
4. **`ResumeCounter` (`functions/resume_counter.js`)**:
   - Tracks downloads of `Nathan_Liu_Resume.pdf`.
   - Endpoints: `/api/resume/increment`, `/api/resume/count`.

### 8.5 Automated Test Suites & Regression Safety Net
The repository features an automated Node test runner test suite (`node --test tests/*.test.js`) containing 18 unit and subsystem regression tests that execute against production builds in under 400ms:

1. **`tests/motion.test.js` (View Transitions & SPA Motion Engine)**:
   - Validates that initial page loads and in-page anchor scrolling remain immediate with zero transition latency.
   - Verifies cross-view changes between `/home`, `/photography`, `/blog`, and `/stats` activate scoped View Transitions (`document.startViewTransition`).
   - Ensures rapid multi-tab clicks discard stale asynchronous snapshot callbacks and enforce history intent.
   - Validates that `prefers-reduced-motion` and unsupported browser environments bypass snapshot transitions cleanly without errors.
2. **`tests/photography.test.js` (Pages R2 Backend & Edge Cache)**:
   - Verifies the Pages worker bundles `MY_BUCKET` binding and correctly lists R2 category folders.
   - Tests R2 key escaping and verifies exact key resolution (handling special characters like `#`, `%`, and spaces).
   - Validates Edge Cache headers (`public, max-age=31536000, s-maxage=31536000, immutable`) and `caches.default.put()` caching.
   - Tests gallery loader resilience in an isolated VM context with mocked browser globals, asserting that client-side gallery calls always use the Pages origin instead of `API_BASE` and gracefully show fallback status when R2 is offline.
   - Validates the generated `dist/wrangler.toml` Pages config binds external Durable Objects to `myportfolio`.
3. **`tests/scrollspy.test.js` (Scroll Position Tracker & Path Synchronization)**:
   - Tests reading line boundary detection (35% visible scroll container line).
   - Verifies bottom-of-page selection logic so `#panel-skills` is reliably highlighted even when its heading cannot physically reach the reading line.
   - Tests reverse scrolling and `requestAnimationFrame` event coalescing.
   - Verifies that separate full-page views and programmatic scrolling do not trigger spurious scrollspy overrides.
4. **`tests/ux.test.js` (Accessibility, State Engine & Infinite Scroll)**:
   - **`setLoadState`**: Verifies standardized busy spinners (`<progress class="loading-spinner">`) with `aria-busy="true"`, accessible alert banners (`role="alert"`), and brutalist retry buttons (`.btn-retro.load-retry-btn`).
   - **`showAccessibleModal` / `hideAccessibleModal`**: Verifies background `inert` attribute application across sibling elements, focus targeting on open, and focus restoration to the triggering button on dismiss.
   - **`trapModalFocus`**: Tests keyboard `Tab` and `Shift+Tab` cycling to guarantee focus cannot escape active dialogs (`image_viewer.exe`, `blog_post.txt`).
   - **`keepActiveTabVisible`**: Verifies horizontal scroll offset calculations on narrow screens (`@media (max-width: 768px)`), centering active `.nav-tab` within `.header-nav`.
   - **Infinite Scroll Batch Slicing**: Validates that collections are sliced into 12-item batches (`PHOTOS_PER_BATCH = 12`), with `fetchpriority="high"` strictly applied to the first 2 above-the-fold images and `loading="lazy"` on all remaining items.
   - **Sentinel & Completion**: Verifies incremental batch appending, live counter updates (`showing X of Y photos`), and completion state (`all Y photos loaded.`) with sentinel unobserving.
   - **Modal Synchronizer**: Verifies that stepping beyond the rendered set dynamically appends batches, scrolling the active card into view and restoring keyboard focus on modal dismiss.

---

## 9. Comprehensive API Reference (Dev & Production)

All endpoints return JSON and include CORS headers (`Access-Control-Allow-Origin: *`).

| Endpoint | Method | Description | Sample JSON Response |
| :--- | :--- | :--- | :--- |
| `/api/categories` | `GET` | Lists all photography categories in R2 | `[{"name":"california","displayName":"CALIFORNIA"}]` |
| `/api/images/:category` | `GET` | Lists photos in category (`all` for all) | `[{"key":"...","url":"...","camera":"...","exif":{...}}]` |
| `/img/:key` | `GET` | Proxies raw image from R2 with Edge Cache | Binary image stream |
| `/api/viewers` | `GET` | Returns current active viewer count | `{"count": 3}` |
| `/api/viewers/connect` | `GET` | Increments active viewer count | `{"count": 4}` |
| `/api/viewers/disconnect`| `POST`| Decrements active viewer count | `{"count": 3}` |
| `/api/total` | `GET` | Returns total page view count | `{"total": 1530}` |
| `/api/total/increment` | `POST`| Increments total page views | `{"total": 1531}` |
| `/api/total/requests24h`| `GET` | Requests in the last 24 hours | `{"requests24h": 87}` |
| `/api/total/history7d` | `GET` | 7-day daily total view history | `{"days":[1716163200000,...],"counts":[142,168,150,190,185,210,87]}` |
| `/api/unique/count` | `GET` | 7-day unique visitor count | `{"count": 412}` |
| `/api/unique/increment` | `POST`| Records unique visitor if unseen today | `{"count": 413}` |
| `/api/unique/history7d` | `GET` | 7-day daily unique visitor history | `{"days":[1716163200000,...],"counts":[40,52,45,61,55,68,80]}` |
| `/api/resume/count` | `GET` | Returns total resume downloads | `{"clicks": 28}` |
| `/api/resume/increment` | `POST`| Increments resume download count | `{"clicks": 29}` |

---

## 10. Build, Optimization & CI/CD Pipelines

### 10.1 NPM Scripts Reference
```bash
npm test                 # Run production build and execute full test runner suite (18 tests across 4 test files)
npm run dev              # Start local Express + Socket.IO server on port 3000 with nodemon
npm start                # Start production Node server locally
npm run build            # Full production build: compiles assets into dist/, bundles worker, prepares Pages config
npm run serve            # Serve dist/ directory locally on port 8080 via http-server
npm run deploy           # Run build, source .env, and deploy dist/ to Cloudflare Pages
npm run analyze:images   # Scan assets/ folder and output image size optimization report
npm run analyze:photos   # Scan photos/ folder and output image size optimization report
npm run downsize:90      # Downscale photos in-place to 90% scale at 82% quality using ImageMagick
```

### 10.2 Build Pipeline Execution Sequence (`npm run build`)
1. **Clean**: Deletes and re-creates the `dist/` directory.
2. **Asset Copying**: Recursively copies `*.html`, `*.css`, `*.js`, `_headers`, `blog/`, `assets/`, and `utils/` to `dist/`.
3. **Worker Bundling**: Uses `esbuild` to bundle `functions/_worker.js` with all Durable Object dependencies into ESM:
   ```bash
   npx esbuild functions/_worker.js --bundle --outfile=dist/_worker.js --format=esm --platform=browser
   ```
4. **Configuration & URL Injection (`utils/prepare-pages-config.js`)**:
   - Generates `dist/wrangler.toml` from root `wrangler.toml`, replacing `main` with `pages_build_output_dir = "."`, removing Worker migrations, and binding Durable Objects to the existing `myportfolio` Worker via `script_name`.
   - Injects the production analytics `API_BASE` (`https://myportfolio.nathanliu528.workers.dev`) into `dist/script.js` and `dist/viewers.js`. Photography always uses the site's own origin.
5. **Automated Subsystem Verification (`npm test`)**:
   - Executes all 18 isolated unit and regression tests across `tests/motion.test.js`, `tests/photography.test.js`, `tests/scrollspy.test.js`, and `tests/ux.test.js`.

### 10.3 GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Triggered on push or pull request to `main`.
- Sets up Node 22 environment.
- Executes `npm install` and `npm run build` with `API_BASE` env.
- Deploys to Cloudflare Pages using `wrangler pages deploy --cwd dist --project-name=myportfolio`. Running from `dist/` is required so Wrangler discovers the generated Pages configuration and applies its R2 binding.

---

## 11. Performance Optimization, Image Pipelines & Recommendations

### 11.1 Image Optimization Tools
- **Asset Size Analyzer (`utils/image-optimizer.js`)**: Identifies files exceeding 500KB and calculates potential bandwidth savings with WebP conversion.
- **Batch Image Downscaler (`utils/downsize-images.js`)**: Uses ImageMagick to generate large, medium, and thumbnail variants for responsive art direction.

```bash
# Image analysis and downscaling workflow
npm run analyze:photos
npm run downsize:90
```

### 11.2 Priority Roadmap

#### High Priority
- ✅ Accessibility compliance (WCAG 2.1 Level AA achieved)
- ✅ Structured SEO meta tags and JSON-LD Person schema
- ✅ Photography infinite scroll pagination & high-priority image optimization (`fetchpriority="high"` + `loading="lazy"`)
- ✅ Standardized loading & retry state architecture (`setLoadState`)
- ✅ Accessible modal focus trapping & mobile tab visibility preservation
- 🔄 Ongoing Image optimization via `downsize-images.js`
- 🔄 Dynamic EXIF parsing integration

#### Medium Priority
- ✅ Project card hover highlights & micro-interactions
- ✅ Personal about notes and philosophy statement
- 📝 WebP conversion pipeline with `<picture>` fallbacks (expected 25-35% size reduction)
- 📝 Core Web Vitals telemetry tracking (LCP, INP, CLS)

#### Low Priority
- 📝 Video demos for complex project showcases
- 📝 Interactive map integration for photo travel locations

---

## 12. Historical Defect Audit & Resolved Deficiencies

### Photography Infinite Scroll, Modal Focus & Mobile Tab Alignment (September 2026)
- **Observed**: Large photo galleries previously rendered all images simultaneously, producing heavy initial network payloads and slower Largest Contentful Paint (LCP). Additionally, the photo modal lacked sequential keyboard controls, mobile tab navigation would scroll out of visible view on small screens, and modal dialogs did not constrain keyboard tab focus.
- **Cause**: Absence of progressive batch slicing, missing `fetchpriority` hints, unmanaged focus state on dynamic overlays, and lack of automatic horizontal scrolling for the sticky mobile nav.
- **Fix**:
  - Implemented infinite scroll pagination (`PHOTOS_PER_BATCH = 12`) with an `IntersectionObserver` observing `#photo-sentinel` (300px root margin) and accessible `#photo-load-more` button fallback.
  - Applied modern web guidance for image loading: `fetchpriority="high"` on the first 2 images without `loading="lazy"`, and `loading="lazy"` on all remaining items.
  - Added sequential navigation (`#photo-prev`, `#photo-next`, `ArrowLeft`/`ArrowRight`), live status counter, and retry callbacks inside `image_viewer.exe`.
  - Added `showAccessibleModal` / `hideAccessibleModal` using native background `inert` attribute isolation, `trapModalFocus`, and Escape key dismissal.
  - Implemented `keepActiveTabVisible` centering active `.nav-tab` horizontally in `.header-nav` on narrow viewports.
  - Added `tests/ux.test.js` covering all state transitions, focus cycles, and batch appending.

### Photography API routing and Pages bindings (September 2026)
- **Observed**: The configured standalone Worker's `/api/images/all` returned HTTP 404, triggering static fallback images. The custom domain could not be resolved from the verification environment, and the Pages hostname returned a Cloudflare block page, so live Pages R2 access could not be verified.
- **Cause in source**: Gallery requests used the injected analytics Worker URL even though the deployed Pages bundle contains the photography handlers. Deployment ran from the repository root, ignoring the generated Pages configuration in `dist/`; that configuration also contained Worker-only migrations and lacked external Durable Object `script_name` references.
- **Fix**: Use same-origin photography requests, discover the corrected Pages configuration with `--cwd dist`, and encode/decode R2 object keys so spaces, `#`, and `%` survive image URLs. Show minimal monospace loading, empty, and unavailable text; the gallery does not display fallback photos.
- **Validation**: `npm test` builds production assets and checks gallery routing, R2 listing/streaming, encoded filenames, unavailable messaging, and generated bindings with mocked R2. Live verification remains necessary after deployment.

During historical codebase audits, four significant defects were identified and systematically resolved:

### ✅ 1. Restored Production Analytics (Frozen Counters)
- **Problem**: When client tracking was modularized into `script.js` and `viewers.js`, the `/api/total/increment` and `/api/unique/increment` calls were dropped, freezing production metrics.
- **Resolution**: Added deduplicated visit checks (`performance.getEntriesByType("navigation")`) to [viewers.js](file:///Users/natedogl/CODE/myportfolio/viewers.js) and reconnected increment triggers.

### ✅ 2. Fixed Dev Server Route Mismatch
- **Problem**: `server.js` attempted to serve `pages/index.html` on the root `/` path, which did not exist.
- **Resolution**: Updated `server.js` to serve root `index.html` directly (`res.sendFile(path.join(__dirname, 'index.html'))`).

### ✅ 3. Migrated Image Metadata Script to ES Modules
- **Problem**: `package.json` specifies `"type": "module"`, but `utils/image-metadata.js` used CommonJS `require()` and `module.exports`, throwing fatal runtime errors.
- **Resolution**: Converted all imports and exports in `utils/image-metadata.js` to standard ES module syntax (`import ExifReader from 'exifreader'`).

### ✅ 4. Eliminated Durable Object Storage Leak (`UniqueVisitors`)
- **Problem**: `unique_visitors.js` previously executed unindexed full-storage lists (`this.state.storage.list()`) without data eviction, creating memory exhaustion risks (128MB DO limit).
- **Resolution**: Implemented key prefix partitioning (`seen:YYYY-MM-DD:ip`) and an automated daily pruning loop in [functions/unique_visitors.js](file:///Users/natedogl/CODE/myportfolio/functions/unique_visitors.js) to purge records older than 8 days.

---

## 13. Knowledge Transfer & High-Risk Gotchas for AI Agents

When making modifications or adding features to this repository, adhere strictly to these rules:

1. **Do NOT Edit Ephemeral `dist/` Files Directly**:
   The `dist/` directory is completely overwritten during `npm run build`. Always edit the root source files (`index.html`, `script.js`, `styles.css`, etc.) and let the build pipeline handle compilation.
2. **Preserve Empty String Placeholders**:
   In source files like [script.js](file:///Users/natedogl/CODE/myportfolio/script.js) and [viewers.js](file:///Users/natedogl/CODE/myportfolio/viewers.js), keep `const API_BASE = '';` and `const workerBase = '';` as empty strings. The build step automatically injects production URLs in `dist/`. Hardcoding production URLs in root files will break local dev fallback behaviors.
3. **Configuration Drift & `wrangler.toml`**:
   Cloudflare Pages requires R2 and external Durable Object bindings at deploy-time. We generate `dist/wrangler.toml` dynamically from root `wrangler.toml` using `prepare-pages-config.js`, removing Worker migrations and adding external `script_name` references ([Cloudflare configuration documentation](https://developers.cloudflare.com/pages/functions/wrangler-configuration/#durable-objects)). Deploy with `--cwd dist` so Wrangler reads this file. Update root `wrangler.toml` for binding changes. Durable Object migrations remain part of the separately deployed Worker.
4. **Markdown Blog Authoring Contract**:
   Blog posts are authored as standard `.md` files in `blog/posts/<slug>.md` and registered in `blog/posts.json` with `id`, `title`, `date`, `readTime`, `summary`, and `tags`. Do not create standalone `.html` files for new blog posts.
5. **Durable Object Isolation**:
   Always use key prefixing when listing keys in Durable Objects (`this.state.storage.list({ prefix: '...' })`). Never call an unbounded `storage.list()` across the entire namespace.
6. **ES Module Compliance**:
   Do not introduce CommonJS syntax (`require`, `module.exports`, `__dirname` without `fileURLToPath`). All `.js` files must remain 100% ESM compliant.
7. **`tests/photography.test.js` VM Slice Constraint**:
   `tests/photography.test.js` extracts `loadPhotosByCategory` from `dist/script.js` by slicing between `    async function loadPhotosByCategory(` and `    function renderPhotos(`. This snippet is executed in a minimal Node `vm` context with mocked browser globals. Any global variables or DOM nodes referenced inside `loadPhotosByCategory` (e.g. `photoInfiniteContainer`, `galleryRequest`, `setLoadState`, `renderedPhotoCount`) MUST be safely guarded with `typeof variable !== 'undefined'` checks to prevent `ReferenceError` crashes during test execution.
8. **Host vs. VM Realm Array Prototype Equality**:
   In Node.js `vm` tests, arrays created within a VM context do not share the host realm's `Array.prototype`. Direct `assert.deepStrictEqual(vmArray, hostArray)` fails with reference mismatch errors. Always convert or spread VM arrays (`[...vmResult]`) into host arrays before asserting strict deep equality.
9. **Modern Image Priority Specification Rules**:
   Per modern browser specifications, never specify both `fetchpriority="high"` and `loading="lazy"` on the same image element. High priority must only be assigned to initial above-the-fold candidates (first 2 images), while subsequent images receive `loading="lazy"`.
10. **Build Sandbox Permissions on macOS**:
    The production build script executes `rm -rf dist`. In permission-gated or sandboxed CLI environments on macOS, removing pre-existing build directories requires elevated access (`BypassSandbox: true`).
