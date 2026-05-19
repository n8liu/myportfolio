// Client-side JavaScript for Retro OS Portfolio Redesign
document.addEventListener('DOMContentLoaded', function() {
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

    // Bind tab clicks
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
            // Update URL hash
            window.location.hash = tabName;
        });
    });

    // Check URL hash on page load
    const initialHash = window.location.hash.substring(1);
    if (initialHash && pathMappings[initialHash]) {
        switchTab(initialHash);
    } else {
        switchTab('home');
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
        fetch('https://myportfolio.nathanliu528.workers.dev/api/total')
            .then(res => res.json())
            .then(data => {
                if (totalViewsEl) totalViewsEl.textContent = data.total ?? '0';
            }).catch(() => { if (totalViewsEl) totalViewsEl.textContent = '?'; });

        fetch('https://myportfolio.nathanliu528.workers.dev/api/unique/count')
            .then(res => res.json())
            .then(data => {
                if (uniqueViewsEl) uniqueViewsEl.textContent = data.count ?? '0';
            }).catch(() => { if (uniqueViewsEl) uniqueViewsEl.textContent = '?'; });

        fetch('https://myportfolio.nathanliu528.workers.dev/api/total/requests24h')
            .then(res => res.json())
            .then(data => {
                if (views24hEl) views24hEl.textContent = data.requests24h ?? '0';
            }).catch(() => { if (views24hEl) views24hEl.textContent = '?'; });

        fetch('https://myportfolio.nathanliu528.workers.dev/api/resume/count')
            .then(res => res.json())
            .then(data => {
                if (resumeClicksEl) resumeClicksEl.textContent = data.clicks ?? '0';
            }).catch(() => { if (resumeClicksEl) resumeClicksEl.textContent = '?'; });

        // Fetch histories and render Chart.js
        try {
            const [totalRes, uniqueRes] = await Promise.all([
                fetch('https://myportfolio.nathanliu528.workers.dev/api/total/history7d').then(r => r.json()),
                fetch('https://myportfolio.nathanliu528.workers.dev/api/unique/history7d').then(r => r.json())
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

            const isDark = document.body.classList.contains('dark');
            const borderCol = isDark ? '#f4f1ea' : '#1e1e1e';
            const textCol = isDark ? '#f4f1ea' : '#1e1e1e';
            const gridCol = isDark ? 'rgba(244, 241, 234, 0.05)' : 'rgba(30, 30, 30, 0.05)';

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
            fetch('https://myportfolio.nathanliu528.workers.dev/api/resume/increment', { method: 'POST' })
                .catch(() => {});
        });
    }

    // ----------------------------------------------------
    // 6. Dark Mode Toggle & Initialization
    // ----------------------------------------------------
    const themeToggleBtn = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark');
            if (themeToggleBtn) themeToggleBtn.textContent = 'light mode';
        } else {
            document.body.classList.remove('dark');
            if (themeToggleBtn) themeToggleBtn.textContent = 'dark mode';
        }

        // Broadcast to dynamic child elements if needed
        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'stats' && statsChartInstance) {
            const isDark = document.body.classList.contains('dark');
            const borderCol = isDark ? '#f4f1ea' : '#1e1e1e';
            const textCol = isDark ? '#f4f1ea' : '#1e1e1e';
            const gridCol = isDark ? 'rgba(244, 241, 234, 0.05)' : 'rgba(30, 30, 30, 0.05)';

            statsChartInstance.data.datasets.forEach(dataset => {
                dataset.borderColor = borderCol;
                dataset.pointBorderColor = borderCol;
            });
            statsChartInstance.options.scales.x.ticks.color = textCol;
            statsChartInstance.options.scales.x.grid.color = gridCol;
            statsChartInstance.options.scales.y.ticks.color = textCol;
            statsChartInstance.options.scales.y.grid.color = gridCol;
            statsChartInstance.options.plugins.legend.labels.color = textCol;
            statsChartInstance.update();
        }
    }

    // Load theme from localStorage or system preferences
    const savedTheme = localStorage.getItem('portfolio-theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('portfolio-theme', currentTheme);
            applyTheme(currentTheme);
        });
    }

    // Fade in page body
    document.body.classList.add('loaded');
});
