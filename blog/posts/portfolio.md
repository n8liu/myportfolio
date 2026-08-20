# How I Built My Portfolio Website

## Starting from Scratch: The Vision

When I set out to build my portfolio website, I knew I wanted something that was truly my own—no templates, no bulky UI frameworks, just a blank canvas. My goal was to create a site that reflected my personality, academic journey at UC Berkeley, and software engineering work, while keeping the user experience snappy and uniquely tactile. I started by sketching ideas in Figma, focusing on a retro workspace layout that felt nostalgic yet modern and functional.

One of the first questions I asked myself was: what do I want visitors to experience when they land on my site? I wanted the feeling of opening an interactive desktop environment—calm, focused, and organized, but filled with thoughtful micro-interactions. This initial concept guided every technical and visual choice from day one.

## Design Philosophy: Retro OS & Neo-Brutalism

Rather than going with generic template styling, I embraced a neo-brutalist, retro OS aesthetic inspired by classic operating system windows and modern design systems like PostHog. The design centers on a warm beige paper grid canvas (`#f4f1ea`), crisp white window containers, high-contrast 2px solid borders, and tactile drop shadows (`4px 4px 0px 0px`).

Typography plays a huge role in establishing this atmosphere. I paired **Space Grotesk** for clean, readable headings and body text with **Space Mono** for metadata badges, navigation paths (like `C:\nathan\portfolio\...`), and code snippets. Every interactive button has a satisfying 1px translation on click, mimicking the feel of a physical mechanical switch.

## Building the Foundation: Vanilla HTML, CSS, and Single-Page Tabs

With the design finalized, I built the frontend completely from scratch using vanilla HTML5, CSS3, and modern ES6 JavaScript. Keeping dependencies to a minimum ensures instant load times and complete control over rendering behavior.

The core navigation uses a lightweight tab-switching mechanism across distinct panels (`home`, `experience`, `projects`, `education`, `photography`, `blog`, and `stats`). Tab states synchronize seamlessly with URL hash routes, enabling direct linking and smooth history navigation without full page reloads. Everything is styled with responsive CSS Grid and Flexbox to ensure the retro window adapts gracefully across both desktop monitors and mobile screens.

## Photography Showcase & Image Optimization Pipeline

One of my favorite features is the photography section. High-resolution camera files can easily weigh over 10MB each, which would destroy web performance if served uncompressed. To solve this, I built an automated image processing pipeline:

* **Batch Optimization:** Used **ImageMagick** scripts to downscale images to optimal viewing widths and compress them with balanced quality curves.
* **Modern Formats:** Converted assets to modern `webp` for maximum compression efficiency.
* **Dynamic EXIF Extraction:** Extracted camera body, lens, exposure time, aperture, ISO, and location metadata using ExifReader so photography enthusiasts can see exact shot details.
* **Cloud Storage:** Connected assets to Cloudflare R2 object storage for rapid edge delivery.

## Serverless Edge, Durable Objects & Real-Time Telemetry

To power the backend without the overhead of maintaining dedicated servers, I deployed the site on **Cloudflare Pages & Workers**. This enables edge computation with sub-millisecond response times globally:

* **Custom Analytics Engine:** Implemented a serverless tracking pipeline with Cloudflare **Durable Objects** to record atomic page views, unique visitors, and daily visit distributions without relying on privacy-invasive third-party trackers.
* **Stats Dashboard:** Integrated **Chart.js** on the dedicated Stats tab, dynamically visualizing a 7-day traffic history alongside live metric cards.
* **Dynamic Markdown Blog Engine:** Built an asynchronous reader that fetches markdown articles on the fly and renders them within a draggable retro text-editor popup, while supporting deep clean URLs (`/blog/:slug`).

## Status Bar and Finishing Touches

To complete the retro desktop experience, I added a persistent status bar along the bottom of the workspace. It displays the current local Berkeley time, live visitor counter telemetry, location coordinates, and social connection links. Subtle touches like keyboard navigation (closing modals with the `Esc` key) and smooth drag physics give the entire site polish and character.

## Continuous Improvement

Building this portfolio has been an ongoing journey of refinement. As I take on new courses, explore distributed backend systems, and tackle new data engineering challenges, I continue to treat this portfolio as a living canvas that evolves alongside my technical growth.

If you have any feedback or want to chat about web architecture, feel free to reach out through my contact links. Thanks for stopping by!
