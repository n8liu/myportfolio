# My Portfolio

A personalized, minimalist retro OS-inspired personal portfolio website showcasing professional skills, projects, photography, and blog posts with a clean dual-theme design. Built with Node.js, Express, and Cloudflare's edge computing platform.

![Portfolio Preview](assets/preview.png)

## Table of Contents
- [Overview](#overview)
- [Design Aesthetics](#design-aesthetics)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Image Management](#image-management)
- [Live Viewer Count](#live-viewer-count)
- [Analytics & Statistics](#analytics--statistics)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

This portfolio website is a comprehensive, game-like retro workspace reflecting my journey as a UC Berkeley student, featuring:
- **Retro OS Interface**: Minimalist top tabs layout mimicking classic desktop window chrome.
- **Dynamic Blog Modal**: Dynamic inline blog post reader displaying articles inside a text-editor popup.
- **Embedded Statistics**: A dedicated "Stats" panel displaying visitor telemetry using Chart.js.
- **Photography Gallery**: Standalone windowed photo page with EXIF camera details.
- **Dual-Theme Engine**: Seamless light and dark mode toggles with persistent `localStorage` states.

---

## Design Aesthetics

Inspired by Carolyn Wang's portfolio layout and PostHog's retro-brutalist theme, the website features:
*   A windowed workspace layout with classic operating system elements (title bar icons, path text, and bottom taskbars).
*   High-contrast borders (`2px solid`), warm-hued background grids, and solid shadows.
*   Modern web typography pairing (`Space Grotesk` and `Space Mono`).
*   Smooth micro-interactions (flat buttons translating `1px` on hover and click).

---

## Features

### Interface
- **Tab Switching**: Single-page application panel swap (`home`, `experience`, `projects`, `education`, `photography`, `blog`, `stats`) syncing URL hashes.
- **Theme Toggle**: Real-time styling shifts matching preference indicators (light warm beige grids vs. dark charcoal canvases) caching settings locally.
- **Live Viewer Count**: Real-time traffic indicators updated using Socket.IO.
- **Responsive Layout**: Rescaling window dimensions and responsive layout queries for mobile interfaces.

### Content Sections
- **Main Section**: Introduction and profile details.
- **About Section**: Core competencies and skills.
- **Tech Stack Section**: Logo grid for active languages and frameworks.
- **Projects Section**: Interactive github/deployment retro cards.
- **Education Section**: Highlighted UC Berkeley courses.
- **Photography Section**: Curated category filters (landscape, urban, featured) loading metadata dynamically.
- **Blog Section**: Modular cards pulling content instantly into a pop-up reader.
- **Stats Section**: Integrated 7-day visitor history charts.

---

## Tech Stack

### Core Technologies
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6)
- **Charting**: Chart.js (v4)
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Cloud Infrastructure**: Cloudflare Pages, R2 Storage
- **Image Processing**: ExifReader, ImageMagick
- **Storage**: AWS SDK (R2 compatibility)
- **Analytics API**: Cloudflare Durable Objects analytics pipeline

---

## Project Structure

### Key Files
- `index.html` - Main operating system workspace portal
- `styles.css` - Theme layout definitions, variables, and animations
- `script.js` - Tab routing, modal loading, stats charts, and theme listeners
- `viewers.js` - Real-time visitor counts integration
- `server.js` - Local testing server
- `wrangler.toml` - Cloudflare Workers deployment config

### Directories
- `pages/` - Sub-pages (e.g. `photos.html`)
- `blog/` - Markdown-derived HTML posts (`blog1.html`, `blog2.html`, etc.) and `blog-style.css`
- `assets/` - Resized images, icons, and visual graphics
- `functions/` - Cloudflare Pages serverless endpoints
- `utils/` - S3 upload scripts and local ImageMagick processors

---

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/n8liu/myportfolio3.0.git
   cd myportfolio3.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file in the root with your Cloudflare R2 credentials.

4. **Run the local dev server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build and test production dist**
   ```bash
   npm run build
   npm run serve
   ```
   Open `http://localhost:8080` in your browser.

---

## Deployment

```bash
# Build & deploy build directory to Cloudflare Pages
npm run deploy
```

---

## Analytics & Statistics

Telemetry is loaded from serverless backend APIs:
*   `Total Views` / `Unique Visitors` / `Views (24h)`
*   Dynamic 7-day traffic chart (automatically styled dynamically on theme changes)
*   Resume download logs