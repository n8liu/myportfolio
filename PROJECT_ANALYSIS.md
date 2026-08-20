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
8. [Core Subsystems & Feature Deep Dives](#8-core-subsystems--feature-deep-dives)
   - [8.1 SPA Routing & Clean URL Handling](#81-spa-routing--clean-url-handling)
   - [8.2 Dynamic Blog Reader (DOMParser Modal Engine)](#82-dynamic-blog-reader-domparser-modal-engine)
   - [8.3 Photography Gallery & EXIF Metadata System](#83-photography-gallery--exif-metadata-system)
   - [8.4 Stateful Edge Analytics & Durable Objects](#84-stateful-edge-analytics--durable-objects)
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
        CFMiddleware[functions/_middleware.js]
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
    CFMiddleware <-->|Asset Proxy /img/*| R2
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
│   ├── _middleware.js              # Cloudflare Pages middleware for R2 image proxying
│   ├── photos-metadata.json        # Pre-extracted EXIF metadata array for photography assets
│   ├── resume_counter.js           # Durable Object: Tracks resume downloads
│   ├── session_tracker.js          # Durable Object: Active session management
│   ├── total_counter.js            # Durable Object: 7-day request history & total view counter
│   ├── unique_visitors.js          # Durable Object: IP-deduplicated unique visitor counts + auto-prune
│   └── viewers.js                  # Durable Object: Real-time concurrent viewer counter
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
| | `CS 168` | Introduction to the Internet: Architecture and Protocols |
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
| | `DATA 144` | Data Mining and Analytics |
| **Statistics** | `STAT 150` | Stochastic Processes |
| | `STAT 153` | Introduction to Time Series |
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
- ✅ **Minimalist Retro OS Window**: Redesigned `index.html` with tabbed OS chrome on a grid wallpaper.
- ✅ **Embedded Statistics Dashboard**: Consolidated visitor telemetry into the "Stats" tab running Chart.js trends, replacing legacy `database.html`.
- ✅ **Dynamic Blog Modal Reader**: Parses standalone blog articles asynchronously inline inside `#blog-modal`.
- ✅ **Theme Variable Engine**: Global CSS variables supporting light/dark tones with `localStorage` persistence and dynamic Chart.js re-coloring.
- ✅ **Photos Page Theme Integration**: `pages/photos.html` skinned to inherit OS titlebar chrome, category tabs, and status taskbars.

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

### 7.4 Interactive Project Cards
- ✅ **Expandable Highlights**: Added hover details showing key features and technical stack highlights with smooth `max-height` and opacity transitions.
  - **SimplyMail**: OAuth 2.0, real-time sync, 50% faster load times.
  - **Spotify Analytics**: Top tracks analysis, genre distribution, data export.
  - **Pokédex API**: Autocomplete search, evolution chains, type calculator.
  - **Live Semantic Market / Flow**: Streaming embeddings, vector clustering, Gemini AI integration.

### 7.5 Personal About Note
- ✅ **Personal Philosophy**: Added personal paragraph regarding photography, fitness, and continuous learning philosophy styled with an italic purple accent border.

```css
.personal-note {
  font-style: italic;
  background: rgba(81, 57, 137, 0.1);
  border-left: 3px solid #513989;
  padding: 15px;
}
```

---

## 8. Core Subsystems & Feature Deep Dives

### 8.1 SPA Routing & Clean URL Handling
- **Routing Table**: Clean URLs map to panel sections without page reloads:
  - `/` or `/home` -> `#panel-home` (`C:\nathan\portfolio\home.md`)
  - `/experience` -> `#panel-experience` (`C:\nathan\portfolio\experience.txt`)
  - `/projects` -> `#panel-projects` (`C:\nathan\portfolio\projects.bat`)
  - `/education` -> `#panel-education` (`C:\nathan\portfolio\academics.doc`)
  - `/photography` -> `#panel-photography` (`C:\nathan\portfolio\gallery.exe`)
  - `/blog` -> `#panel-blog` (`C:\nathan\portfolio\blog.ini`)
  - `/stats` -> `#panel-stats` (`C:\nathan\portfolio\dashboard.sys`)
- **History API**: Pushes browser history states (`history.pushState`) and handles `popstate` navigation.
- **Server Rewrite Support**: Express (`server.js`) and Cloudflare Workers (`functions/_worker.js`) rewrite clean URL paths without file extensions to serve `index.html`.

### 8.2 Dynamic Markdown Blog Engine
- **Decoupled Markdown Content**: Blog posts are authored in clean, portable Markdown format (`blog/posts/*.md`) with metadata declared in `blog/posts.json`. Individual post HTML files are no longer required.
- **Client-Side Markdown Rendering**: The reader utilizes `marked.js` to parse markdown content asynchronously on-the-fly and render rich elements (tables, code blocks, blockquotes, lists, badges) directly inside `#blog-modal` (`blog_post.txt`).
- **Dynamic Card Grid & Deep Linking**: Blog cards in `index.html` are dynamically rendered from `blog/posts.json`. The SPA routing engine automatically supports deep-link clean URLs (`/blog/:slug`, `/blog?post=:slug`, or `#blog/:slug`), opening directly to the requested article modal while preserving browser history navigation.

### 8.3 Photography Gallery & EXIF Metadata System
- **R2 Storage Architecture**: Photography files are organized by folder categories in Cloudflare R2 (`california/`, `japan/`, `hawaii/`, `south_korea/`).
- **Metadata Extraction**: `utils/image-metadata.js` parses RAW/JPEG headers with `ExifReader`, creating `functions/photos-metadata.json`.
- **Edge Cache API**: `functions/_worker.js` handles `/img/:key` with a 1-year immutable cache header (`public, max-age=31536000, s-maxage=31536000, immutable`), cached asynchronously at Cloudflare edge POPs with `caches.default.put()`.
- **Modal Viewer**: Selecting a gallery photo opens `image_viewer.exe` modal, displaying image dimensions, camera model, lens, exposure time, aperture, ISO, and location.

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
   - Generates `dist/wrangler.toml` from root `wrangler.toml`, appending `pages_build_output_dir = "dist"`.
   - Injects the production `API_BASE` (`https://myportfolio.nathanliu528.workers.dev`) into `dist/script.js` and `dist/viewers.js`.

### 10.3 GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Triggered on push or pull request to `main`.
- Sets up Node 22 environment.
- Executes `npm install` and `npm run build` with `API_BASE` env.
- Deploys `dist/` to Cloudflare Pages using `wrangler pages deploy dist --project-name=myportfolio`.

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
   Cloudflare Pages requires bindings (Durable Objects, R2, compatibility dates, and migrations) to be present at deploy-time. We generate `dist/wrangler.toml` dynamically from the root `wrangler.toml` using `prepare-pages-config.js`. If you add new bindings or change Durable Object settings, update the root [wrangler.toml](file:///Users/natedogl/CODE/myportfolio/wrangler.toml), NOT the build files.
4. **Markdown Blog Authoring Contract**:
   Blog posts are authored as standard `.md` files in `blog/posts/<slug>.md` and registered in `blog/posts.json` with `id`, `title`, `date`, `readTime`, `summary`, and `tags`. Do not create standalone `.html` files for new blog posts.
5. **Durable Object Isolation**:
   Always use key prefixing when listing keys in Durable Objects (`this.state.storage.list({ prefix: '...' })`). Never call an unbounded `storage.list()` across the entire namespace.
6. **ES Module Compliance**:
   Do not introduce CommonJS syntax (`require`, `module.exports`, `__dirname` without `fileURLToPath`). All `.js` files must remain 100% ESM compliant.
