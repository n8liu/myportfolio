// Client-side JavaScript for Retro OS Portfolio Redesign
document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = '';

    let activeModal = null;
    let modalReturnFocus = null;
    const inertBackground = new Map();
    let statsLoading = false;

    function setLoadState(container, message = '', retry = null, busy = false) {
        if (!container) return;
        const hadFocus = typeof document !== 'undefined' && container.contains && container.contains(document.activeElement);
        if (typeof container.setAttribute === 'function') {
            container.setAttribute('aria-busy', String(busy));
        }
        if (typeof container.replaceChildren === 'function') {
            container.replaceChildren();
        } else {
            container.innerHTML = '';
        }
        if (!message) return;

        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
            const state = document.createElement('div');
            state.className = 'load-state';
            if (busy) {
                const spinner = document.createElement('progress');
                spinner.className = 'loading-spinner';
                spinner.setAttribute('aria-label', message || 'Loading');
                state.appendChild(spinner);
            }
            const text = document.createElement('p');
            text.setAttribute('role', busy ? 'status' : (retry ? 'alert' : 'status'));
            text.textContent = message;
            state.appendChild(text);
            if (retry && typeof retry === 'function') {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn-retro load-retry-btn';
                button.textContent = 'retry';
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    retry();
                });
                state.appendChild(button);
            }
            container.appendChild(state);
        } else {
            container.innerHTML = `<div class="load-state"><p role="status">${escapeHtml(message)}</p>${retry ? '<button class="btn-retro">retry</button>' : ''}</div>`;
        }

        if (hadFocus && typeof container.focus === 'function') {
            container.tabIndex = -1;
            container.focus({ preventScroll: true });
        }
    }

    async function fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
    }

    function trapModalFocus(modal, e) {
        if (e.key !== 'Tab') return;
        const focusables = modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) {
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first || document.activeElement === modal) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    function showAccessibleModal(modal, firstFocus) {
        if (!modal) return;
        if (activeModal === modal) return;
        if (activeModal) hideAccessibleModal(activeModal);
        modalReturnFocus = document.activeElement;
        activeModal = modal;
        for (const child of document.body.children) {
            if (child === modal || child.contains(modal)) continue;
            inertBackground.set(child, child.inert);
            child.inert = true;
        }
        modal.classList.add('active');
        const focusTarget = firstFocus || modal.querySelector('button.close, button, [tabindex]:not([tabindex="-1"])') || modal;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true });
        }
    }

    function hideAccessibleModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        if (activeModal !== modal) return;
        for (const [element, wasInert] of inertBackground) {
            element.inert = wasInert;
        }
        inertBackground.clear();
        activeModal = null;
        const fallback = document.querySelector('.nav-tab.active');
        const target = modalReturnFocus?.isConnected && typeof modalReturnFocus.focus === 'function'
            ? modalReturnFocus : fallback;
        target?.focus({ preventScroll: true });
        modalReturnFocus = null;
    }

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
            script.onerror = () => {
                scriptCache.delete(src);
                script.remove();
                reject(new Error('Could not load script'));
            };
            document.head.appendChild(script);
        });
        scriptCache.set(src, promise);
        return promise;
    }

    // ----------------------------------------------------
    // Minimalist Interactive Wallpaper (Cursor Glow & Parallax Grid)
    // ----------------------------------------------------
    let mouseTicking = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (!isTouchDevice) {
        window.addEventListener('pointermove', function (e) {
            if (reducedMotion.matches) return;
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
            if (e.target.closest('.win-btn') || e.target.closest('.taskbar-app-btn') || e.target.isContentEditable) return;

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

    // ----------------------------------------------------
    // 1. Window-Contained Scrolling & View Management Engine
    // ----------------------------------------------------
    const navTabs = document.querySelectorAll('.nav-tab:not(.theme-toggle)');
    const headerNav = document.querySelector('.header-nav');
    const navHighlight = document.createElement('span');
    navHighlight.className = 'nav-highlight';
    navHighlight.setAttribute('aria-hidden', 'true');
    if (headerNav) headerNav.appendChild(navHighlight);

    function keepActiveTabVisible(smooth = true) {
        if (!headerNav) return;
        const activeTab = headerNav.querySelector('.nav-tab.active');
        if (!activeTab) return;
        if (headerNav.scrollWidth <= headerNav.clientWidth) return;

        const navLeft = headerNav.scrollLeft;
        const navWidth = headerNav.clientWidth;
        const tabLeft = activeTab.offsetLeft;
        const tabWidth = activeTab.offsetWidth;
        const padding = 12;

        const isCutOffLeft = tabLeft < navLeft + padding;
        const isCutOffRight = (tabLeft + tabWidth) > (navLeft + navWidth - padding);

        if (isCutOffLeft || isCutOffRight) {
            const targetLeft = tabLeft - (navWidth - tabWidth) / 2;
            headerNav.scrollTo({
                left: Math.max(0, targetLeft),
                behavior: !smooth || (typeof reducedMotion !== 'undefined' && reducedMotion.matches) ? 'auto' : 'smooth'
            });
        }
    }

    function positionNavHighlight() {
        const activeTab = headerNav?.querySelector('.nav-tab.active');
        if (!activeTab) return;
        keepActiveTabVisible(headerNav.classList.contains('nav-highlight-ready'));
        navHighlight.style.width = `${activeTab.offsetWidth}px`;
        navHighlight.style.height = `${activeTab.offsetHeight}px`;
        navHighlight.style.transform = `translate(${activeTab.offsetLeft}px, ${activeTab.offsetTop}px)`;
        if (!headerNav.classList.contains('nav-highlight-ready')) {
            // Establish the initial position before enabling transitions.
            navHighlight.getBoundingClientRect();
            headerNav.classList.add('nav-highlight-ready');
        }
    }

    navTabs.forEach(tab => {
        tab.addEventListener('focus', () => {
            if (headerNav && headerNav.scrollWidth > headerNav.clientWidth) {
                const tabLeft = tab.offsetLeft;
                const tabWidth = tab.offsetWidth;
                const navWidth = headerNav.clientWidth;
                const targetLeft = tabLeft - (navWidth - tabWidth) / 2;
                headerNav.scrollTo({
                    left: Math.max(0, targetLeft),
                    behavior: typeof reducedMotion !== 'undefined' && reducedMotion.matches ? 'auto' : 'smooth'
                });
            }
        });
    });

    if (headerNav) {
        if ('ResizeObserver' in window) {
            const navResizeObserver = new ResizeObserver(positionNavHighlight);
            navResizeObserver.observe(headerNav);
            navTabs.forEach(tab => navResizeObserver.observe(tab));
        } else {
            window.addEventListener('resize', positionNavHighlight);
        }
        document.fonts?.ready.then(positionNavHighlight);
    }
    const pathText = document.getElementById('window-path-text');
    const scrollContainer = document.querySelector('.window-body');

    const mainSections = ['home', 'education', 'experience', 'projects', 'skills'];
    const separatePages = ['photography', 'blog', 'stats'];

    const pathMappings = {
        'home': 'C:\\nathan\\portfolio\\home.md',
        'education': 'C:\\nathan\\portfolio\\education.doc',
        'experience': 'C:\\nathan\\portfolio\\experience.txt',
        'projects': 'C:\\nathan\\portfolio\\projects.bat',
        'skills': 'C:\\nathan\\portfolio\\skills.cfg',
        'photography': 'C:\\nathan\\portfolio\\photos.exe',
        'blog': 'C:\\nathan\\portfolio\\blog.ini',
        'stats': 'C:\\nathan\\portfolio\\stats.sys'
    };

    let isProgrammaticScroll = false;
    let scrollTimeout = null;
    let pageTransition = null;
    let navigationVersion = 0;
    let navigationInitialized = false;
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) pageTransition?.skipTransition();
    });

    // History entries own their positions; tab returns also reuse the last view position.
    const viewPlaces = new Map();
    let pendingPlace = null;
    let placeSaveTimer = null;

    function saveVisitorPlace() {
        clearTimeout(placeSaveTimer);
        if (!scrollContainer || pendingPlace) return;
        const view = document.querySelector('.page-view.active')?.id.replace('view-', '');
        if (!view) return;
        const place = {
            view, top: scrollContainer.scrollTop,
            archiveOpen: document.querySelector('.projects-archive')?.open || false,
            ...(view === 'photography' ? { category: selectedPhotoCategory, count: renderedPhotoCount } : {})
        };
        viewPlaces.set(view, place);
        history.replaceState({ ...history.state, place }, '');
    }

    function restoreVisitorPlace(place) {
        const view = document.querySelector('.page-view.active')?.id.replace('view-', '');
        if (!place || place.view !== view || !Number.isFinite(place.top)) {
            pendingPlace = null;
            return;
        }
        pendingPlace = place;
        if (view === 'photography') {
            if (selectedPhotoCategory !== place.category) {
                loadPhotosByCategory(place.category || 'all');
                return;
            }
            if (!galleryPhotos.length && photoGrid?.getAttribute('aria-busy') === 'true') return;
            // Initial category discovery may still be pending.
            if (!galleryPhotos.length && !galleryLoaded) return;
            while (renderedPhotoCount < Math.min(place.count || 12, galleryPhotos.length)) appendPhotoBatch();
        }
        const archive = document.querySelector('.projects-archive');
        if (archive && view === 'portfolio') archive.open = Boolean(place.archiveOpen);
        isProgrammaticScroll = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollContainer.scrollTo({ top: Math.max(0, place.top), behavior: 'instant' });
        pendingPlace = null;
        saveVisitorPlace();
        scrollTimeout = setTimeout(() => { isProgrammaticScroll = false; }, 100);
    }

    scrollContainer?.addEventListener('scroll', () => {
        clearTimeout(placeSaveTimer);
        placeSaveTimer = setTimeout(saveVisitorPlace, 150);
    }, { passive: true });
    window.addEventListener('pagehide', saveVisitorPlace);
    document.querySelector('.projects-archive')?.addEventListener('toggle', saveVisitorPlace);

    function updateActiveNav(tabName) {
        navTabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
                t.setAttribute('aria-current', 'location');
            } else {
                t.classList.remove('active');
                t.removeAttribute('aria-current');
            }
        });
        positionNavHighlight();

        if (pathText && pathMappings[tabName]) {
            pathText.textContent = pathMappings[tabName];
        }
    }

    function showPageView(viewName) {
        const previousView = document.querySelector('.page-view.active');
        // Hide all page views
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.remove('active');
        });

        // Determine which view to activate
        const targetViewId = separatePages.includes(viewName) ? `view-${viewName}` : 'view-portfolio';
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.add('active');
            targetView.classList.toggle('page-enter', previousView !== targetView && !document.startViewTransition);
        }

        // Trigger dynamic content on separate pages
        if (viewName === 'photography') {
            initPhotographyGallery();
        } else if (viewName === 'stats') {
            loadStatsAndRenderChart();
            if (typeof loadSectionStats === 'function') {
                loadSectionStats();
            }
        } else if (viewName === 'blog') {
            loadBlogPosts();
        }
    }

    function navigateTo(target, updateHistory = true, place = null) {
        const version = ++navigationVersion;
        const targetViewId = separatePages.includes(target) ? `view-${target}` : 'view-portfolio';
        const switchingViews = document.querySelector('.page-view.active')?.id !== targetViewId;
        pageTransition?.skipTransition();
        pageTransition = null;

        if (navigationInitialized && switchingViews && !reducedMotion.matches && document.startViewTransition) {
            const transition = document.startViewTransition(() => {
                // A newer click supersedes callbacks waiting for a snapshot.
                if (version === navigationVersion) performNavigation(target, updateHistory, place);
            });
            pageTransition = transition;
            transition.ready.catch(() => {}); // Skipped transitions still apply their DOM update.
            transition.finished.catch(error => console.warn('Page transition failed.', error)).finally(() => {
                if (pageTransition === transition) pageTransition = null;
            });
        } else {
            performNavigation(target, updateHistory, place);
        }
        navigationInitialized = true;
    }

    function performNavigation(target, updateHistory = true, place = null) {
        if (updateHistory) saveVisitorPlace();
        const destinationView = separatePages.includes(target) ? target : 'portfolio';
        const saved = place || (updateHistory && separatePages.includes(target) ? viewPlaces.get(destinationView) : null);
        pendingPlace = saved;
        if (saved?.view === 'photography' && !photographyInitialized) {
            selectedPhotoCategory = saved.category || 'all';
        }
        if (!target) target = 'home';
        if (typeof trackSectionVisit === 'function') {
            trackSectionVisit(target);
        }

        if (separatePages.includes(target)) {
            // It's a separate page (photography, blog, stats)
            showPageView(target);
            updateActiveNav(target);

            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }

            if (updateHistory) {
                const newPath = target === 'photography' ? '/photos' : `/${target}`;
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
                    scrollContainer.scrollTo({ top: 0, behavior: wasSeparatePage || reducedMotion.matches ? 'auto' : 'smooth' });
                } else {
                    const targetTop = targetPanel.offsetTop - 15;
                    scrollContainer.scrollTo({ top: targetTop > 0 ? targetTop : 0, behavior: wasSeparatePage || reducedMotion.matches ? 'auto' : 'smooth' });
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
        if (saved) restoreVisitorPlace(saved);
        else saveVisitorPlace();
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
        if (cleanPath === 'photos') return 'photography';
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
        clearTimeout(placeSaveTimer);
        const target = (e.state && e.state.page) || getTabFromPath() || 'home';
        navigateTo(target, false, e.state?.place || null);
        if (e.state && e.state.post) {
            openBlogModal(e.state.post, false);
        } else if (blogModal && blogModal.classList.contains('active')) {
            closeBlogModal(false);
        }
    });

    // Track the reading position, including short sections at the bottom of the window.
    function setupScrollspy() {
        if (!scrollContainer) return;
        const mainPanels = [...document.querySelectorAll('#view-portfolio .panel')];
        const portfolioView = document.getElementById('view-portfolio');
        if (!mainPanels.length || !portfolioView) return;
        let framePending = false;

        function syncScrollspy() {
            framePending = false;
            if (isProgrammaticScroll || !portfolioView.classList.contains('active')) return;

            const remainingScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
            const atBottom = scrollContainer.scrollTop > 0 && remainingScroll <= 2;
            let currentPanel = mainPanels[0];
            if (atBottom) {
                currentPanel = mainPanels[mainPanels.length - 1];
            } else {
                const readingLine = scrollContainer.getBoundingClientRect().top + scrollContainer.clientHeight * 0.35;
                for (const panel of mainPanels) {
                    if (panel.getBoundingClientRect().top <= readingLine) currentPanel = panel;
                    else break;
                }
            }

            const sectionId = currentPanel.id.replace('panel-', '');
            updateActiveNav(sectionId);
            const newPath = sectionId === 'home' ? '/' : `/${sectionId}`;
            if (window.location.pathname !== newPath) {
                history.replaceState({ ...history.state, page: sectionId }, '', newPath);
            }
        }

        function scheduleScrollspy() {
            if (framePending) return;
            framePending = true;
            requestAnimationFrame(syncScrollspy);
        }

        scrollContainer.addEventListener('scroll', scheduleScrollspy, { passive: true });
        window.addEventListener('resize', scheduleScrollspy);
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(scheduleScrollspy);
            resizeObserver.observe(scrollContainer);
            resizeObserver.observe(portfolioView);
        }
        scheduleScrollspy();
    }

    // Check URL path on page load
    const initialTab = getTabFromPath() || 'home';
    const initialPost = getInitialBlogPost();
    queueMicrotask(() => navigateTo(initialTab, false, history.state?.place || null));

    setupScrollspy();

    // Reveal each section once, without hiding content while waiting for observation.
    if ('IntersectionObserver' in window && scrollContainer) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (!reducedMotion.matches) entry.target.classList.add('section-enter');
                revealObserver.unobserve(entry.target);
            });
        }, { root: scrollContainer, threshold: 0, rootMargin: '0px 0px -24px 0px' });
        document.querySelectorAll('.page-view .panel').forEach(panel => revealObserver.observe(panel));
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

        if (statsLoading) return;
        statsLoading = true;
        const status = document.getElementById('stats-status');
        const chartCanvas = document.getElementById('statsChart');
        if (chartCanvas) chartCanvas.hidden = true;
        setLoadState(status, 'loading stats...', null, true);
        const counters = [
            [totalViewsEl, '/api/total', 'total'],
            [uniqueViewsEl, '/api/unique/count', 'count'],
            [views24hEl, '/api/total/requests24h', 'requests24h'],
            [resumeClicksEl, '/api/resume/count', 'clicks'],
        ];
        const counts = await Promise.allSettled(counters.map(async ([element, endpoint, field]) => {
            if (element) element.textContent = '…';
            try {
                const data = await fetchJSON(API_BASE + endpoint);
                if (typeof data[field] !== 'number') throw new Error('Invalid counter');
                if (element) element.textContent = data[field];
            } catch (error) {
                if (element) element.textContent = '—';
                throw error;
            }
        }));
        let failed = counts.some(result => result.status === 'rejected');
        try {
            const [totalRes, uniqueRes] = await Promise.all([
                fetchJSON(API_BASE + '/api/total/history7d'),
                fetchJSON(API_BASE + '/api/unique/history7d')
            ]);
            if (![totalRes, uniqueRes].every(data => Array.isArray(data.days) && Array.isArray(data.counts))) {
                throw new Error('Invalid chart data');
            }
            const labels = totalRes.days.map(ts => {
                const d = new Date(ts);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            });

            const ctx = document.getElementById('statsChart');
            if (!ctx) return;

            // Load Chart.js dynamically on-demand if not already loaded
            if (typeof window.Chart === 'undefined') {
                try {
                    await loadScript('/vendor/chart.umd.js');
                } catch (loadErr) {
                    throw loadErr;
                }
            }

            // Destroy existing instance to avoid duplicates
            if (statsChartInstance) {
                statsChartInstance.destroy();
            }

            const borderCol = '#1e1e1e';
            const textCol = '#1e1e1e';
            const gridCol = 'rgba(30, 30, 30, 0.05)';

            ctx.hidden = false;
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
            failed = true;
            if (chartCanvas) chartCanvas.hidden = true;
        } finally {
            statsLoading = false;
            setLoadState(status, failed ? 'some stats are unavailable.' : '', failed ? loadStatsAndRenderChart : null);
        }
    }

    // ----------------------------------------------------
    // 3.1. Most-Clicked Sections Telemetry
    // ----------------------------------------------------
    let sectionStatsLoading = false;
    const SECTION_METADATA = {
        projects: { path: '/projects' },
        photography: { path: '/photos' },
        experience: { path: '/experience' },
        blog: { path: '/blog' },
        education: { path: '/education' },
        skills: { path: '/skills' }
    };

    const recordedSectionsThisSession = new Set();

    function trackSectionVisit(section) {
        if (!section || !SECTION_METADATA[section]) return;
        if (recordedSectionsThisSession.has(section)) return;
        recordedSectionsThisSession.add(section);
        fetch(API_BASE + `/api/sections/increment?section=${encodeURIComponent(section)}`, {
            method: 'POST',
            keepalive: true
        }).catch(() => {});
    }

    async function loadSectionStats() {
        const container = document.getElementById('section-stats-container');
        const statusEl = document.getElementById('section-stats-status');
        if (!container || sectionStatsLoading) return;

        sectionStatsLoading = true;
        if (typeof setLoadState === 'function') {
            setLoadState(statusEl, 'loading section breakdown...', null, true);
        }

        try {
            const data = await fetchJSON(API_BASE + '/api/sections');
            renderSectionStats(data, container);
            if (typeof setLoadState === 'function') {
                setLoadState(statusEl, '', null);
            }
        } catch (error) {
            console.error('Error fetching section stats:', error);
            const fallbackData = {
                projects: 0,
                photography: 0,
                experience: 0,
                blog: 0,
                education: 0,
                skills: 0
            };
            renderSectionStats(fallbackData, container);
            if (typeof setLoadState === 'function') {
                setLoadState(statusEl, 'offline metrics shown.', loadSectionStats);
            }
        } finally {
            sectionStatsLoading = false;
        }
    }

    function renderSectionStats(data, container) {
        if (!container) return;
        container.innerHTML = '';

        const entries = Object.entries(data)
            .filter(([key]) => SECTION_METADATA[key])
            .map(([key, count]) => ({
                key,
                count: typeof count === 'number' ? count : 0,
                ...SECTION_METADATA[key]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        const total = entries.reduce((sum, item) => sum + item.count, 0);

        entries.forEach((item, index) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const rank = index + 1;
            const isTop = rank === 1 && item.count > 0;
            const row = document.createElement('div');
            row.className = `section-stat-row${isTop ? ' rank-top' : ''}`;
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Navigate to ${item.path} section (${item.count.toLocaleString()} views, ${pct}%)`);

            row.innerHTML = `
                <div class="section-stat-info">
                    <div class="section-stat-name-group">
                        <span class="section-stat-rank">${isTop ? '★ #1' : `#${rank}`}</span>
                        <span class="section-stat-path">${item.path}</span>
                    </div>
                    <div class="section-stat-metrics">
                        <span class="section-stat-count">${item.count.toLocaleString()} views</span>
                        <span class="section-stat-pct">${pct}%</span>
                    </div>
                </div>
                <div class="section-stat-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${item.path} view percentage: ${pct}%">
                    <div class="section-stat-fill" style="width: 0%;"></div>
                </div>
            `;

            const jumpToSection = () => {
                navigateTo(item.key, true);
            };
            row.addEventListener('click', jumpToSection);
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    jumpToSection();
                }
            });

            container.appendChild(row);

            requestAnimationFrame(() => {
                const fill = row.querySelector('.section-stat-fill');
                if (fill) fill.style.width = `${pct}%`;
            });
        });
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
    const PHOTOS_PER_BATCH = 12;
    let photographyInitialized = false;
    let selectedPhotoCategory = 'all';
    let galleryLoaded = false;
    let galleryRequest = 0;
    let galleryPhotos = [];
    let renderedPhotoCount = 0;
    let isAppendingBatch = false;
    let activePhotoIndex = 0;
    let photoInfiniteObserver = null;
    const photoGrid = document.getElementById('portfolio-photo-grid');
    const photoInfiniteContainer = document.getElementById('photo-infinite-container');
    const photoSentinel = document.getElementById('photo-sentinel');
    const photoInfiniteStatus = document.getElementById('photo-infinite-status');
    const photoLoadMoreBtn = document.getElementById('photo-load-more');
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
            // Photography is served by the Pages R2 binding, independently of analytics.
            const response = await fetch('/api/categories');
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
            console.warn('Failed to load photo location filters.', e);
        }

        // Bind filter button click events
        if (photoCategoryFilters) {
            photoCategoryFilters.addEventListener('click', function (e) {
                const target = e.target;
                if (target.classList.contains('photo-cat')) {
                    document.querySelectorAll('.photo-cat').forEach(b => b.classList.remove('active'));
                    target.classList.add('active');
                    const category = target.getAttribute('data-category');
                    pendingPlace = null;
                    loadPhotosByCategory(category);
                }
            });
        }

        if (photoLoadMoreBtn) {
            photoLoadMoreBtn.addEventListener('click', () => appendPhotoBatch());
        }

        // Initial load
        loadPhotosByCategory(selectedPhotoCategory);
    }

    async function loadPhotosByCategory(category) {
        if (!photoGrid) return;
        if (typeof selectedPhotoCategory !== 'undefined') selectedPhotoCategory = category;
        if (typeof galleryLoaded !== 'undefined') galleryLoaded = false;
        if (typeof photoCategoryFilters !== 'undefined' && photoCategoryFilters) {
            photoCategoryFilters.querySelectorAll('.photo-cat').forEach(button => {
                button.classList.toggle('active', button.getAttribute('data-category') === category);
            });
        }
        const request = typeof galleryRequest !== 'undefined' ? ++galleryRequest : 0;
        if (typeof photoInfiniteObserver !== 'undefined' && photoInfiniteObserver) {
            photoInfiniteObserver.disconnect();
        }
        if (typeof galleryPhotos !== 'undefined') galleryPhotos = [];
        if (typeof renderedPhotoCount !== 'undefined') renderedPhotoCount = 0;
        if (typeof photoInfiniteContainer !== 'undefined' && photoInfiniteContainer) {
            photoInfiniteContainer.hidden = true;
        }
        if (typeof setLoadState === 'function') {
            setLoadState(photoGrid, 'loading photos...', null, true);
        } else {
            photoGrid.innerHTML = '<p class="photo-status" role="status">loading photos...</p>';
        }

        try {
            const response = await fetch(`/api/images/${encodeURIComponent(category)}`);
            if (!response.ok) throw new Error(`Photography API returned ${response.status}`);
            const images = await response.json();
            if (typeof galleryRequest !== 'undefined' && request !== galleryRequest) return;
            if (!Array.isArray(images)) throw new Error('Invalid photography API response');
            if (typeof galleryLoaded !== 'undefined') galleryLoaded = true;

            if (images.length === 0) {
                if (typeof galleryPhotos !== 'undefined') galleryPhotos = [];
                if (typeof renderedPhotoCount !== 'undefined') renderedPhotoCount = 0;
                if (typeof photoInfiniteContainer !== 'undefined' && photoInfiniteContainer) {
                    photoInfiniteContainer.hidden = true;
                }
                if (typeof setLoadState === 'function') {
                    setLoadState(photoGrid, 'no photos in this category.');
                    if (typeof pendingPlace !== 'undefined') pendingPlace = null;
                } else {
                    photoGrid.innerHTML = '<p class="photo-status" role="status">no photos in this category.</p>';
                }
                return;
            }

            if (typeof photoGrid.setAttribute === 'function') {
                photoGrid.setAttribute('aria-busy', 'false');
            }
            renderPhotos(images);
            if (typeof pendingPlace !== 'undefined' && pendingPlace) restoreVisitorPlace(pendingPlace);
            else if (typeof saveVisitorPlace === 'function') saveVisitorPlace();
        } catch (e) {
            if (typeof galleryRequest !== 'undefined' && request !== galleryRequest) return;
            if (typeof pendingPlace !== 'undefined') pendingPlace = null;
            if (typeof galleryLoaded !== 'undefined') galleryLoaded = true;
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Error fetching category images.', e);
            }
            if (typeof galleryRequest !== 'undefined' && request !== galleryRequest) return;
            if (typeof photoInfiniteContainer !== 'undefined' && photoInfiniteContainer) {
                photoInfiniteContainer.hidden = true;
            }
            if (typeof setLoadState === 'function') {
                setLoadState(photoGrid, 'photos unavailable.', () => loadPhotosByCategory(category));
            } else {
                photoGrid.innerHTML = '<p class="photo-status" role="status">photos unavailable. please try again later.</p>';
            }
        }
    }

    function renderPhotos(images) {
        if (!photoGrid) return;
        photoGrid.innerHTML = '';
        galleryPhotos = images;
        renderedPhotoCount = 0;

        setupInfiniteObserver();
        appendPhotoBatch();
    }

    function setupInfiniteObserver() {
        if (photoInfiniteObserver) {
            photoInfiniteObserver.disconnect();
        }
        if (typeof IntersectionObserver !== 'undefined' && photoSentinel) {
            photoInfiniteObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !isAppendingBatch && renderedPhotoCount < galleryPhotos.length) {
                        appendPhotoBatch();
                    }
                });
            }, {
                root: (typeof scrollContainer !== 'undefined' && scrollContainer) ? scrollContainer : null,
                rootMargin: '300px',
                threshold: 0
            });
        }
    }

    function appendPhotoBatch() {
        if (!photoGrid || isAppendingBatch) return;
        if (renderedPhotoCount >= galleryPhotos.length) {
            updateInfiniteStatus();
            return;
        }

        isAppendingBatch = true;
        const startIdx = renderedPhotoCount;
        const endIdx = Math.min(startIdx + PHOTOS_PER_BATCH, galleryPhotos.length);
        const batch = galleryPhotos.slice(startIdx, endIdx);

        batch.forEach((image, index) => {
            const globalIndex = startIdx + index;
            const card = document.createElement('button');
            card.type = 'button';
            card.setAttribute('aria-label', `Open photo: ${image.name || 'Untitled'}`);
            card.className = 'photo-card';

            const img = document.createElement('img');
            let imgUrl = image.thumbnailUrl || image.url;
            img.decoding = 'async';
            if (image.thumbnailSrcset) {
                img.srcset = image.thumbnailSrcset;
                img.sizes = '(max-width: 768px) calc(100vw - 64px), 370px';
            }
            if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
                imgUrl = '/' + imgUrl;
            }
            img.alt = image.name || 'Portfolio photo';

            // Modern Web guidance: fetchpriority="high" on initial above-the-fold images,
            // loading="lazy" on remaining images.
            if (globalIndex < 2) {
                img.setAttribute('fetchpriority', 'high');
            } else {
                img.loading = 'lazy';
            }

            img.classList.add('photo-loading');
            const revealImage = () => img.classList.remove('photo-loading');
            img.addEventListener('load', revealImage, { once: true });
            img.addEventListener('error', () => {
                if (image.thumbnailUrl && img.getAttribute('src') !== image.url) {
                    img.removeAttribute('srcset');
                    img.src = image.url;
                }
                revealImage();
                img.alt = image.name || 'Portfolio photo';
            }, { once: true });
            img.src = imgUrl;
            if (img.complete && img.naturalWidth > 0) revealImage();

            card.appendChild(img);
            card.addEventListener('click', () => openPhotoModal(image));
            photoGrid.appendChild(card);
        });

        renderedPhotoCount = endIdx;
        isAppendingBatch = false;
        updateInfiniteStatus();
    }

    function updateInfiniteStatus() {
        if (!photoInfiniteContainer) return;
        if (!galleryPhotos || galleryPhotos.length === 0) {
            photoInfiniteContainer.hidden = true;
            if (typeof photoInfiniteObserver !== 'undefined' && photoInfiniteObserver && photoSentinel) {
                photoInfiniteObserver.unobserve(photoSentinel);
            }
            return;
        }

        photoInfiniteContainer.hidden = false;

        if (renderedPhotoCount >= galleryPhotos.length) {
            if (photoInfiniteStatus) {
                photoInfiniteStatus.textContent = `all ${galleryPhotos.length} photos loaded.`;
            }
            if (photoLoadMoreBtn) {
                photoLoadMoreBtn.hidden = true;
            }
            if (typeof photoInfiniteObserver !== 'undefined' && photoInfiniteObserver && photoSentinel) {
                photoInfiniteObserver.unobserve(photoSentinel);
            }
        } else {
            if (photoInfiniteStatus) {
                photoInfiniteStatus.textContent = `showing ${renderedPhotoCount} of ${galleryPhotos.length} photos`;
            }
            if (typeof photoInfiniteObserver !== 'undefined' && photoSentinel && photoInfiniteObserver) {
                // Re-arm after each batch: the sentinel may still be in the
                // preload area, so waiting for a new threshold crossing can stall.
                photoInfiniteObserver.unobserve(photoSentinel);
                photoInfiniteObserver.observe(photoSentinel);
            }
            if (photoLoadMoreBtn) {
                photoLoadMoreBtn.hidden = false;
            }
        }
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

        activePhotoIndex = Math.max(0, galleryPhotos.indexOf(photo));
        const photoCounter = document.getElementById('photo-counter');
        const prevBtn = document.getElementById('photo-prev');
        const nextBtn = document.getElementById('photo-next');

        if (photoCounter) {
            photoCounter.textContent = `${activePhotoIndex + 1} / ${galleryPhotos.length || 1}`;
        }
        if (prevBtn) {
            prevBtn.disabled = galleryPhotos.length < 2;
        }
        if (nextBtn) {
            nextBtn.disabled = galleryPhotos.length < 2;
        }

        const imageStatus = document.getElementById('photo-image-status');
        modalImage.hidden = true;
        setLoadState(imageStatus, 'loading photo...', null, true);
        modalImage.onload = () => {
            modalImage.hidden = false;
            setLoadState(imageStatus);
        };
        modalImage.onerror = () => {
            modalImage.hidden = true;
            setLoadState(imageStatus, 'photo unavailable.', () => openPhotoModal(photo));
        };
        modalImage.alt = photo.name || 'Portfolio photo';
        modalImage.src = imgUrl;
        if (modalImage.complete && modalImage.naturalWidth > 0) modalImage.onload();
        modalPhotoName.textContent = photo.name || 'Untitled Image';

        // Update return focus to current card if gallery card is present
        const allCards = photoGrid?.querySelectorAll('.photo-card');
        if (allCards && allCards[activePhotoIndex]) {
            modalReturnFocus = allCards[activePhotoIndex];
        }

        // EXIF data mapping
        if (exifCamera) exifCamera.textContent = photo.camera || photo.exif?.camera || '—';
        if (exifLens) exifLens.textContent = photo.lens || photo.exif?.lens || '—';
        if (exifExposure) exifExposure.textContent = photo.exposure || photo.exif?.exposure || '—';
        if (exifAperture) exifAperture.textContent = photo.aperture || photo.exif?.aperture || '—';
        if (exifIso) exifIso.textContent = photo.iso || photo.exif?.iso || '—';
        if (exifLocation) exifLocation.textContent = photo.location || photo.exif?.location || '—';

        showAccessibleModal(photoModal, modalCloseBtn);
    }

    function closePhotoModal() {
        if (photoModal) {
            if (galleryPhotos && galleryPhotos.length > 0 && activePhotoIndex >= 0) {
                while (renderedPhotoCount <= activePhotoIndex && renderedPhotoCount < galleryPhotos.length) {
                    appendPhotoBatch();
                }
                const allCards = photoGrid?.querySelectorAll('.photo-card');
                if (allCards && allCards[activePhotoIndex]) {
                    modalReturnFocus = allCards[activePhotoIndex];
                    if (typeof allCards[activePhotoIndex].scrollIntoView === 'function') {
                        allCards[activePhotoIndex].scrollIntoView({ block: 'nearest' });
                    }
                }
            }
            hideAccessibleModal(photoModal);
        }
    }

    function stepPhoto(direction) {
        if (!galleryPhotos || galleryPhotos.length < 2) return;
        activePhotoIndex = (activePhotoIndex + direction + galleryPhotos.length) % galleryPhotos.length;
        while (renderedPhotoCount <= activePhotoIndex && renderedPhotoCount < galleryPhotos.length) {
            appendPhotoBatch();
        }
        openPhotoModal(galleryPhotos[activePhotoIndex]);
    }
    document.getElementById('photo-prev')?.addEventListener('click', () => stepPhoto(-1));
    document.getElementById('photo-next')?.addEventListener('click', () => stepPhoto(1));

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
            "date": "Aug. 20, 2026 (Updated Sep. 21, 2026)",
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

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function renderBlogCards(posts) {
        if (!blogCardsContainer) return;
        blogCardsContainer.innerHTML = '';
        posts.forEach(post => {
            if (!/^[a-z0-9-]+$/.test(post.id)) return;
            const card = document.createElement('div');
            card.className = 'retro-card';
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">${escapeHtml(post.title)}</h3>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="retro-badge"><i class="far fa-clock"></i> ${escapeHtml(post.readTime)}</span>
                        <span class="retro-badge">${escapeHtml(post.date)}</span>
                    </div>
                </div>
                <p style="margin-bottom: 1rem;">${escapeHtml(post.summary)}</p>
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
        if (!/^[a-z0-9-]+$/.test(slug)) return;

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
        if (modalBlogFilename) {
            modalBlogFilename.textContent = post.file || `${slug}.md`;
        }

        showAccessibleModal(blogModal, blogModalCloseBtn);
        setLoadState(modalBlogContent, 'fetching markdown content...', null, true);

        if (updateHistory) {
            const targetUrl = `/blog/${slug}`;
            if (window.location.pathname !== targetUrl) {
                saveVisitorPlace();
                history.pushState({ ...history.state, tab: 'blog', post: slug }, '', targetUrl);
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
                    await loadScript('/vendor/marked.umd.js');
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
                    .map(p => `<p>${escapeHtml(p)}</p>`)
                    .join('');
            }

            modalBlogTitle.textContent = post.title;
            modalBlogDate.textContent = post.date;
            modalBlogContent.setAttribute('aria-busy', 'false');
            if (window.DOMPurify?.isSupported) {
                modalBlogContent.innerHTML = window.DOMPurify.sanitize(renderedHtml, {
                    USE_PROFILES: { html: true },
                    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
                    FORBID_ATTR: ['style', 'id', 'name']
                });
            } else {
                // Fail closed if the sanitizer fails to load or is unsupported.
                modalBlogContent.textContent = markdownText;
            }
        } catch (error) {
            console.error("Error loading blog post:", error);
            modalBlogTitle.textContent = "Error Loading Post";
            setLoadState(modalBlogContent, `could not load article "${slug}".`, () => openBlogModal(slug, false));
        }
    }

    function closeBlogModal(updateHistory = true) {
        if (blogModal) {
            hideAccessibleModal(blogModal);
        }
        if (updateHistory && (window.location.pathname.startsWith('/blog/') || window.location.search.includes('post='))) {
            history.pushState({ page: 'blog', place: history.state?.place }, '', '/blog');
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

    // Global keyboard listener to manage modal focus, Escape dismiss, and photo navigation
    document.addEventListener('keydown', function (e) {
        if (activeModal) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                if (activeModal === photoModal) {
                    closePhotoModal();
                } else if (activeModal === blogModal) {
                    closeBlogModal(true);
                } else {
                    hideAccessibleModal(activeModal);
                }
                return;
            }
            if (e.key === 'Tab') {
                trapModalFocus(activeModal, e);
                return;
            }
            if (activeModal === photoModal) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    stepPhoto(-1);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    stepPhoto(1);
                }
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

    // Fade in page body
    document.body.classList.add('loaded');
});
