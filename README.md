# My Portfolio

A personal portfolio website showcasing professional skills, projects, and photography with a clean dark-themed design.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Image Management](#image-management)
- [Live Viewer Count](#live-viewer-count)
- [Durable Objects & Cloudflare Configuration](#durable-objects--cloudflare-configuration)
- [Analytics & Statistics](#analytics--statistics)
- [How to Deploy](#how-to-deploy)

## Overview

This portfolio website includes:
- Professional showcase of skills and projects
- Dynamic photography gallery with EXIF data
- Responsive design with a modern dark-themed UI
- Cloud integration with Cloudflare for hosting and storage

## Features

### Interface
- Responsive design for all screen sizes
- Dark theme with consistent color scheme (#1e1e1e background with light text)
- Section spacing of 300px for better content separation
- Smooth scroll animations and transitions
- Fixed footer with social links that appears on scroll
- Back-to-top button that appears when reaching the bottom of the page

### Content Sections
- **Main Section**: Introduction and profile
- **About Section**: Skills and education information
- **Tech Stack Section**: Interactive showcase with logos and descriptions
- **Projects Section**: Featured development work
- **Photography Section**: Gallery with category navigation and EXIF data

### Photography Features
- Dynamic gallery with category navigation
- Image modal for fullscreen viewing
- EXIF data extraction for displaying camera settings
- Automatic category detection based on folder structure
- Responsive image gallery with category filtering
- Real-time updates using Socket.io for collaborative viewing

## Tech Stack

### Core Technologies
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Express.js server for local development
- **Cloud**: Cloudflare Pages and R2 for deployment and storage
- **Real-time**: Socket.io for live updates
- **Storage**: AWS SDK for S3-compatible storage interaction
- **Image Processing**: ExifReader for metadata extraction

### UI Components
Each tech stack item is displayed in a card-based grid layout featuring:
- Logo of the technology
- Name displayed underneath
- Hover effects for better interaction

Technologies are arranged from most frequently used to more specialized ones.

## Project Structure

### Key Files
- `index.html` - Main portfolio page with all sections
- `photos.html` - Photography gallery page
- `styles.css` - Main stylesheet
- `script.js` - Main JavaScript functionality
- `viewers.js` - Image viewing and modal functionality
- `server.js` - Express server for local development

### Directories
- `assets/` - Images and other static assets
- `functions/` - Cloudflare Pages Functions for API endpoints
- `utils/` - Utility functions for Cloudflare R2 interaction
- `resize/` - Scripts for processing and resizing images
- `dist/` - Build directory for deployment

## Local Development

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file in the root directory with your Cloudflare R2 credentials:
   ```
   R2_ACCOUNT_ID=your-cloudflare-account-id
   R2_ACCESS_KEY_ID=your-r2-access-key
   R2_SECRET_ACCESS_KEY=your-r2-secret-key
   R2_BUCKET_NAME=myportfolio
   R2_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Deployment

### Cloudflare Pages Setup

1. **Install dependencies** (includes Wrangler CLI)
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Build the site**
   ```bash
   npm run build
   ```

4. **Deploy to Cloudflare Pages**
   ```bash
   npm run deploy
   ```
   Note: The deploy script sources environment variables from the .env file.

5. **Configure Environment Variables**
   In Cloudflare Pages Dashboard:
   - Go to your project settings
   - Navigate to "Settings" > "Environment variables"
   - Add: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`

## Image Management

### Cloudflare R2 Setup
1. Create a Cloudflare R2 bucket named "myportfolio" (or customize and update config)
2. Organize photos in folders to create categories (e.g., "california/beach.jpg", "japan/tokyo.jpg")
3. The site will automatically detect these folders and create navigation categories

### Image Processing
- Automatic resizing for optimized loading
- EXIF data extraction for displaying camera settings
- Category-based organization for the gallery

## Live Viewer Count

This portfolio features a real-time viewer count displayed on every page. The viewer count is powered by Cloudflare Durable Objects and updates automatically as users visit or leave the site.

- **Durable Object:** `ViewerCounter` tracks the number of active viewers.
- **Endpoints:**
  - `/api/viewers/connect`: Increments the viewer count when a user visits a page.
  - `/api/viewers/disconnect`: Decrements the viewer count when a user leaves.
  - `/api/viewers`: Returns the current viewer count as JSON.
  - `/api/viewers/reset`: Resets the viewer count to zero (manual endpoint).
- **Frontend Integration:**
  - The viewer count is displayed in the UI and updated every 10 seconds.
  - JavaScript logic ensures the count is incremented/decremented on page load/unload.
  - Implemented on both `index.html` and `photos.html`.
- **Reset Logic:**
  - The viewer count can be manually reset via the `/reset` endpoint.
  - (Optional) You can add logic to automatically reset or cap the count if needed.

## Durable Objects & Cloudflare Configuration

- Durable Objects are configured in `wrangler.toml` with sequential migrations for each class.
- Example:
  ```toml
  [durable_objects]
  bindings = [
    { name = "VIEWER_COUNTER", class_name = "ViewerCounter" },
    { name = "SESSION_TRACKER", class_name = "SessionTracker" }
  ]
  [[migrations]]
  tag = "v1"
  new_sqlite_classes = [ "ViewerCounter" ]
  [[migrations]]
  tag = "v2"
  new_sqlite_classes = [ "SessionTracker" ]
  ```
- Durable Object classes must be exported from your Worker entrypoint.

## Analytics & Statistics (2025)

The portfolio now includes a robust statistics dashboard at `database.html`, powered by Cloudflare Durable Objects:

- **Page Views:** Tracks total and daily page views across the site.
- **Unique Visitors:** Tracks unique visitors (by IP) and unique counts per day.
- **Resume Button Clicks:** Tracks how many times the resume button is clicked.
- **Live Graph:** Interactive Chart.js graph visualizes views and unique viewers for the past 7 days.
- **24-Hour Stats:** Displays views and unique viewers in the last 24 hours.
- **API Endpoints:**
  - `/api/total`, `/api/total/requests24h`, `/api/total/history7d` — Total views, last 24h, and 7-day history
  - `/api/unique/count`, `/api/unique/visitors24h`, `/api/unique/history7d` — Unique visitors, last 24h, and 7-day history
  - `/api/resume/count` — Resume button clicks

**How it works:**
- Stats are tracked using Durable Objects and displayed in real time on the dashboard.
- The backend aggregates and serves analytics data for the frontend to visualize.

## Quick Start for Stats Dashboard

1. Deploy the Worker with `npx wrangler deploy` to enable analytics endpoints.
2. Visit `database.html` to view real-time stats and trends.
3. All analytics are privacy-friendly (no cookies, no personal data stored).

## How to Deploy

1. Update your code and configuration as needed.
2. Run `npx wrangler deploy` to deploy to Cloudflare Workers.
3. The viewer count will be live and visible on all pages with the integration.