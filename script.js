// Client-side JavaScript for Retro OS Portfolio Redesign
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = '';

    // ----------------------------------------------------
    // Minimalist Interactive Wallpaper (Cursor Glow & Parallax Grid)
    // ----------------------------------------------------
    let mouseTicking = false;
    window.addEventListener('pointermove', function(e) {
        if (!mouseTicking) {
            window.requestAnimationFrame(function() {
                const x = e.clientX;
                const y = e.clientY;
                const px = ((x / window.innerWidth) - 0.5) * 2; // -1 to 1
                const py = ((y / window.innerHeight) - 0.5) * 2; // -1 to 1

                document.documentElement.style.setProperty('--mouse-x', `${x}px`);
                document.documentElement.style.setProperty('--mouse-y', `${y}px`);
                document.documentElement.style.setProperty('--mouse-px', px.toFixed(3));
                document.documentElement.style.setProperty('--mouse-py', py.toFixed(3));
                mouseTicking = false;
            });
            mouseTicking = true;
        }
    }, { passive: true });

    // ----------------------------------------------------
    // Draggable Window Logic
    // ----------------------------------------------------
    function makeElementDraggable(windowEl, titlebar) {
        if (!windowEl || !titlebar) return;
        
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let offsetX = 0;
        let offsetY = 0;

        titlebar.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);

        // Touch support
        titlebar.addEventListener('touchstart', dragStart, { passive: true });
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            if (window.innerWidth <= 768) return; // Disable dragging on mobile
            
            // Do not drag if clicking controls or buttons
            if (e.target.closest('.win-btn') || e.target.closest('.menu-item')) return;

            isDragging = true;
            
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
            
            startX = clientX - offsetX;
            startY = clientY - offsetY;
            
            windowEl.style.transition = 'none';
            windowEl.classList.add('dragging');
        }

        function dragMove(e) {
            if (!isDragging) return;
            
            if (e.cancelable) e.preventDefault();

            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

            offsetX = clientX - startX;
            offsetY = clientY - startY;

            windowEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }

        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            windowEl.style.transition = '';
            windowEl.classList.remove('dragging');
        }

        // Expose a reset method
        windowEl.resetDrag = function() {
            offsetX = 0;
            offsetY = 0;
            windowEl.style.transform = '';
        };
    }

    // Apply dragging to main window
    makeElementDraggable(document.querySelector('.os-window'), document.querySelector('.window-titlebar'));

    // Apply dragging to all modal dialogs (like photo viewer and blog reader)
    document.querySelectorAll('.modal-dialog').forEach(modalDialog => {
        const modalTitlebar = modalDialog.querySelector('.modal-titlebar');
        if (modalTitlebar) {
            makeElementDraggable(modalDialog, modalTitlebar);
        }
    });


    // ----------------------------------------------------
    // 1. Tab Switching Logic (Carolyn Wang Inspired Layout)
    // ----------------------------------------------------
    const navTabs = document.querySelectorAll('.nav-tab:not(.theme-toggle)');
    const panels = document.querySelectorAll('.panel');
    const pathText = document.getElementById('window-path-text');
    const scrollContainer = document.querySelector('.window-body');

    const pathMappings = {
        'home': 'C:\\nathan\\portfolio\\home.md',
        'experience': 'C:\\nathan\\portfolio\\experience.txt',
        'projects': 'C:\\nathan\\portfolio\\projects.bat',
        'education': 'C:\\nathan\\portfolio\\academics.doc',
        'photography': 'C:\\nathan\\portfolio\\gallery.exe',
        'blog': 'C:\\nathan\\portfolio\\blog.ini',
        'stats': 'C:\\nathan\\portfolio\\dashboard.sys'
    };

    function switchTab(tabName) {
        // Remove active class from all tabs and panels
        navTabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        // Find corresponding tab and panel
        const targetTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        const targetPanel = document.getElementById(`panel-${tabName}`);

        if (targetTab && targetPanel) {
            targetTab.classList.add('active');
            targetPanel.classList.add('active');

            // Update path text in title bar
            if (pathText) {
                pathText.textContent = pathMappings[tabName] || `C:\\nathan\\portfolio\\${tabName}.md`;
            }

            // Scroll window content to top
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }

            // Load tab-specific dynamic content
            if (tabName === 'stats') {
                loadStatsAndRenderChart();
            } else if (tabName === 'photography') {
                initPhotographyGallery();
            }
        }
    }

    function getTabFromPath() {
        const path = window.location.pathname.substring(1); // Remove leading slash
        const cleanPath = path.replace('.html', '').toLowerCase();
        return pathMappings[cleanPath] ? cleanPath : null;
    }

    // Bind tab clicks
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
            // Update URL using History API
            const newPath = tabName === 'home' ? '/' : `/${tabName}`;
            if (window.location.pathname !== newPath) {
                history.pushState({ tab: tabName }, '', newPath);
            }
        });
    });

    // Handle back/forward navigation
    window.addEventListener('popstate', function(e) {
        const tabName = (e.state && e.state.tab) || getTabFromPath() || 'home';
        switchTab(tabName);
    });

    // Check URL path on page load
    const initialTab = getTabFromPath();
    if (initialTab) {
        switchTab(initialTab);
        history.replaceState({ tab: initialTab }, '', window.location.pathname);
    } else {
        switchTab('home');
        history.replaceState({ tab: 'home' }, '', '/');
    }

    // ----------------------------------------------------
    // 2. Status Bar Clock Update
    // ----------------------------------------------------
    const clockElement = document.getElementById('taskbar-time');
    
    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Handle 0 as 12
        const hoursStr = String(hours).padStart(2, '0');
        clockElement.textContent = `${hoursStr}:${minutes} ${ampm}`;
    }
    
    setInterval(updateClock, 1000);
    updateClock(); // Initial run

    // ----------------------------------------------------
    // 3. Stats & Chart.js Configuration
    // ----------------------------------------------------
    let statsChartInstance = null;

    async function loadStatsAndRenderChart() {
        const totalViewsEl = document.getElementById('cf-total-views');
        const uniqueViewsEl = document.getElementById('unique-visitors');
        const views24hEl = document.getElementById('requests-24h');
        const resumeClicksEl = document.getElementById('resume-clicks');

        // Fetch counts
        fetch(API_BASE + '/api/total')
            .then(res => res.json())
            .then(data => {
                if (totalViewsEl) totalViewsEl.textContent = data.total ?? '0';
            }).catch(() => { if (totalViewsEl) totalViewsEl.textContent = '?'; });

        fetch(API_BASE + '/api/unique/count')
            .then(res => res.json())
            .then(data => {
                if (uniqueViewsEl) uniqueViewsEl.textContent = data.count ?? '0';
            }).catch(() => { if (uniqueViewsEl) uniqueViewsEl.textContent = '?'; });

        fetch(API_BASE + '/api/total/requests24h')
            .then(res => res.json())
            .then(data => {
                if (views24hEl) views24hEl.textContent = data.requests24h ?? '0';
            }).catch(() => { if (views24hEl) views24hEl.textContent = '?'; });

        fetch(API_BASE + '/api/resume/count')
            .then(res => res.json())
            .then(data => {
                if (resumeClicksEl) resumeClicksEl.textContent = data.clicks ?? '0';
            }).catch(() => { if (resumeClicksEl) resumeClicksEl.textContent = '?'; });

        // Fetch histories and render Chart.js
        try {
            const [totalRes, uniqueRes] = await Promise.all([
                fetch(API_BASE + '/api/total/history7d').then(r => r.json()),
                fetch(API_BASE + '/api/unique/history7d').then(r => r.json())
            ]);

            const labels = totalRes.days.map(ts => {
                const d = new Date(ts);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            });

            const ctx = document.getElementById('statsChart');
            if (!ctx) return;

            // Destroy existing instance to avoid duplicates
            if (statsChartInstance) {
                statsChartInstance.destroy();
            }

            const borderCol = '#1e1e1e';
            const textCol = '#1e1e1e';
            const gridCol = 'rgba(30, 30, 30, 0.05)';

            statsChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Views',
                            data: totalRes.counts,
                            borderColor: borderCol,
                            backgroundColor: 'rgba(81, 57, 137, 0.2)', // Light purple fill
                            borderWidth: 2,
                            pointBackgroundColor: '#513989',
                            pointBorderColor: borderCol,
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            fill: true,
                            tension: 0.1
                        },
                        {
                            label: 'Unique Viewers',
                            data: uniqueRes.counts,
                            borderColor: borderCol,
                            backgroundColor: 'rgba(241, 158, 56, 0.2)', // Light orange fill
                            borderWidth: 2,
                            pointBackgroundColor: '#f19e38',
                            pointBorderColor: borderCol,
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            fill: true,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            bottom: 12,
                            left: 8,
                            right: 8,
                            top: 4
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    family: "'Space Mono', monospace",
                                    size: 11,
                                    weight: 'bold'
                                },
                                color: textCol
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: gridCol
                            },
                            ticks: {
                                font: {
                                    family: "'Space Mono', monospace",
                                    size: 10
                                },
                                color: textCol
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: gridCol
                            },
                            ticks: {
                                precision: 0,
                                font: {
                                    family: "'Space Mono', monospace",
                                    size: 10
                                },
                                color: textCol
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering stats chart:', error);
        }
    }

    // ----------------------------------------------------
    // 4. Photography Gallery & Modal Popups
    // ----------------------------------------------------
    let photographyInitialized = false;
    const photoGrid = document.getElementById('portfolio-photo-grid');
    const photoCategoryFilters = document.getElementById('photo-category-filters');
    const photoModal = document.getElementById('photo-modal');
    const modalImage = document.getElementById('modal-image');
    const modalPhotoName = document.getElementById('modal-photo-name');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // EXIF Elements
    const exifCamera = document.getElementById('exif-camera');
    const exifLens = document.getElementById('exif-lens');
    const exifExposure = document.getElementById('exif-exposure');
    const exifAperture = document.getElementById('exif-aperture');
    const exifIso = document.getElementById('exif-iso');
    const exifLocation = document.getElementById('exif-location');

    async function initPhotographyGallery() {
        if (photographyInitialized) return;
        photographyInitialized = true;

        // Fetch categories dynamically
        try {
            const response = await fetch(window.location.origin + '/api/categories');
            if (response.ok) {
                const categories = await response.json();
                if (categories && categories.length > 0) {
                    // Populate category filter controls
                    if (photoCategoryFilters) {
                        photoCategoryFilters.innerHTML = '<button class="photo-cat active" data-category="all">all</button>';
                        categories.forEach(cat => {
                            const btn = document.createElement('button');
                            btn.className = 'photo-cat';
                            btn.setAttribute('data-category', cat.name);
                            btn.textContent = cat.displayName || cat.name.toLowerCase();
                            photoCategoryFilters.appendChild(btn);
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load dynamic categories from API, using static default list.', e);
        }

        // Bind filter button click events
        if (photoCategoryFilters) {
            photoCategoryFilters.addEventListener('click', function(e) {
                const target = e.target;
                if (target.classList.contains('photo-cat')) {
                    document.querySelectorAll('.photo-cat').forEach(b => b.classList.remove('active'));
                    target.classList.add('active');
                    const category = target.getAttribute('data-category');
                    loadPhotosByCategory(category);
                }
            });
        }

        // Initial load
        loadPhotosByCategory('all');
    }

    async function loadPhotosByCategory(category) {
        if (!photoGrid) return;
        photoGrid.innerHTML = '<div style="font-family: var(--font-mono); padding: 2rem; grid-column: 1/-1; text-align: center;">loading photos...</div>';

        try {
            const response = await fetch(window.location.origin + `/api/images/${category}`);
            if (!response.ok) throw new Error('API error');
            const images = await response.json();

            if (images.length === 0) {
                photoGrid.innerHTML = '<div style="font-family: var(--font-mono); padding: 2rem; grid-column: 1/-1; text-align: center;">no images found in this category.</div>';
                return;
            }

            renderPhotos(images);
        } catch (e) {
            console.warn('Error fetching category images, falling back to static list.', e);
            loadFallbackPhotos(category);
        }
    }

    function loadFallbackPhotos(category) {
        // Fallback static items
        const fallbacks = [
            { url: 'assets/featured-photo.png', name: 'Berkeley Sunset', camera: 'Fujifilm X-T5', lens: 'XF 35mm F1.4 R', exposure: '1/250s', aperture: 'f/4.0', iso: '400', location: 'California' },
            { url: 'assets/landscape-photo.png', name: 'Pacific Coast', camera: 'Fujifilm X-T5', lens: 'XF 18-55mm F2.8-4 R LM OIS', exposure: '1/500s', aperture: 'f/8.0', iso: '125', location: 'California' },
            { url: 'assets/urban-photo.png', name: 'Shibuya Crossing', camera: 'Fujifilm X-T5', lens: 'XF 35mm F1.4 R', exposure: '1/125s', aperture: 'f/2.0', iso: '800', location: 'Japan' }
        ];

        const filtered = category === 'all' 
            ? fallbacks 
            : fallbacks.filter(f => f.location.toLowerCase().includes(category) || category === 'california' && f.location === 'California');

        if (filtered.length === 0) {
            photoGrid.innerHTML = '<div style="font-family: var(--font-mono); padding: 2rem; grid-column: 1/-1; text-align: center;">no fallback images in this category.</div>';
            return;
        }
        renderPhotos(filtered);
    }

    function renderPhotos(images) {
        if (!photoGrid) return;
        photoGrid.innerHTML = '';

        images.forEach(image => {
            const card = document.createElement('div');
            card.className = 'photo-card';

            const img = document.createElement('img');
            let imgUrl = image.url;
            if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
                imgUrl = '/' + imgUrl;
            }
            img.src = imgUrl;
            img.alt = image.name || 'Portfolio photo';
            img.loading = 'lazy';

            card.appendChild(img);
            card.addEventListener('click', () => openPhotoModal(image));
            photoGrid.appendChild(card);
        });
    }

    function openPhotoModal(photo) {
        if (!photoModal || !modalImage || !modalPhotoName) return;

        // Reset drag position of the dialog
        const modalDialog = photoModal.querySelector('.modal-dialog');
        if (modalDialog && typeof modalDialog.resetDrag === 'function') {
            modalDialog.resetDrag();
        }

        let imgUrl = photo.url;
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
            imgUrl = '/' + imgUrl;
        }

        modalImage.src = imgUrl;
        modalPhotoName.textContent = photo.name || 'Untitled Image';

        // EXIF data mapping
        exifCamera.textContent = photo.camera || photo.exif?.camera || 'Fujifilm X-T5';
        exifLens.textContent = photo.lens || photo.exif?.lens || 'XF 35mm F1.4 R';
        exifExposure.textContent = photo.exposure || photo.exif?.exposure || '1/250s';
        exifAperture.textContent = photo.aperture || photo.exif?.aperture || 'f/5.6';
        exifIso.textContent = photo.iso || photo.exif?.iso || '200';
        exifLocation.textContent = photo.location || photo.exif?.location || 'California';

        photoModal.classList.add('active');
    }

    function closePhotoModal() {
        if (photoModal) {
            photoModal.classList.remove('active');
        }
    }

    // Modal Close hooks
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closePhotoModal);
    }
    if (photoModal) {
        photoModal.addEventListener('click', function(e) {
            if (e.target === photoModal) {
                closePhotoModal();
            }
        });
    }

    // Global hook for fallback inline clicks in HTML placeholders
    window.openFallbackPhoto = function(type) {
        const fallbacks = {
            'featured': { url: 'assets/featured-photo.png', name: 'Berkeley Sunset', camera: 'Fujifilm X-T5', lens: 'XF 35mm F1.4 R', exposure: '1/250s', aperture: 'f/4.0', iso: '400', location: 'California' },
            'landscape': { url: 'assets/landscape-photo.png', name: 'Pacific Coast Highway', camera: 'Fujifilm X-T5', lens: 'XF 18-55mm F2.8-4 R LM OIS', exposure: '1/500s', aperture: 'f/8.0', iso: '125', location: 'California' },
            'urban': { url: 'assets/urban-photo.png', name: 'Shibuya Streets', camera: 'Fujifilm X-T5', lens: 'XF 35mm F1.4 R', exposure: '1/125s', aperture: 'f/2.0', iso: '800', location: 'Japan' }
        };
        if (fallbacks[type]) {
            openPhotoModal(fallbacks[type]);
        }
    };

    // ----------------------------------------------------
    // 4.5. Dynamic Blog Modal Reader
    // ----------------------------------------------------
    const blogModal = document.getElementById('blog-modal');
    const blogModalCloseBtn = document.getElementById('blog-modal-close-btn');
    const modalBlogTitle = document.getElementById('modal-blog-title');
    const modalBlogDate = document.getElementById('modal-blog-date');
    const modalBlogContent = document.getElementById('modal-blog-content');
    const modalBlogFilename = document.getElementById('modal-blog-filename');

    async function openBlogModal(blogUrl) {
        if (!blogModal || !modalBlogTitle || !modalBlogDate || !modalBlogContent) return;

        // Reset drag position of the dialog
        const modalDialog = blogModal.querySelector('.modal-dialog');
        if (modalDialog && typeof modalDialog.resetDrag === 'function') {
            modalDialog.resetDrag();
        }

        // Show loading state first
        modalBlogTitle.textContent = "Loading post...";
        modalBlogDate.textContent = "";
        modalBlogContent.innerHTML = "<div style='font-family: var(--font-mono); text-align: center; padding: 2rem;'>fetching content...</div>";
        modalBlogFilename.textContent = blogUrl.split('/').pop();
        
        blogModal.classList.add('active');

        try {
            const response = await fetch(blogUrl);
            if (!response.ok) throw new Error("Could not fetch blog post.");
            const htmlText = await response.text();
            
            // Parse content using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            const titleEl = doc.querySelector('.blog-title');
            const dateEl = doc.querySelector('.blog-date');
            const contentEl = doc.querySelector('.blog-content');

            if (titleEl && dateEl && contentEl) {
                // Remove any back-link from content if it exists
                const backLinks = contentEl.querySelectorAll('.back-link');
                backLinks.forEach(bl => bl.remove());

                modalBlogTitle.innerHTML = titleEl.innerHTML;
                modalBlogDate.innerHTML = dateEl.innerHTML;
                modalBlogContent.innerHTML = contentEl.innerHTML;
            } else {
                throw new Error("Invalid blog post structure.");
            }
        } catch (error) {
            console.error("Error loading blog post:", error);
            modalBlogTitle.textContent = "Error Loading Post";
            modalBlogContent.innerHTML = `<div style='font-family: var(--font-mono); color: #ff7675; text-align: center; padding: 2rem;'>
                Could not load the blog post. Click <a href="${blogUrl}" style="color: var(--accent); font-weight: 700;">here</a> to open it directly.
            </div>`;
        }
    }

    function closeBlogModal() {
        if (blogModal) {
            blogModal.classList.remove('active');
        }
    }

    // Attach click listeners to blog cards
    document.querySelectorAll('.read-blog-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('href');
            if (url) {
                openBlogModal(url);
            }
        });
    });

    if (blogModalCloseBtn) {
        blogModalCloseBtn.addEventListener('click', closeBlogModal);
    }

    if (blogModal) {
        blogModal.addEventListener('click', function(e) {
            if (e.target === blogModal) {
                closeBlogModal();
            }
        });
    }

    // ----------------------------------------------------
    // 5. Tracking & Transitions
    // ----------------------------------------------------
    // Resume clicks tracking
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', function() {
            fetch(API_BASE + '/api/resume/increment', { method: 'POST' })
                .catch(() => {});
        });
    }

    // Fade in page body
    document.body.classList.add('loaded');
});
