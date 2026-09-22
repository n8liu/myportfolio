/**
 * Archived Legacy Terminal Subsystem (NathanOS Terminal Widget)
 * 
 * This file contains the complete terminal widget logic and command set previously
 * embedded in script.js. It is archived here to reduce client bundle size and
 * keep the core portfolio fast and decluttered.
 * 
 * To re-enable:
 * 1. Uncomment the terminal markup in index.html (<aside class="terminal-widget"...>)
 * 2. Re-include terminal CSS in styles.css
 * 3. Import and call initTerminal(context) in script.js
 */

export function initTerminal(context = {}) {
    const { switchTab, openBlogModal, cachedBlogPosts = [] } = context;

    const terminalWidget = document.getElementById('terminal-widget');
    const terminalBody = document.getElementById('terminal-body');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const terminalClearBtn = document.getElementById('terminal-clear');
    const terminalMinBtn = document.getElementById('terminal-minimize');
    const terminalCloseBtn = document.getElementById('terminal-close');
    const taskbarTerminalBtn = document.getElementById('taskbar-terminal-btn');
    const taskbarStartBtn = document.getElementById('taskbar-start-btn');

    if (!terminalWidget) return;

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

        commandHistory.push(cmd);
        historyIndex = commandHistory.length;

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
• Passionate about street photography (Fujifilm X100VI) and fitness.
• Seeking 2026 Full-Time Software Engineering & Data Science opportunities.
                `.trim(), 'output');
                break;

            case 'skills':
            case 'stack':
                printTerminalLine(`
<span class="terminal-accent">Technical Skills & Technologies:</span>
  • <span class="cmd-highlight">Languages:</span>      Python, Java, SQL (PostgreSQL), C/C++, JavaScript, TypeScript, Dart
  • <span class="cmd-highlight">Cloud & Systems:</span> Git, Docker, AWS, Cloudflare Edge
  • <span class="cmd-highlight">Data & ML:</span>      PyTorch, NumPy, pandas, Matplotlib, PySpark, LangChain, Hugging Face
  • <span class="cmd-highlight">Web:</span>            React, Node.js, FastAPI, Express, Flask, Flutter
                `.trim(), 'output');
                break;

            case 'projects':
                printTerminalLine(`
<span class="terminal-accent">Featured Projects:</span>
  [1] <span class="cmd-highlight">Event-Driven Market Pipeline</span>: Zero-shot transformer embeddings & streaming cluster dedup.
  [2] <span class="cmd-highlight">CardboardDex</span>: Trading card market platform with real-time price trends.
  [3] <span class="cmd-highlight">SimplyMail</span>: Fast web Gmail client built with JavaScript & Firebase.
  [4] <span class="cmd-highlight">Spotify Analytics</span>: Listening telemetry dashboard & genre analyzer.
                `.trim(), 'output');
                break;

            case 'experience':
                printTerminalLine(`
<span class="terminal-accent">Experience:</span>
  • Carbon Sustain — Data Engineer Intern (2025)
  • UnifIBD — Software Engineer (2025)
  • L.A. Lucky Import & Export — Data Science Intern (2024)
                `.trim(), 'output');
                break;

            case 'education':
                printTerminalLine(`
<span class="terminal-accent">Education — UC Berkeley (Class of 2026):</span>
  • Degree: B.A. Data Science & Computer Science (GPA: 3.70)
  • CS Core: CS 61A, CS 61B, CS 61C, CS 161, CS 162, CS 170, CS 186, CS 189
  • Data Core: DATA 8, DATA 100, DATA C101, DATA 140, EECS 127
                `.trim(), 'output');
                break;

            case 'matcha':
                printTerminalLine(`
<span class="terminal-accent">🍵 Nathan's Matcha Power Rankings:</span>
  1. Airoma Cafe (Fountain Valley, CA): Matcha Einspanner (5/5) ★
  2. Brew Story (Huntington Beach, CA): Banana Cream Matcha (4.5/5)
  3. Matsu Matcha (Cupertino, CA): Biscoff Matcha (4.5/5)
                `.trim(), 'output');
                break;

            case 'blog':
                if (args.length > 0 && typeof openBlogModal === 'function') {
                    const slug = args[args.length - 1].toLowerCase();
                    openBlogModal(slug);
                    printTerminalLine(`<span class="terminal-line success">Opening article: ${slug}...</span>`);
                } else {
                    let listStr = `<span class="terminal-accent">Available Blog Articles:</span>\n`;
                    cachedBlogPosts.forEach((p, i) => {
                        listStr += `  [${i + 1}] <span class="cmd-highlight">${p.id}</span> (${p.date})\n      ${p.title}\n`;
                    });
                    printTerminalLine(listStr.trim(), 'output');
                }
                break;

            case 'photos':
                printTerminalLine(`
<span class="terminal-accent">Photography:</span>
  • Primary Body: <span class="cmd-highlight">Fujifilm X100VI</span> (23mm F2 Fixed)
  • Video Setup:  <span class="cmd-highlight">Sony ZVE10 II</span>
                `.trim(), 'output');
                break;

            case 'goto':
                if (args.length > 0 && typeof switchTab === 'function') {
                    const tab = args[0].toLowerCase();
                    const validTabs = ['home', 'experience', 'projects', 'skills', 'education', 'photography', 'blog', 'stats'];
                    if (validTabs.includes(tab)) {
                        switchTab(tab);
                        printTerminalLine(`<span class="terminal-line success">Navigated to ${tab}.</span>`);
                    } else {
                        printTerminalLine(`Unknown panel: "${tab}". Valid tabs: ${validTabs.join(', ')}`, 'error');
                    }
                }
                break;

            case 'clear':
                clearTerminal();
                break;

            case 'exit':
                toggleTerminal(false);
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

    if (terminalInput) {
        terminalInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = this.value;
                this.value = '';
                executeCommand(val);
            }
        });
    }

    if (terminalMinBtn) {
        terminalMinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFoldTerminal();
        });
    }

    if (terminalCloseBtn) {
        terminalCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTerminal(false);
        });
    }

    if (terminalClearBtn) {
        terminalClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearTerminal();
        });
    }

    window.toggleTerminal = toggleTerminal;
    window.toggleFoldTerminal = toggleFoldTerminal;
}
