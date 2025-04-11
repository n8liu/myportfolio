# My Portfolio

A personal portfolio website showcasing professional skills, projects, and photography, with a clean dark-themed design.

## Features

- Responsive design for all screen sizes
- Interactive tech stack showcase with logos and descriptions
- Projects section highlighting development work
- Dynamic photography gallery with category navigation
- Image modal for fullscreen viewing
- Integration with Cloudflare R2 for image storage
- Automatic category detection based on folder structure in R2 bucket
- Smooth scroll animations and transitions
- Back-to-top button that appears when reaching the bottom of the page

## Site Structure

- **Main Section**: Introduction and profile
- **About Section**: Skills and education information
- **Tech Stack Section**: Showcase of programming languages, frameworks, and tools
- **Projects Section**: Featured development projects
- **Photography Section**: Gallery of photography work

## Tech Stack

The portfolio website features a comprehensive tech stack section that displays various programming languages, frameworks, libraries, and tools using a card-based grid layout. Each card includes:

- Logo of the technology
- Name displayed underneath
- Hover effects for better user interaction

Technologies are arranged from most frequently used to more specialized ones.

## UI/UX Features

- Dark theme with consistent color scheme (#1e1e1e background with light text)
- Section spacing of 300px for better content separation
- Fixed footer with social links that appears on scroll
- Smooth scroll indicators and animations
- Fade-in/fade-out back-to-top button at the bottom right when reaching end of page

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your Cloudflare R2 credentials:
   ```
   R2_ACCOUNT_ID=your-cloudflare-account-id
   R2_ACCESS_KEY_ID=your-r2-access-key
   R2_SECRET_ACCESS_KEY=your-r2-secret-key
   R2_BUCKET_NAME=myportfolio
   R2_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Cloudflare Pages

### Prerequisites

1. Install Cloudflare Wrangler CLI:
   ```
   npm install -g wrangler
   ```
2. Login to Cloudflare:
   ```
   wrangler login
   ```

### Deployment Steps

1. Build the static site:
   ```
   npm run build
   ```

2. Deploy to Cloudflare Pages:
   ```
   npm run deploy
   ```
   
   Alternatively, you can manually deploy:
   ```
   wrangler pages deploy dist
   ```

3. Configure Environment Variables in Cloudflare Pages Dashboard:
   - Go to your Cloudflare Pages project settings
   - Navigate to "Settings" > "Environment variables"
   - Add the following variables:
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_BUCKET_NAME`
     - `R2_ENDPOINT`

### Using Cloudflare R2

1. Create a Cloudflare R2 bucket named "myportfolio" (or use your custom name and update config)
2. Organize photos in folders to create categories (e.g., "california/beach.jpg", "japan/tokyo.jpg")
3. The page will automatically detect these folders and create navigation categories

## File Structure

- `index.html` - Main portfolio page with all sections (about, tech stack, projects)
- `photos.html` - Photography gallery page
- `styles.css` - Main stylesheet for the entire website
- `assets/` - Directory containing images and other static assets
- `server.js` - Express server for local development
- `functions/_middleware.js` - Cloudflare Pages Functions for API endpoints
- `utils/cloudflare.js` - Utility functions for Cloudflare R2 interaction

## License

ISC