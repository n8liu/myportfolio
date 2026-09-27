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
      // Each document gets its own ID, including duplicated tabs and reloads.
      this.sessionId = crypto.randomUUID();
      this.startPolling(workerBase);

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
    let inFlight = false;
    let pageActive = true;

    const poll = async () => {
      if (!pageActive || document.hidden || inFlight) return;
      inFlight = true;
      const sessionId = this.sessionId;
      try {
        const response = await fetch(`${workerBase}/api/viewers/heartbeat?session=${sessionId}`, {
          method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`Viewer API returned ${response.status}`);
        const data = await response.json();
        if (pageActive && sessionId === this.sessionId) this.updateUI(data.count);
      } catch (error) {
        console.error('Error polling viewer count:', error);
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (!pollingInterval && pageActive && !document.hidden) {
        pollingInterval = setInterval(poll, 5000);
      }
    };
    const stop = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = null;
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stop();
      } else {
        poll();
        start();
      }
    });
    window.addEventListener('pagehide', () => {
      pageActive = false;
      stop();
      // Best effort only: the server expires the lease if this never arrives.
      fetch(`${workerBase}/api/viewers/disconnect?session=${this.sessionId}`, {
        method: 'POST', keepalive: true, cache: 'no-store'
      }).catch(() => {});
    });
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      // A new ID prevents a delayed disconnect from removing a restored tab.
      this.sessionId = crypto.randomUUID();
      pageActive = true;
      poll();
      start();
    });

    poll();
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
