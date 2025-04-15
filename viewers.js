/**
 * Live Viewer Counter
 * Works in both local Express server (Socket.io) and 
 * production Cloudflare Pages (with Durable Objects) environments
 */

class ViewerCounter {
  constructor() {
    this.count = 0;
    this.counterElements = [];
    this.isProduction = !window.location.hostname.includes('localhost');
    this.init();
  }

  init() {
    // Initialize the counter elements
    this.counterElements = document.querySelectorAll('.viewer-count');
    
    if (this.isProduction) {
      // Production environment (Cloudflare Pages)
      this.initCloudflare();
    } else {
      // Development environment (Local Express server with Socket.io)
      this.initSocketIO();
    }
  }

  updateUI(count) {
    this.count = count;
    this.counterElements.forEach(element => {
      element.textContent = count;
    });
  }

  async initCloudflare() {
    try {
      // Register connection
      const response = await fetch('/api/viewers/connect');
      const data = await response.json();
      this.updateUI(data.count);
      
      // Set up polling to keep the count updated
      this.startPolling();
      
      // Register disconnect event on page unload
      window.addEventListener('beforeunload', async () => {
        try {
          await fetch('/api/viewers/disconnect', { 
            method: 'POST',
            keepalive: true 
          });
        } catch (error) {
          console.error('Error disconnecting viewer:', error);
        }
      });
    } catch (error) {
      console.error('Error connecting to viewer counter:', error);
    }
  }

  startPolling() {
    // Poll every 5 seconds to get updated viewer count
    setInterval(async () => {
      try {
        const response = await fetch('/api/viewers');
        const data = await response.json();
        this.updateUI(data.count);
      } catch (error) {
        console.error('Error polling viewer count:', error);
      }
    }, 5000);
  }

  initSocketIO() {
    // Load Socket.io from the server
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;
    
    script.onload = () => {
      // Connect to Socket.io once the script is loaded
      const socket = io();
      
      // Handle viewer count updates
      socket.on('viewerCount', (count) => {
        this.updateUI(count);
      });
    };
    
    script.onerror = (error) => {
      console.error('Error loading Socket.io:', error);
    };
    
    document.head.appendChild(script);
  }
}

// Initialize the viewer counter when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ViewerCounter();
});
