// Client-side JavaScript for portfolio
document.addEventListener('DOMContentLoaded', function() {
    // Ensure containers exist in static deployment
    
    // Show elements as they scroll into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all sections that should animate on scroll
    document.querySelectorAll('.about-container, .tech-stack-container, .myhobbies-container, .footer').forEach(element => {
        observer.observe(element);
    });

    // Scroll indicator functionality
    const sections = {
        'main': document.querySelector('.main-container'),
        'about': document.querySelector('.about-container'),
        'classes': document.querySelector('.relevant-classes-container'),
        'tech': document.querySelector('.tech-stack-container'),
        'projects': document.querySelector('.projects-container'),
        'hobbies': document.querySelector('.myhobbies-container')
    };

    const dots = document.querySelectorAll('.scroll-dot');

    // Check if device is mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // Function to update active dot based on scroll position
    function updateActiveDot() {
        const sectionElements = Object.entries(sections);
        
        if (isMobile()) {
            // Mobile: vertical scroll logic
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            
            for (let i = 0; i < sectionElements.length; i++) {
                const [section, element] = sectionElements[i];
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    const elementBottom = elementTop + rect.height;
                    
                    // Calculate the transition zone (30% of the viewport height)
                    const transitionZone = window.innerHeight * 0.3;
                    
                    // Get the next section's position if it exists
                    const nextSection = sectionElements[i + 1];
                    const nextElementTop = nextSection ? 
                        nextSection[1].getBoundingClientRect().top + window.scrollY : 
                        elementBottom;
                    
                    // Active if we're in the current section or in the transition zone
                    if (scrollPosition >= elementTop - transitionZone && 
                        scrollPosition <= nextElementTop - transitionZone) {
                        document.querySelector(`.scroll-dot[data-section="${section}"]`).classList.add('active');
                    } else {
                        document.querySelector(`.scroll-dot[data-section="${section}"]`).classList.remove('active');
                    }
                }
            }
        } else {
            // Desktop: horizontal scroll logic
            const scrollPosition = window.scrollX + window.innerWidth / 2;
            const documentWidth = document.documentElement.scrollWidth;
            const windowWidth = window.innerWidth;
            const scrollRight = window.scrollX + windowWidth;
            
            // Check if we're at the right edge of the page
            const isAtEnd = scrollRight >= documentWidth - 50; // 50px threshold
            
            for (let i = 0; i < sectionElements.length; i++) {
                const [section, element] = sectionElements[i];
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const elementLeft = rect.left + window.scrollX;
                    const elementRight = elementLeft + rect.width;
                    
                    // Calculate the transition zone (30% of the viewport width)
                    const transitionZone = window.innerWidth * 0.3;
                    
                    // Get the next section's position if it exists
                    const nextSection = sectionElements[i + 1];
                    const nextElementLeft = nextSection ? 
                        nextSection[1].getBoundingClientRect().left + window.scrollX : 
                        elementRight;
                    
                    // Active if we're in the current section or in the transition zone
                    // For the last section (hobbies), also check if we're at the end
                    if ((scrollPosition >= elementLeft - transitionZone && 
                        scrollPosition <= nextElementLeft - transitionZone) ||
                        (section === 'hobbies' && isAtEnd)) {
                        document.querySelector(`.scroll-dot[data-section="${section}"]`).classList.add('active');
                    } else {
                        document.querySelector(`.scroll-dot[data-section="${section}"]`).classList.remove('active');
                    }
                }
            }
        }
    }

    // Add click event listeners to dots (only for desktop)
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const section = dot.getAttribute('data-section');
            const targetElement = sections[section];
            if (targetElement) {
                if (isMobile()) {
                    // Mobile: simple scroll to top of element
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // Desktop: horizontal scroll behavior
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Update active dot on scroll (only for desktop)
    if (!isMobile()) {
        window.addEventListener('scroll', updateActiveDot);
        // Initial update
        updateActiveDot();
    }

    // Handle scroll behavior - only convert to horizontal on desktop
    function handleWheelScroll(event) {
        // Skip horizontal scroll conversion on mobile
        if (isMobile()) {
            return; // Allow natural vertical scrolling on mobile
        }
        
        // Desktop: Convert vertical scroll to horizontal scroll
        // If there's horizontal scroll input (trackpad), allow it naturally
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            return; // Let natural horizontal scrolling work
        }
        
        // Prevent default vertical scrolling
        event.preventDefault();
        
        // Get the scroll amount from the wheel event
        let scrollAmount = event.deltaY;
        
        // Increase scroll sensitivity for better user experience
        scrollAmount = scrollAmount * 0.5;
        
        // Convert vertical scroll to horizontal scroll
        window.scrollBy({
            left: scrollAmount,
            behavior: 'auto' // Use 'auto' for immediate response to wheel
        });
    }

    // Add wheel event listener (only converts to horizontal on desktop)
    window.addEventListener('wheel', handleWheelScroll, { passive: false });

    // Handle window resize to update scroll behavior
    window.addEventListener('resize', function() {
        // Only update dots for desktop
        if (!isMobile()) {
            updateActiveDot();
        }
    });

    // Function to reset viewer count
    async function resetViewerCount() {
        try {
            const response = await fetch('https://myportfolio.nathanliu528.workers.dev/api/viewers/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                console.log('Viewer count reset successfully');
                // Update the display immediately
                document.querySelector('.viewer-count').textContent = '0';
            }
        } catch (error) {
            console.error('Error resetting viewer count:', error);
        }
    }

    // Call reset function
    resetViewerCount();

    // Increment on connect
    fetch('https://myportfolio.nathanliu528.workers.dev/api/viewers/connect');

    // Only increment total page views if this is NOT a reload or back/forward
    let isNewVisit = true;
    if (performance.getEntriesByType) {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav && (nav.type === "reload" || nav.type === "back_forward")) isNewVisit = false;
    } else if (performance.navigation) {
        if (performance.navigation.type === 1 || performance.navigation.type === 2) isNewVisit = false;
    }
    if (isNewVisit) {
        fetch('https://myportfolio.nathanliu528.workers.dev/api/total/increment');
        // Increment unique visitors Durable Object
        fetch('https://myportfolio.nathanliu528.workers.dev/api/unique/increment');
    }

    async function updateViewerCount() {
        try {
            const res = await fetch('https://myportfolio.nathanliu528.workers.dev/api/viewers');
            const data = await res.json();
            document.querySelector('.viewer-count').textContent = data.count;
        } catch (e) {
            document.querySelector('.viewer-count').textContent = '?';
        }
    }
    updateViewerCount();
    setInterval(updateViewerCount, 10000);

    // Handle page unload/visibility change
    function handleDisconnect() {
        // Use sendBeacon for more reliable disconnect
        const disconnectUrl = 'https://myportfolio.nathanliu528.workers.dev/api/viewers/disconnect';
        if (navigator.sendBeacon) {
            navigator.sendBeacon(disconnectUrl);
        } else {
            // Fallback for browsers that don't support sendBeacon
            fetch(disconnectUrl, { method: 'POST', keepalive: true });
        }
    }

    // Handle page unload
    window.addEventListener('beforeunload', handleDisconnect);
    
    // Handle visibility change (tab close/minimize)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            handleDisconnect();
        }
    });

    // Handle page hide (mobile browsers)
    window.addEventListener('pagehide', handleDisconnect);
});
