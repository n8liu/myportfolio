// Client-side JavaScript for Retro OS Portfolio Redesign
document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = '';

    // Lightweight dynamic script loader for on-demand libraries (Chart.js, marked)
    const scriptCache = new Map();
    function loadScript(src) {
        if (scriptCache.has(src)) {
            return scriptCache.get(src);
        }
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        scriptCache.set(src, promise);
        return promise;
    }

    // ----------------------------------------------------
    // Minimalist Interactive Wallpaper (Cursor Glow & Parallax Grid)
    // ----------------------------------------------------
    let mouseTicking = false;
    const isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (!isTouchDevice) {
        window.addEventListener('pointermove', function (e) {
            if (!mouseTicking) {
                window.requestAnimationFrame(function () {
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
    }

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

            // Do not drag if clicking controls, buttons, or editing content
            if (e.target.closest('.win-btn') || e.target.closest('.menu-item') || e.target.closest('.sticky-btn-mini') || e.target.closest('.taskbar-app-btn') || e.target.isContentEditable) return;

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
        windowEl.resetDrag = function () {
            offsetX = 0;
            offsetY = 0;
            windowEl.style.transform = '';
        };
    }

    // Apply dragging to main window - disabled for single-page scrolling to allow seamless page scrolling
    // makeElementDraggable(document.querySelector('.os-window'), document.querySelector('.window-titlebar'));

    // Apply dragging to all modal dialogs (like photo viewer and blog reader)
    document.querySelectorAll('.modal-dialog').forEach(modalDialog => {
        const modalTitlebar = modalDialog.querySelector('.modal-titlebar');
        if (modalTitlebar) {
            makeElementDraggable(modalDialog, modalTitlebar);
        }
    });

    // Apply dragging to Sticky Note widget
    const stickyNoteEl = document.getElementById('sticky-note');
    const stickyHeaderEl = stickyNoteEl ? stickyNoteEl.querySelector('.sticky-note-header') : null;
    if (stickyNoteEl && stickyHeaderEl) {
        makeElementDraggable(stickyNoteEl, stickyHeaderEl);
    }


    // ----------------------------------------------------
    // 1. Window-Contained Scrolling & View Management Engine
    // ----------------------------------------------------
    const navTabs = document.querySelectorAll('.nav-tab:not(.theme-toggle)');
    const pathText = document.getElementById('window-path-text');
    const scrollContainer = document.querySelector('.window-body');

    const mainSections = ['home', 'education', 'experience', 'projects', 'skills'];
    const separatePages = ['photography', 'blog', 'stats'];

    const pathMappings = {
        'home': 'C:\\nathan\\portfolio\\home.md',
        'education': 'C:\\nathan\\portfolio\\academics.doc',
        'experience': 'C:\\nathan\\portfolio\\experience.txt',
        'projects': 'C:\\nathan\\portfolio\\projects.bat',
        'skills': 'C:\\nathan\\portfolio\\skills.cfg',
        'photography': 'C:\\nathan\\portfolio\\gallery.exe',
        'blog': 'C:\\nathan\\portfolio\\blog.ini',
        'stats': 'C:\\nathan\\portfolio\\dashboard.sys'
    };

    let isProgrammaticScroll = false;
    let scrollTimeout = null;

    function updateActiveNav(tabName) {
        navTabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        if (pathText && pathMappings[tabName]) {
            pathText.textContent = pathMappings[tabName];
        }
    }

    function showPageView(viewName) {
        // Hide all page views
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.remove('active');
        });

        // Determine which view to activate
        const targetViewId = separatePages.includes(viewName) ? `view-${viewName}` : 'view-portfolio';
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Trigger dynamic content on separate pages
        if (viewName === 'photography') {
            initPhotographyGallery();
        } else if (viewName === 'stats') {
            loadStatsAndRenderChart();
        } else if (viewName === 'blog') {
            loadBlogPosts();
        }
    }

    function navigateTo(target, updateHistory = true) {
        if (!target) target = 'home';

        if (separatePages.includes(target)) {
            // It's a separate page (photography, blog, stats)
            showPageView(target);
            updateActiveNav(target);

            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }

            if (updateHistory) {
                const newPath = `/${target}`;
                if (window.location.pathname !== newPath) {
                    history.pushState({ page: target }, '', newPath);
                }
            }
        } else {
            // It's one of the main scrolling sections (home, education, experience, projects, skills)
            const portfolioView = document.getElementById('view-portfolio');
            const wasSeparatePage = !portfolioView || !portfolioView.classList.contains('active');
            showPageView('portfolio');
            updateActiveNav(target);

            const targetPanel = document.getElementById(`panel-${target}`);
            if (targetPanel && scrollContainer) {
                isProgrammaticScroll = true;
                if (scrollTimeout) clearTimeout(scrollTimeout);

                if (target === 'home') {
                    scrollContainer.scrollTo({ top: 0, behavior: wasSeparatePage ? 'auto' : 'smooth' });
                } else {
                    const targetTop = targetPanel.offsetTop - 15;
                    scrollContainer.scrollTo({ top: targetTop > 0 ? targetTop : 0, behavior: wasSeparatePage ? 'auto' : 'smooth' });
                }

                scrollTimeout = setTimeout(() => {
                    isProgrammaticScroll = false;
                }, 600);
            }

            if (updateHistory) {
                const newPath = target === 'home' ? '/' : `/${target}`;
                if (window.location.pathname !== newPath) {
                    history.pushState({ page: target }, '', newPath);
                }
            }
        }
    }

    // Keep switchTab & scrollToSection as aliases
    function switchTab(tabName) {
        navigateTo(tabName, true);
    }
    function scrollToSection(tabName, updateHistory = true) {
        navigateTo(tabName, updateHistory);
    }

    function getTabFromPath() {
        const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
        const cleanPath = path.replace('.html', '').toLowerCase();
        if (cleanPath.startsWith('blog/') || cleanPath === 'blog') {
            return 'blog';
        }
        return pathMappings[cleanPath] ? cleanPath : null;
    }

    function getInitialBlogPost() {
        const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (path.startsWith('blog/')) {
            const slug = path.substring(5).replace(/\.(html|md)$/, '');
            if (slug) return slug;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.has('post')) return params.get('post');
        if (params.has('blog')) return params.get('blog');
        if (window.location.hash) {
            const hash = window.location.hash.replace(/^#\/?/, '');
            if (hash.startsWith('blog/')) return hash.substring(5);
        }
        return null;
    }

    // Bind tab clicks
    navTabs.forEach(tab => {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            navigateTo(tabName, true);
        });
    });

    // Handle back/forward navigation
    window.addEventListener('popstate', function (e) {
        const target = (e.state && e.state.page) || getTabFromPath() || 'home';
        navigateTo(target, false);
        if (e.state && e.state.post) {
            openBlogModal(e.state.post, false);
        } else if (blogModal && blogModal.classList.contains('active')) {
            closeBlogModal(false);
        }
    });

    // Scrollspy setup via IntersectionObserver inside .window-body
    function setupScrollspy() {
        if (!('IntersectionObserver' in window) || !scrollContainer) return;

        const mainPanels = document.querySelectorAll('#view-portfolio .panel');

        const observer = new IntersectionObserver((entries) => {
            if (isProgrammaticScroll) return;

            // Only update when view-portfolio is active
            const portfolioView = document.getElementById('view-portfolio');
            if (!portfolioView || !portfolioView.classList.contains('active')) return;

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id.replace('panel-', '');
                    updateActiveNav(sectionId);

                    const newPath = sectionId === 'home' ? '/' : `/${sectionId}`;
                    if (window.location.pathname !== newPath) {
                        history.replaceState({ page: sectionId }, '', newPath);
                    }
                }
            });
        }, {
            root: scrollContainer,
            rootMargin: '-10% 0px -60% 0px',
            threshold: 0
        });

        mainPanels.forEach(panel => observer.observe(panel));
    }

    // Check URL path on page load
    const initialTab = getTabFromPath() || 'home';
    const initialPost = getInitialBlogPost();
    navigateTo(initialTab, false);

    if (initialPost) {
        setTimeout(() => {
            openBlogModal(initialPost, false);
        }, 150);
    }

    setupScrollspy();

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

            // Load Chart.js dynamically on-demand if not already loaded
            if (typeof window.Chart === 'undefined') {
                try {
                    await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js');
                } catch (loadErr) {
                    console.error('Could not load Chart.js from CDN', loadErr);
                    return;
                }
            }

            // Destroy existing instance to avoid duplicates
            if (statsChartInstance) {
                statsChartInstance.destroy();
            }

            const borderCol = '#1e1e1e';
            const textCol = '#1e1e1e';
            const gridCol = 'rgba(30, 30, 30, 0.05)';

            statsChartInstance = new window.Chart(ctx.getContext('2d'), {
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
    // 3.5. Skills Category Filter Logic
    // ----------------------------------------------------
    const skillsCategoryFilters = document.getElementById('skills-category-filters');
    const skillCards = document.querySelectorAll('.skill-category-card');

    if (skillsCategoryFilters && skillCards.length > 0) {
        skillsCategoryFilters.addEventListener('click', function (e) {
            const btn = e.target.closest('.skill-cat');
            if (!btn) return;

            skillsCategoryFilters.querySelectorAll('.skill-cat').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const selectedCat = btn.getAttribute('data-skill-cat');
            skillCards.forEach(card => {
                const cardCat = card.getAttribute('data-category');
                if (selectedCat === 'all' || cardCat === selectedCat) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
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
            const response = await fetch((API_BASE || '') + '/api/categories');
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
            photoCategoryFilters.addEventListener('click', function (e) {
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
            const response = await fetch((API_BASE || '') + `/api/images/${category}`);
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
            { url: 'assets/featured-photo.png', name: 'Berkeley Sunset', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/250s', aperture: 'f/4.0', iso: '400', location: 'California' },
            { url: 'assets/landscape-photo.png', name: 'Pacific Coast', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/500s', aperture: 'f/8.0', iso: '125', location: 'California' },
            { url: 'assets/urban-photo.png', name: 'Shibuya Crossing', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/125s', aperture: 'f/2.0', iso: '800', location: 'Japan' }
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
        exifCamera.textContent = photo.camera || photo.exif?.camera || 'Fujifilm X100VI';
        exifLens.textContent = photo.lens || photo.exif?.lens || 'Fujinon 23mm F2.0 (Fixed)';
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
        photoModal.addEventListener('click', function (e) {
            if (e.target === photoModal) {
                closePhotoModal();
            }
        });
    }

    // Global hook for fallback inline clicks in HTML placeholders
    window.openFallbackPhoto = function (type) {
        const fallbacks = {
            'featured': { url: 'assets/featured-photo.png', name: 'Berkeley Sunset', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/250s', aperture: 'f/4.0', iso: '400', location: 'California' },
            'landscape': { url: 'assets/landscape-photo.png', name: 'Pacific Coast Highway', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/500s', aperture: 'f/8.0', iso: '125', location: 'California' },
            'urban': { url: 'assets/urban-photo.png', name: 'Shibuya Streets', camera: 'Fujifilm X100VI', lens: 'Fujinon 23mm F2.0 (Fixed)', exposure: '1/125s', aperture: 'f/2.0', iso: '800', location: 'Japan' }
        };
        if (fallbacks[type]) {
            openPhotoModal(fallbacks[type]);
        }
    };

    // ----------------------------------------------------
    // 4.5. Dynamic Markdown Blog Reader
    // ----------------------------------------------------
    const blogModal = document.getElementById('blog-modal');
    const blogModalCloseBtn = document.getElementById('blog-modal-close-btn');
    const modalBlogTitle = document.getElementById('modal-blog-title');
    const modalBlogDate = document.getElementById('modal-blog-date');
    const modalBlogContent = document.getElementById('modal-blog-content');
    const modalBlogFilename = document.getElementById('modal-blog-filename');
    const blogCardsContainer = document.getElementById('blog-cards-container');

    const DEFAULT_BLOG_POSTS = [
        {
            "id": "matcha",
            "title": "Ranking Every Matcha I Tried!",
            "date": "Aug. 20, 2026",
            "datetime": "2026-08-20",
            "readTime": "2 min read",
            "summary": "Matcha this, matcha that. I love matcha, so here is every matcha I have tried.",
            "tags": ["Food", "Matcha", "Drink"],
            "file": "matcha.md"
        },
        {
            "id": "market-pipeline",
            "title": "Building an Event-Driven Market Pipeline with Vector Search",
            "date": "June 1, 2026",
            "readTime": "5 min read",
            "summary": "An event-driven data pipeline using zero-shot extraction, vector embeddings, and clustering to process financial news into deduplicated market intelligence.",
            "tags": ["Data Engineering", "Vector Search", "NLP"],
            "file": "market-pipeline.md"
        },
        {
            "id": "berkeley-classes",
            "title": "Ranking and Rating Every Class I Took at UC Berkeley",
            "date": "May 20, 2026",
            "readTime": "2 min read",
            "summary": "An honest review, rating matrix, and breakdown of every Computer Science, Data Science, Statistics, and Physics course I completed at Cal (Class of 2026).",
            "tags": ["UC Berkeley", "Course Reviews", "Academics"],
            "file": "berkeley-classes.md"
        },
        {
            "id": "clickbait-classifier",
            "title": "From TF-IDF to BERT: Lessons from Clickbait Classifier",
            "date": "March 28, 2026",
            "readTime": "4 min read",
            "summary": "Fine-tuning a BERT classifier on 18K news titles to achieve 0.89 F1, outperforming TF-IDF by +0.14 points. Lessons in NLP, error analysis, and evaluation.",
            "tags": ["Machine Learning", "NLP", "BERT"],
            "file": "clickbait-classifier.md"
        },
        {
            "id": "fujifilm-x100vi",
            "title": "Why My Fujifilm X100VI",
            "date": "November 12, 2025",
            "readTime": "4 min read",
            "summary": "Comparing the tactile shooting experience, film simulations (Classic Chrome, Reala Ace), and the discipline of a fixed 23mm F2 lens versus computational smartphones.",
            "tags": ["Photography", "Fujifilm", "Design"],
            "file": "fujifilm-x100vi.md"
        },
        {
            "id": "gym",
            "title": "My Gym Routine",
            "date": "May 28, 2025 (Updated Aug. 18, 2026)",
            "readTime": "3 min read",
            "summary": "My weekly gym routine, tracking consistency, personal milestones, and how working out helps clear my head from coding.",
            "tags": ["Fitness", "Routine", "Life"],
            "file": "gym.md"
        },
        {
            "id": "datascience",
            "title": "Why Data Engineering",
            "date": "April 2, 2025",
            "readTime": "3 min read",
            "summary": "A reflection on why data science excites me, statistical insights, and the power of data visualization.",
            "tags": ["Data Science", "Reflection", "Engineering"],
            "file": "datascience.md"
        },
        {
            "id": "portfolio",
            "title": "How I Built My Portfolio Website",
            "date": "March 24, 2025",
            "readTime": "5 min read",
            "summary": "A breakdown of my serverless tech stack, custom Durable Objects trackers, R2 integration, and design decisions.",
            "tags": ["Full Stack", "Cloudflare", "Web Development"],
            "file": "portfolio.md"
        }
    ];

    let cachedBlogPosts = DEFAULT_BLOG_POSTS;

    function renderBlogCards(posts) {
        if (!blogCardsContainer) return;
        blogCardsContainer.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'retro-card';
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">${post.title}</h3>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="retro-badge"><i class="far fa-clock"></i> ${post.readTime}</span>
                        <span class="retro-badge">${post.date}</span>
                    </div>
                </div>
                <p style="margin-bottom: 1rem;">${post.summary}</p>
                <a href="/blog/${post.id}" data-post-id="${post.id}" class="btn-retro read-blog-btn">
                    <i class="fas fa-book-open"></i> Read Post
                </a>
            `;
            blogCardsContainer.appendChild(card);
        });

        // Attach click listeners to cards
        blogCardsContainer.querySelectorAll('.read-blog-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const postId = this.getAttribute('data-post-id');
                if (postId) {
                    openBlogModal(postId);
                }
            });
        });
    }

    async function loadBlogPosts() {
        renderBlogCards(cachedBlogPosts);
        try {
            const response = await fetch('/blog/posts.json');
            if (response.ok) {
                const posts = await response.json();
                if (Array.isArray(posts) && posts.length > 0) {
                    cachedBlogPosts = posts;
                    renderBlogCards(posts);
                }
            }
        } catch (err) {
            console.warn("Using cached blog posts:", err);
        }

        // Open initial post if requested in URL
        if (initialPost) {
            openBlogModal(initialPost, false);
        }
    }

    async function openBlogModal(postIdentifier, updateHistory = true) {
        if (!blogModal || !modalBlogTitle || !modalBlogDate || !modalBlogContent) return;

        const slug = String(postIdentifier)
            .replace(/^(\/)?blog\//, '')
            .replace(/\.(html|md)$/, '');

        const post = cachedBlogPosts.find(p => p.id === slug) || {
            id: slug,
            title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            date: '',
            file: `${slug}.md`
        };

        // Reset drag position of the dialog
        const modalDialog = blogModal.querySelector('.modal-dialog');
        if (modalDialog && typeof modalDialog.resetDrag === 'function') {
            modalDialog.resetDrag();
        }

        // Show loading state first
        modalBlogTitle.textContent = post.title || "Loading post...";
        modalBlogDate.textContent = post.date || "";
        modalBlogContent.innerHTML = "<div style='font-family: var(--font-mono); text-align: center; padding: 2rem;'>fetching markdown content...</div>";
        if (modalBlogFilename) {
            modalBlogFilename.textContent = post.file || `${slug}.md`;
        }

        blogModal.classList.add('active');

        if (updateHistory) {
            const targetUrl = `/blog/${slug}`;
            if (window.location.pathname !== targetUrl) {
                history.pushState({ tab: 'blog', post: slug }, '', targetUrl);
            }
        }

        try {
            const response = await fetch(`/blog/posts/${slug}.md`);
            if (!response.ok) throw new Error(`Could not fetch blog post: ${response.statusText}`);
            let markdownText = await response.text();

            // Strip optional YAML frontmatter
            markdownText = markdownText.replace(/^---[\s\S]*?---\s*/, '');

            // Strip leading H1 title if present to avoid duplicating the modal header title
            markdownText = markdownText.replace(/^#\s+[^\n]+\n+/, '');

            let renderedHtml = '';
            // Load marked on-demand if not already present
            if (typeof window.marked === 'undefined' || typeof window.marked.parse !== 'function') {
                try {
                    await loadScript('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js');
                } catch (loadErr) {
                    console.warn('Could not load marked from CDN, falling back to basic renderer', loadErr);
                }
            }

            if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
                renderedHtml = window.marked.parse(markdownText, { gfm: true, breaks: true });
            } else {
                // Fallback basic paragraph renderer
                renderedHtml = markdownText
                    .split('\n\n')
                    .map(p => `<p>${p}</p>`)
                    .join('');
            }

            modalBlogTitle.textContent = post.title;
            modalBlogDate.textContent = post.date;
            modalBlogContent.innerHTML = renderedHtml;
        } catch (error) {
            console.error("Error loading blog post:", error);
            modalBlogTitle.textContent = "Error Loading Post";
            modalBlogContent.innerHTML = `<div style='font-family: var(--font-mono); color: #ff7675; text-align: center; padding: 2rem;'>
                Could not load markdown for "<strong>${slug}</strong>".<br><br>
                <button class="btn-retro" id="retry-blog-load-btn"><i class="fas fa-redo"></i> Retry</button>
            </div>`;
            const retryBtn = document.getElementById('retry-blog-load-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => openBlogModal(slug, false));
            }
        }
    }

    function closeBlogModal(updateHistory = true) {
        if (blogModal) {
            blogModal.classList.remove('active');
        }
        if (updateHistory && (window.location.pathname.startsWith('/blog/') || window.location.search.includes('post='))) {
            history.pushState({ tab: 'blog' }, '', '/blog');
        }
    }

    // Initialize blog card list
    loadBlogPosts();

    if (blogModalCloseBtn) {
        blogModalCloseBtn.addEventListener('click', () => closeBlogModal(true));
    }

    if (blogModal) {
        blogModal.addEventListener('click', function (e) {
            if (e.target === blogModal) {
                closeBlogModal(true);
            }
        });
    }

    // Global keyboard listener to close open modals on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (blogModal && blogModal.classList.contains('active')) {
                closeBlogModal(true);
            }
            if (photoModal && photoModal.classList.contains('active')) {
                closePhotoModal();
            }
        }
    });

    // ----------------------------------------------------
    // 5. Tracking & Transitions
    // ----------------------------------------------------
    // Resume clicks tracking
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', function () {
            fetch(API_BASE + '/api/resume/increment', { method: 'POST' })
                .catch(() => { });
        });
    }

    // Back to top button in taskbar
    const taskbarTopBtn = document.getElementById('taskbar-top-btn');
    if (taskbarTopBtn) {
        taskbarTopBtn.addEventListener('click', function () {
            const portfolioView = document.getElementById('view-portfolio');
            if (portfolioView && portfolioView.classList.contains('active')) {
                navigateTo('home', true);
            } else if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // ----------------------------------------------------
    // 6. Retro Sticky Note Widget Logic
    // ----------------------------------------------------
    const stickyNote = document.getElementById('sticky-note');
    const stickyContent = document.getElementById('sticky-note-content');
    const stickyEditBtn = document.getElementById('sticky-note-edit');
    const stickyResetBtn = document.getElementById('sticky-note-reset');
    const stickyMinBtn = document.getElementById('sticky-note-minimize');
    const stickyCloseBtn = document.getElementById('sticky-note-close');
    const taskbarStickyBtn = document.getElementById('taskbar-sticky-btn');
    const stickySaveStatus = document.getElementById('sticky-save-status');

    const DEFAULT_STICKY_NOTE = `
<p class="sticky-heading"><strong>NATHAN'S DESKTOP LOG</strong></p>
<ul class="sticky-list">
    <li><strong>Status:</strong> 🎓 Graduated UC Berkeley! Seeking 2026 Full-Time Data Engineering / SWE roles.</li>
    <li><strong>Watching:</strong> <em>Twinkling Watermelon</em> (KDrama)</li>
    <li><strong>Building:</strong> Currently collaborating on a open-source project!</li>
    <li><strong>Gear:</strong> Fujifilm X100VI & Sony ZVE10 II</li>
</ul>
<p class="sticky-tip"><em>💡 Pro-tip: Drag me around or click ✏️ to type your own note!</em></p>
    `.trim();

    function loadStickyNote() {
        if (!stickyContent) return;
        const saved = localStorage.getItem('portfolio-sticky-note');
        if (saved && saved.trim()) {
            stickyContent.innerHTML = saved;
        } else {
            stickyContent.innerHTML = DEFAULT_STICKY_NOTE;
        }
    }

    function saveStickyNote() {
        if (!stickyContent) return;
        if (stickySaveStatus) {
            stickySaveStatus.textContent = 'saving...';
            stickySaveStatus.className = 'sticky-note-status saving';
        }
        localStorage.setItem('portfolio-sticky-note', stickyContent.innerHTML);
        setTimeout(() => {
            if (stickySaveStatus) {
                stickySaveStatus.textContent = 'saved ✓';
                stickySaveStatus.className = 'sticky-note-status';
            }
        }, 350);
    }

    function toggleStickyNote(forceState) {
        if (!stickyNote) return;
        const isHidden = stickyNote.classList.contains('minimized');
        const shouldShow = typeof forceState === 'boolean' ? forceState : isHidden;

        if (shouldShow) {
            stickyNote.classList.remove('minimized');
            if (taskbarStickyBtn) taskbarStickyBtn.classList.add('active');
            localStorage.setItem('portfolio-sticky-visible', 'true');
        } else {
            stickyNote.classList.add('minimized');
            if (taskbarStickyBtn) taskbarStickyBtn.classList.remove('active');
            localStorage.setItem('portfolio-sticky-visible', 'false');
        }
    }

    if (stickyNote) {
        loadStickyNote();

        // Restore saved visibility state (default to minimized on screens <= 1024px to declutter viewport)
        const savedVisible = localStorage.getItem('portfolio-sticky-visible');
        if (savedVisible === 'false' || (savedVisible === null && window.innerWidth <= 1024)) {
            toggleStickyNote(false);
        } else {
            toggleStickyNote(true);
        }

        // Toggle edit mode
        if (stickyEditBtn && stickyContent) {
            stickyEditBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const isEditing = stickyContent.getAttribute('contenteditable') === 'true';
                if (isEditing) {
                    stickyContent.setAttribute('contenteditable', 'false');
                    stickyEditBtn.classList.remove('active');
                    stickyEditBtn.setAttribute('title', 'Edit Note');
                    saveStickyNote();
                } else {
                    stickyContent.setAttribute('contenteditable', 'true');
                    stickyEditBtn.classList.add('active');
                    stickyEditBtn.setAttribute('title', 'Done Editing');
                    stickyContent.focus();
                }
            });

            // Auto-save on input
            let saveTimeout;
            stickyContent.addEventListener('input', function () {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveStickyNote, 500);
            });
        }

        // Reset default note
        if (stickyResetBtn && stickyContent) {
            stickyResetBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('Reset sticky note to Nathan\'s default desktop log?')) {
                    stickyContent.innerHTML = DEFAULT_STICKY_NOTE;
                    stickyContent.setAttribute('contenteditable', 'false');
                    if (stickyEditBtn) stickyEditBtn.classList.remove('active');
                    saveStickyNote();
                }
            });
        }

        // Minimize / Fold note
        if (stickyMinBtn) {
            stickyMinBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                stickyNote.classList.toggle('folded');
            });
        }

        // Close note
        if (stickyCloseBtn) {
            stickyCloseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleStickyNote(false);
            });
        }

        // Taskbar button toggle
        if (taskbarStickyBtn) {
            taskbarStickyBtn.addEventListener('click', function (e) {
                e.preventDefault();
                toggleStickyNote();
            });
        }

        // Expose toggle globally
        window.toggleStickyNote = toggleStickyNote;
    }

    // Fade in page body
    document.body.classList.add('loaded');
});
