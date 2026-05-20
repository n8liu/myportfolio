// Tesla Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Time Update
    function updateTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        
        const timeString = `${hours}:${minutes} ${ampm}`;
        document.getElementById('time-display').textContent = timeString;
    }
    
    setInterval(updateTime, 1000);
    updateTime();

    // 2. Tab Switching
    window.switchTab = function(tabId) {
        // Remove active class from all dock icons
        document.querySelectorAll('.dock-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        
        // Add active class to clicked icon (except Home which is a link)
        const activeIcon = document.querySelector(`.dock-icon[data-target="${tabId}"]`);
        if (activeIcon) {
            activeIcon.classList.add('active');
        }

        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target content section
        const targetSection = document.getElementById(`content-${tabId}`);
        if (targetSection) {
            targetSection.classList.add('active');
        } else {
            // Default to home content if not found (or handle specific logic)
            const homeSection = document.getElementById('content-home');
            if (homeSection) homeSection.classList.add('active');
        }
    };

    // 3. Search Functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            // If query exists, switch to projects tab
            if (query.length > 0) {
                switchTab('projects');
                
                // Filter projects
                const projects = document.querySelectorAll('.dashboard-project-card');
                projects.forEach(project => {
                    const title = project.querySelector('.dashboard-project-title').textContent.toLowerCase();
                    const desc = project.querySelector('.dashboard-project-desc').textContent.toLowerCase();
                    const tags = project.querySelector('.tech-tags').textContent.toLowerCase();
                    
                    if (title.includes(query) || desc.includes(query) || tags.includes(query)) {
                        project.style.display = 'block';
                    } else {
                        project.style.display = 'none';
                    }
                });
            } else {
                // Restore all projects
                document.querySelectorAll('.dashboard-project-card').forEach(p => p.style.display = 'block');
            }
        });
    }

    // 4. Page Transition
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
        // Fade out overlay on load
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 100);
    }
});
