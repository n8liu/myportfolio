/**
 * Live Viewer Counter
 * Works in both local Express server (Socket.io) and 
 * production Cloudflare Pages (with Durable Objects) environments.
 */

class ViewerCounter {
  constructor() {
    this.count = 0;
    this.counterElements = [];
    this.isProduction = !window.location.hostname.includes('localhost') && 
                        !window.location.hostname.includes('127.0.0.1') &&
                        !window.location.hostname.includes('0.0.0.0');
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
    const workerBase = '';
    try {
      // Register connection
      const response = await fetch(`${workerBase}/api/viewers/connect`);
      const data = await response.json();
      this.updateUI(data.count);
      
      // Set up polling to keep the count updated
      this.startPolling(workerBase);
      
      // Register disconnect event on page unload
      window.addEventListener('beforeunload', async () => {
        try {
          await fetch(`${workerBase}/api/viewers/disconnect`, { 
            method: 'POST',
            keepalive: true 
          });
        } catch (error) {
          console.error('Error disconnecting viewer:', error);
        }
      });

      // Only increment total page views and unique visitors if this is NOT a reload or back/forward
      let isNewVisit = true;
      if (performance.getEntriesByType) {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav && (nav.type === "reload" || nav.type === "back_forward")) {
          isNewVisit = false;
        }
      } else if (performance.navigation) {
        if (performance.navigation.type === 1 || performance.navigation.type === 2) {
          isNewVisit = false;
        }
      }
      if (isNewVisit) {
        fetch(`${workerBase}/api/total/increment`, { method: 'POST' }).catch(() => {});
        fetch(`${workerBase}/api/unique/increment`, { method: 'POST' }).catch(() => {});
      }
    } catch (error) {
      console.error('Error connecting to viewer counter:', error);
    }
  }

  startPolling(workerBase) {
    let pollingInterval = null;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`${workerBase}/api/viewers`);
        const data = await response.json();
        this.updateUI(data.count);
      } catch (error) {
        console.error('Error polling viewer count:', error);
      }
    };

    const start = () => {
      if (!pollingInterval) {
        pollingInterval = setInterval(poll, 5000);
      }
    };

    const stop = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    // Pause polling when tab is hidden, resume immediately when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        poll();
        start();
      }
    });

    start();
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
