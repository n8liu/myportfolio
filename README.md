# My Portfolio 3.0

A modern, responsive personal portfolio website showcasing professional skills, projects, and photography with a clean dark-themed design. Built with Node.js, Express, and Cloudflare's edge computing platform.

![Portfolio Preview](assets/preview.png)

## Table of Contents
- [Overview](#overview)
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

## Overview

This portfolio website is a comprehensive showcase of my professional journey, featuring:
- Modern, responsive design with a dark theme
- Real-time viewer count using Socket.IO
- Dynamic photography gallery with EXIF data
- Project showcase with interactive elements
- Cloud integration with Cloudflare for hosting and storage
- Analytics dashboard for tracking visitor statistics
- UC Berkeley education and course highlights

## Features

### Interface
- Responsive design optimized for all screen sizes
- Dark theme with consistent color scheme (#121212 background with light text)
- Smooth scroll animations and transitions
- Fixed footer with social links
- Back-to-top button
- Live viewer count display
- Interactive tech stack showcase
- Hover effects and micro-interactions

### Content Sections
- **Main Section**: Introduction and profile
- **About Section**: Skills and education information
- **Tech Stack Section**: Interactive showcase with logos
- **Projects Section**: Featured development work
- **Education Section**: UC Berkeley courses and achievements
- **Photography Section**: Gallery with category navigation and EXIF data
- **Analytics Dashboard**: Visitor statistics and trends

### Photography Features
- Dynamic gallery with category navigation
- Image modal for fullscreen viewing
- EXIF data extraction for camera settings
- Automatic category detection
- Responsive image gallery with filtering
- Real-time updates using Socket.IO
- Lazy loading for optimal performance

## Tech Stack

### Core Technologies
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Cloud**: Cloudflare Pages, R2 Storage
- **Image Processing**: ExifReader
- **Storage**: AWS SDK (for R2 compatibility)
- **Analytics**: Custom tracking system

### Development Tools
- **Package Manager**: npm
- **Development Server**: nodemon
- **Build Tool**: Wrangler CLI
- **Version Control**: Git
- **Code Editor**: VS Code
- **Browser Tools**: Chrome DevTools

## Project Structure

### Key Files
- `index.html` - Main portfolio page
- `photos.html` - Photography gallery
- `database.html` - Analytics dashboard
- `styles.css` - Main stylesheet
- `script.js` - Main JavaScript
- `viewers.js` - Viewer count functionality
- `server.js` - Express server
- `wrangler.toml` - Cloudflare configuration
- `_headers` - Security headers configuration

### Directories
- `assets/` - Static assets and images
- `functions/` - Cloudflare Functions
- `utils/` - Utility functions
- `photos/` - Photography gallery images
- `resize/` - Image processing scripts
- `dist/` - Build directory
- `.github/` - GitHub Actions workflows

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
   Create a `.env` file with:
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

5. **Access the site**
   Open `http://localhost:3000` in your browser

## Deployment

### Cloudflare Pages Setup

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   npm run deploy
   ```

4. **Configure Environment Variables**
   In Cloudflare Pages Dashboard:
   - Add all required R2 environment variables
   - Configure build settings if needed
   - Set up custom domains if desired

## Image Management

### Cloudflare R2 Setup
1. Create an R2 bucket
2. Organize photos in category folders
3. Upload images with proper naming conventions
4. Configure CORS settings for image access

### Image Processing
- Automatic resizing for optimization
- EXIF data extraction
- Category-based organization
- Lazy loading implementation
- WebP format conversion

## Live Viewer Count

The portfolio features a real-time viewer count powered by Socket.IO:
- Updates automatically as users visit/leave
- Displayed on all pages
- Implemented using WebSocket connections
- Updates every 10 seconds
- Fallback mechanism for connection issues

## Analytics & Statistics

The analytics dashboard (`database.html`) provides:
- Total page views
- Unique visitors
- Resume button clicks
- 24-hour statistics
- 7-day history graphs
- Real-time updates
- Visitor location data
- Referral sources

### API Endpoints
- `/api/viewers` - Current viewer count
- `/api/total` - Total page views
- `/api/unique` - Unique visitor stats
- `/api/resume` - Resume button clicks
- `/api/location` - Visitor location data
- `/api/referrals` - Referral source statistics

## Technical Details

### Performance Optimizations
- Responsive image loading
- Lazy loading for gallery images
- Minified assets
- Edge caching with Cloudflare
- Code splitting
- Asset preloading
- Browser caching

### Security Features
- Environment variable protection
- Secure API endpoints
- Rate limiting
- CORS configuration
- Content Security Policy
- XSS protection
- HTTPS enforcement

### Future Improvements
- Enhanced analytics dashboard
- More interactive projects section
- Blog integration
- Contact form with validation
- Dark/Light theme toggle
- Internationalization support
- Progressive Web App features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Contact

- LinkedIn: [n8liu](https://www.linkedin.com/in/n8liu/)
- GitHub: [n8liu](https://github.com/n8liu)
- Email: nathan.dtliu@gmail.com
- Portfolio: [nathanliu.dev](https://nathanliu.dev)