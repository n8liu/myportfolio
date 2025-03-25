# My Portfolio

A personal portfolio website showcasing photography and development work, with dynamic image loading from Cloudflare R2.

## Features

- Responsive design for all screen sizes
- Dynamic photography gallery with category navigation
- Image modal for fullscreen viewing
- Integration with Cloudflare R2 for image storage
- Automatic category detection based on folder structure in R2 bucket

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

- `index.html` - Main portfolio page
- `photography.html` - Photography gallery page
- `server.js` - Express server for local development
- `functions/_middleware.js` - Cloudflare Pages Functions for API endpoints
- `utils/cloudflare.js` - Utility functions for Cloudflare R2 interaction

## License

ISC