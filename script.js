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

    // Apply dragging to Sticky Note widget
    const stickyNoteEl = document.getElementById('sticky-note');
    const stickyHeaderEl = stickyNoteEl ? stickyNoteEl.querySelector('.sticky-note-header') : null;
    if (stickyNoteEl && stickyHeaderEl) {
        makeElementDraggable(stickyNoteEl, stickyHeaderEl);
    }

    // Apply dragging to Terminal widget
    const terminalWidgetEl = document.getElementById('terminal-widget');
    const terminalHeaderEl = terminalWidgetEl ? terminalWidgetEl.querySelector('.terminal-header') : null;
    if (terminalWidgetEl && terminalHeaderEl) {
        makeElementDraggable(terminalWidgetEl, terminalHeaderEl);
    }


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
        if (e.state && e.state.post) {
            openBlogModal(e.state.post, false);
        } else if (blogModal && blogModal.classList.contains('active')) {
            closeBlogModal(false);
        }
    });

    // Check URL path on page load
    const initialTab = getTabFromPath();
    const initialPost = getInitialBlogPost();
    if (initialTab) {
        switchTab(initialTab);
        history.replaceState({ tab: initialTab, post: initialPost }, '', window.location.pathname);
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
        photoModal.addEventListener('click', function(e) {
            if (e.target === photoModal) {
                closePhotoModal();
            }
        });
    }

    // Global hook for fallback inline clicks in HTML placeholders
    window.openFallbackPhoto = function(type) {
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
            btn.addEventListener('click', function(e) {
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
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                renderedHtml = marked.parse(markdownText, { gfm: true, breaks: true });
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
        blogModal.addEventListener('click', function(e) {
            if (e.target === blogModal) {
                closeBlogModal(true);
            }
        });
    }

    // Global keyboard listener to close open modals on Escape key
    document.addEventListener('keydown', function(e) {
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
        resumeBtn.addEventListener('click', function() {
            fetch(API_BASE + '/api/resume/increment', { method: 'POST' })
                .catch(() => {});
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

        // Restore saved visibility state
        const savedVisible = localStorage.getItem('portfolio-sticky-visible');
        if (savedVisible === 'false') {
            toggleStickyNote(false);
        } else {
            toggleStickyNote(true);
        }

        // Toggle edit mode
        if (stickyEditBtn && stickyContent) {
            stickyEditBtn.addEventListener('click', function(e) {
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
            stickyContent.addEventListener('input', function() {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveStickyNote, 500);
            });
        }

        // Reset default note
        if (stickyResetBtn && stickyContent) {
            stickyResetBtn.addEventListener('click', function(e) {
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
            stickyMinBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                stickyNote.classList.toggle('folded');
            });
        }

        // Close note
        if (stickyCloseBtn) {
            stickyCloseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleStickyNote(false);
            });
        }

        // Taskbar button toggle
        if (taskbarStickyBtn) {
            taskbarStickyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleStickyNote();
            });
        }

        // Expose toggle globally
        window.toggleStickyNote = toggleStickyNote;
    }

    // ----------------------------------------------------
    // 7. Retro OS Terminal Widget Logic (Bottom Left)
    // ----------------------------------------------------
    const terminalWidget = document.getElementById('terminal-widget');
    const terminalBody = document.getElementById('terminal-body');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const terminalClearBtn = document.getElementById('terminal-clear');
    const terminalMinBtn = document.getElementById('terminal-minimize');
    const terminalCloseBtn = document.getElementById('terminal-close');
    const taskbarTerminalBtn = document.getElementById('taskbar-terminal-btn');
    const taskbarStartBtn = document.getElementById('taskbar-start-btn');

    let commandHistory = [];
    let historyIndex = -1;

    function toggleTerminal(forceState) {
        if (!terminalWidget) return;
        const isHidden = terminalWidget.classList.contains('minimized');
        const shouldShow = typeof forceState === 'boolean' ? forceState : isHidden;

        if (shouldShow) {
            terminalWidget.classList.remove('minimized');
            if (taskbarTerminalBtn) taskbarTerminalBtn.classList.add('active');
            localStorage.setItem('portfolio-terminal-visible', 'true');
            setTimeout(() => {
                if (terminalInput) terminalInput.focus();
            }, 100);
        } else {
            terminalWidget.classList.add('minimized');
            if (taskbarTerminalBtn) taskbarTerminalBtn.classList.remove('active');
            localStorage.setItem('portfolio-terminal-visible', 'false');
        }
    }

    function printTerminalLine(text, type = 'output') {
        if (!terminalOutput) return;
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.innerHTML = text;
        terminalOutput.appendChild(line);
        if (terminalBody) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
    }

    function clearTerminal() {
        if (!terminalOutput) return;
        terminalOutput.innerHTML = `
<div class="terminal-line banner"><span class="terminal-accent">NathanOS v3.2.0</span> [x86_64-retro-web]</div>
<div class="terminal-line info">Type <span class="cmd-highlight">'help'</span> to see available commands or click quick pills below.</div>
        `.trim();
    }

    function escapeTerminalHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function executeCommand(rawCmd) {
        const cmd = rawCmd.trim();
        if (!cmd) return;

        // Add to history
        commandHistory.push(cmd);
        historyIndex = commandHistory.length;

        // Print user input line
        printTerminalLine(`<span class="terminal-prompt">nathan@cal:~$</span> ${escapeTerminalHtml(cmd)}`, 'user-cmd');

        const parts = cmd.split(' ').filter(Boolean);
        const action = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (action) {
            case 'help':
            case '?':
            case 'man':
                printTerminalLine(`
<span class="terminal-accent">Available NathanOS Commands:</span>
  <span class="cmd-highlight">about</span>       - Bio, background & education
  <span class="cmd-highlight">skills</span>      - Technical stack & competencies
  <span class="cmd-highlight">projects</span>    - Featured software & engineering projects
  <span class="cmd-highlight">experience</span>  - Internships & career background
  <span class="cmd-highlight">education</span>   - UC Berkeley coursework & degree
  <span class="cmd-highlight">blog [slug]</span> - List articles or open an article modal
  <span class="cmd-highlight">matcha</span>      - Nathan's top matcha rankings
  <span class="cmd-highlight">photos</span>      - Camera gear & photography
  <span class="cmd-highlight">stats</span>       - Real-time visitor counts & analytics
  <span class="cmd-highlight">goto &lt;tab&gt;</span>   - Switch tab (home, projects, blog, etc.)
  <span class="cmd-highlight">theme &lt;mode&gt;</span> - Switch theme (dark, light, toggle)
  <span class="cmd-highlight">contact</span>     - Socials, GitHub & contact info
  <span class="cmd-highlight">clear</span>       - Clear terminal screen
  <span class="cmd-highlight">date</span>        - Berkeley local time & date
  <span class="cmd-highlight">echo &lt;msg&gt;</span>   - Print message
  <span class="cmd-highlight">sudo</span>        - Superuser privileges
  <span class="cmd-highlight">exit</span>        - Minimize terminal window
                `.trim(), 'output');
                break;

            case 'about':
            case 'whoami':
            case 'bio':
                printTerminalLine(`
<span class="terminal-accent">Nathan Liu</span> — UC Berkeley '26 (Data Science & Computer Science)
• Focus: Machine Learning, Data Engineering Pipelines & Full-Stack Systems.
• Passionate about minimalist UI design, street photography (Fujifilm X100VI), and fitness.
• Seeking 2026 Full-Time Software Engineering & Data Science opportunities.
                `.trim(), 'output');
                break;

            case 'skills':
            case 'stack':
                printTerminalLine(`
<span class="terminal-accent">Technical Skills & Technologies:</span>
  • <span class="cmd-highlight">Languages:</span>    Python, JavaScript (ES6+), TypeScript, SQL, Java, C, HTML5/CSS3
  • <span class="cmd-highlight">Frameworks:</span>   Node.js, Express, React, Flask, PyTorch, HuggingFace, Socket.IO
  • <span class="cmd-highlight">Cloud/Edge:</span>   Cloudflare Workers, Durable Objects, R2, AWS S3, Firebase
  • <span class="cmd-highlight">Data & DB:</span>    Spark, Pandas, NumPy, Scikit-Learn, SQLite, PostgreSQL
  • <span class="cmd-highlight">Dev Tools:</span>    Git, Docker, esbuild, Figma, Bash/Linux
                `.trim(), 'output');
                break;

            case 'projects':
                printTerminalLine(`
<span class="terminal-accent">Featured Projects:</span>
  [1] <span class="cmd-highlight">Event-Driven Market Pipeline</span>: Zero-shot transformer embeddings & streaming cluster dedup.
  [2] <span class="cmd-highlight">SimplyMail</span>: Fast web Gmail client built with JavaScript & Firebase.
  [3] <span class="cmd-highlight">Spotify Analytics</span>: Listening telemetry dashboard & genre analyzer.
  [4] <span class="cmd-highlight">Pokédex API</span>: Autocomplete Pokémon search with evolutions & stats.
Type <span class="cmd-highlight">'goto projects'</span> to navigate to the projects window!
                `.trim(), 'output');
                break;

            case 'experience':
            case 'work':
            case 'jobs':
                printTerminalLine(`
<span class="terminal-accent">Experience:</span>
  • Software Engineering & Data Engineering Projects
  • Data Science & SWE Internships
  • Distributed Systems & Cloudflare Serverless Architecture
Type <span class="cmd-highlight">'goto experience'</span> for the complete timeline and resume!
                `.trim(), 'output');
                break;

            case 'education':
            case 'academics':
            case 'school':
            case 'cal':
            case 'berkeley':
                printTerminalLine(`
<span class="terminal-accent">Education — UC Berkeley (Class of 2026):</span>
  • Degree: B.A. Data Science & Computer Science (GPA: 3.75)
  • CS Core: CS 61A, CS 61B, CS 61C, CS 161, CS 162, CS 170, CS 186, CS 189
  • Data Core: DATA 8, DATA 100, DATA C101, DATA 140, EECS 127
Type <span class="cmd-highlight">'goto education'</span> to see the full course matrix & ratings!
                `.trim(), 'output');
                break;

            case 'matcha':
                printTerminalLine(`
<span class="terminal-accent">🍵 Nathan's Matcha Power Rankings (2026):</span>
  1. <span class="cmd-highlight">Airoma Cafe</span> (Fountain Valley, CA): Matcha Einspanner (5/5) ★
  2. <span class="cmd-highlight">Brew Story</span> (Huntington Beach, CA): Banana Cream Matcha (4.5/5)
  3. <span class="cmd-highlight">Matsu Matcha</span> (Cupertino, CA): Biscoff Matcha (4.5/5)
  4. <span class="cmd-highlight">Community Goods</span> (Los Angeles, CA): Rocky's Matcha (4/5)
  5. <span class="cmd-highlight">Da Vien</span> (Milpitas, CA): Banana Matcha (4/5)
Type <span class="cmd-highlight">'blog matcha'</span> to open the full blog post!
                `.trim(), 'output');
                break;

            case 'blog':
            case 'posts':
                if (args.length > 0) {
                    const slug = args[args.length - 1].toLowerCase();
                    if (slug === 'open' && args.length > 1) {
                        const targetSlug = args[1].toLowerCase();
                        openBlogModal(targetSlug);
                        printTerminalLine(`<span class="terminal-line success">Opening article: ${targetSlug}...</span>`);
                    } else if (slug !== 'open') {
                        openBlogModal(slug);
                        printTerminalLine(`<span class="terminal-line success">Opening article: ${slug}...</span>`);
                    }
                } else {
                    let listStr = `<span class="terminal-accent">Available Blog Articles:</span>\n`;
                    cachedBlogPosts.forEach((p, i) => {
                        listStr += `  [${i + 1}] <span class="cmd-highlight">${p.id}</span> (${p.date})\n      ${p.title}\n`;
                    });
                    listStr += `Type <span class="cmd-highlight">'blog &lt;slug&gt;'</span> (e.g. 'blog matcha') to open an article modal!`;
                    printTerminalLine(listStr.trim(), 'output');
                }
                break;

            case 'photos':
            case 'photography':
            case 'camera':
                printTerminalLine(`
<span class="terminal-accent">Photography:</span>
  • Primary Body: <span class="cmd-highlight">Fujifilm X100VI</span> (23mm F2 Fixed)
  • Video Setup:  <span class="cmd-highlight">Sony ZVE10 II</span>
  • Locations:    California, Japan, Hawaii, South Korea
Type <span class="cmd-highlight">'goto photography'</span> to open the gallery!
                `.trim(), 'output');
                break;

            case 'stats':
            case 'telemetry':
                const viewers = document.getElementById('active-viewers-count') ? document.getElementById('active-viewers-count').textContent : '1';
                printTerminalLine(`
<span class="terminal-accent">System Telemetry:</span>
  • Status:       ONLINE [200 OK]
  • Active Users: <span class="cmd-highlight">${viewers} visitor(s) online</span>
  • Architecture: Cloudflare Pages + Durable Objects (SQLite Backend)
  • Client Time:  ${new Date().toLocaleTimeString()}
Type <span class="cmd-highlight">'goto stats'</span> to view the full 7-day traffic chart!
                `.trim(), 'output');
                break;

            case 'goto':
            case 'cd':
            case 'open':
                if (args.length === 0) {
                    printTerminalLine(`Usage: <span class="cmd-highlight">goto &lt;tab&gt;</span> (e.g. goto projects, goto blog, goto stats)`, 'error');
                } else {
                    const tab = args[0].toLowerCase();
                    const validTabs = ['home', 'experience', 'projects', 'education', 'photography', 'blog', 'stats'];
                    if (validTabs.includes(tab)) {
                        switchTab(tab);
                        const newPath = tab === 'home' ? '/' : `/${tab}`;
                        if (window.location.pathname !== newPath) {
                            history.pushState({ tab }, '', newPath);
                        }
                        printTerminalLine(`<span class="terminal-line success">Navigated to ${tab}.</span>`);
                    } else {
                        printTerminalLine(`Unknown panel: "${tab}". Valid tabs: ${validTabs.join(', ')}`, 'error');
                    }
                }
                break;

            case 'theme':
                if (args.length === 0 || args[0] === 'toggle') {
                    const isDark = document.documentElement.classList.toggle('dark');
                    localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
                    printTerminalLine(`<span class="terminal-line success">Theme switched to ${isDark ? 'dark' : 'light'} mode.</span>`);
                } else if (args[0] === 'dark') {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('portfolio-theme', 'dark');
                    printTerminalLine(`<span class="terminal-line success">Dark theme enabled.</span>`);
                } else if (args[0] === 'light') {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('portfolio-theme', 'light');
                    printTerminalLine(`<span class="terminal-line success">Light theme enabled.</span>`);
                }
                break;

            case 'contact':
            case 'socials':
            case 'email':
                printTerminalLine(`
<span class="terminal-accent">Connect with Nathan:</span>
  • Email:    <a href="mailto:contact@nathanliu.dev" style="color:#ffe7a0;">contact@nathanliu.dev</a>
  • LinkedIn: <a href="https://linkedin.com/in/n8liu" target="_blank" style="color:#ffe7a0;">linkedin.com/in/n8liu</a>
  • GitHub:   <a href="https://github.com/n8liu" target="_blank" style="color:#ffe7a0;">github.com/n8liu</a>
  • Hevy:     <a href="https://hevy.com/user/natedogl" target="_blank" style="color:#ffe7a0;">hevy.com/user/natedogl</a>
                `.trim(), 'output');
                break;

            case 'date':
            case 'time':
                printTerminalLine(new Date().toString(), 'output');
                break;

            case 'echo':
                printTerminalLine(escapeTerminalHtml(args.join(' ')), 'output');
                break;

            case 'clear':
            case 'cls':
                clearTerminal();
                break;

            case 'sudo':
                printTerminalLine(`guest is not in the sudoers file. This incident will be reported to Oski 🐻.`, 'error');
                break;

            case 'exit':
            case 'quit':
                toggleTerminal(false);
                break;

            case 'ls':
            case 'dir':
                printTerminalLine(`
home.md         experience.txt   projects.bat
academics.doc   gallery.exe      blog.ini
dashboard.sys   notes.txt        term.exe
                `.trim(), 'output');
                break;

            case 'cat':
                if (args.length === 0) {
                    printTerminalLine(`Usage: cat &lt;filename&gt;`, 'error');
                } else {
                    const filename = args[0].toLowerCase();
                    if (filename.includes('note')) {
                        printTerminalLine(document.getElementById('sticky-note-content') ? document.getElementById('sticky-note-content').innerText : 'No notes found.', 'output');
                    } else if (filename.includes('blog')) {
                        executeCommand('blog');
                    } else {
                        printTerminalLine(`cat: ${escapeTerminalHtml(filename)}: Permission denied or binary file.`, 'error');
                    }
                }
                break;

            default:
                printTerminalLine(`nathan-os: command not found: "${escapeTerminalHtml(cmd)}". Type <span class="cmd-highlight">'help'</span> for a list of commands.`, 'error');
                break;
        }
    }

    function toggleFoldTerminal(forceState) {
        if (!terminalWidget) return;
        const isFolded = terminalWidget.classList.contains('folded');
        const shouldFold = typeof forceState === 'boolean' ? forceState : !isFolded;

        if (shouldFold) {
            terminalWidget.classList.add('folded');
            localStorage.setItem('portfolio-terminal-folded', 'true');
        } else {
            terminalWidget.classList.remove('folded');
            localStorage.setItem('portfolio-terminal-folded', 'false');
            setTimeout(() => {
                if (terminalInput) terminalInput.focus();
            }, 100);
        }
    }

    if (terminalWidget) {
        // Restore saved visibility (default to visible)
        const savedTermVisible = localStorage.getItem('portfolio-terminal-visible');
        if (savedTermVisible === 'false') {
            toggleTerminal(false);
        } else {
            toggleTerminal(true);
        }

        // Restore saved folded/minimized state (defaults to folded on load)
        const savedTermFolded = localStorage.getItem('portfolio-terminal-folded');
        if (savedTermFolded === 'false') {
            terminalWidget.classList.remove('folded');
        } else {
            terminalWidget.classList.add('folded');
        }

        // Click titlebar when folded to unfold
        const termHeader = terminalWidget.querySelector('.terminal-header');
        if (termHeader) {
            termHeader.addEventListener('click', function(e) {
                if (terminalWidget.classList.contains('folded') && !e.target.closest('.terminal-controls')) {
                    toggleFoldTerminal(false);
                }
            });
        }

        // Input key listener
        if (terminalInput) {
            terminalInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = this.value;
                    this.value = '';
                    executeCommand(val);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (commandHistory.length > 0) {
                        if (historyIndex > 0) {
                            historyIndex--;
                        } else if (historyIndex === -1) {
                            historyIndex = commandHistory.length - 1;
                        }
                        this.value = commandHistory[historyIndex] || '';
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (commandHistory.length > 0) {
                        if (historyIndex < commandHistory.length - 1) {
                            historyIndex++;
                            this.value = commandHistory[historyIndex] || '';
                        } else {
                            historyIndex = commandHistory.length;
                            this.value = '';
                        }
                    }
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const current = this.value.trim().toLowerCase();
                    const candidates = ['about', 'skills', 'projects', 'experience', 'education', 'blog', 'matcha', 'photos', 'stats', 'goto', 'theme', 'contact', 'clear', 'help', 'date', 'echo', 'sudo', 'exit', 'ls', 'cat'];
                    const match = candidates.find(c => c.startsWith(current));
                    if (match) {
                        this.value = match;
                    }
                }
            });
        }

        // Click body to focus input
        if (terminalBody && terminalInput) {
            terminalBody.addEventListener('click', function() {
                terminalInput.focus();
            });
        }

        // Quick command pills
        document.querySelectorAll('.term-pill').forEach(pill => {
            pill.addEventListener('click', function(e) {
                e.stopPropagation();
                const cmd = this.getAttribute('data-cmd');
                if (cmd) {
                    executeCommand(cmd);
                    if (terminalInput) terminalInput.focus();
                }
            });
        });

        // Minimize / Fold
        if (terminalMinBtn) {
            terminalMinBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFoldTerminal();
            });
        }

        // Close
        if (terminalCloseBtn) {
            terminalCloseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleTerminal(false);
            });
        }

        // Clear
        if (terminalClearBtn) {
            terminalClearBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clearTerminal();
            });
        }

        // Taskbar terminal buttons
        if (taskbarTerminalBtn) {
            taskbarTerminalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (terminalWidget.classList.contains('minimized')) {
                    toggleTerminal(true);
                    toggleFoldTerminal(false);
                } else if (terminalWidget.classList.contains('folded')) {
                    toggleFoldTerminal(false);
                } else {
                    toggleFoldTerminal(true);
                }
            });
        }

        if (taskbarStartBtn) {
            taskbarStartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (terminalWidget.classList.contains('minimized')) {
                    toggleTerminal(true);
                    toggleFoldTerminal(false);
                } else if (terminalWidget.classList.contains('folded')) {
                    toggleFoldTerminal(false);
                } else {
                    toggleFoldTerminal(true);
                }
            });
        }

        // Expose globally
        window.toggleTerminal = toggleTerminal;
        window.toggleFoldTerminal = toggleFoldTerminal;
    }

    // Fade in page body
    document.body.classList.add('loaded');
});
