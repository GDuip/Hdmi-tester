document.addEventListener('DOMContentLoaded', () => {
  const App = {
    // --- Cache DOM Elements ---
    elements: {
      // Sidebar & Navigation
      appSidebar: document.getElementById('appSidebar'),
      sidebarToggleDesktop: document.getElementById('sidebarToggleDesktop'),
      sidebarToggleMobile: document.getElementById('sidebarToggleMobile'),
      navLinks: document.querySelectorAll('.app-sidebar .nav-link'),
      pageTitle: document.querySelector('.page-header h1'),
      contentPanels: document.querySelectorAll('.content-panel'),
      // Theme & Controls
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      themeIconSun: document.getElementById('themeIconSun'),
      themeIconMoon: document.getElementById('themeIconMoon'),
      copyReportBtn: document.getElementById('copyReportBtn'),
      currentYear: document.getElementById('currentYear'),
      tooltip: document.getElementById('tooltip'),
      // Specific Buttons
      loadMultiScreenBtn: document.getElementById('loadMultiScreenBtn'),
      startRefreshRateTestBtn: document.getElementById('startRefreshRateTestBtn'),
      loadAudioDevicesBtn: document.getElementById('loadAudioDevicesBtn'),
      checkVideoCodecsBtn: document.getElementById('checkVideoCodecsBtn'),
      checkAudioCodecsBtn: document.getElementById('checkAudioCodecsBtn'),
      checkDrmBtn: document.getElementById('checkDrmBtn'),
      startSpeedTestBtn: document.getElementById('startSpeedTestBtn'),
      loadLocalFontsBtn: document.getElementById('loadLocalFontsBtn'),
      loadWebGLExtensionsBtn: document.getElementById('loadWebGLExtensionsBtn'),
    },

    // --- Application State ---
    state: {
      currentTheme: localStorage.getItem('theme') || 'light',
      isSidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
      isMobileSidebarOpen: false,
      isFpsEstimating: false,
      fpsRafId: null,
      fpsFrames: [],
      fpsVisualizerFrames: Array(50).fill(0), // For consistent bar count
      fpsLastFrameTime: performance.now(),
      fpsVisualizerCtx: null,
      tooltipTimeout: null,
      webGlContext: null, // Store WebGL context
    },

    // --- Utility Functions ---
    getEl: (id) => document.getElementById(id), // Shortcut
    setText: (id, value, {
      className = 'card-value',
      status = '',
      isCode = false
    } = {}) => {
      const el = App.getEl(id);
      if(!el) return;
      el.textContent = (value === undefined || value === null || String(value).trim() === '') ? 'N/A' : String(value);
      el.className = className; // Base class is just card-value
      if(isCode) el.classList.add('code-text');
      if(status) el.classList.add(`value-${status}`); // e.g., value-success, value-warning
    },
    setHTMLList: (containerId, itemsArray, itemClass = 'list-item', emptyMessage = 'No items found.') => {
      const container = App.getEl(containerId);
      if(!container) return;
      if(itemsArray && itemsArray.length > 0) {
        container.innerHTML = itemsArray.map(item => `<div class="${itemClass}">${item}</div>`).join('');
      } else {
        container.innerHTML = `<div class="${itemClass}">${emptyMessage}</div>`;
      }
    },
    checkAPISupport: (condition, id, featureName, availability = true) => { // availability for things like Geolocation
      const baseText = availability ? (condition ? 'Supported' : 'Not Supported') : (condition ? 'Available' : 'Not Available');
      App.setText(id, baseText, {
        status: condition ? 'success' : 'warning'
      }); // Warning for not supported/available maybe better
      return !!condition; // Ensure boolean return
    },
    handleErrorText: (id, message = 'Error or N/A') => App.setText(id, message, {
      status: 'error'
    }),


    // --- Initialization ---
    init() {
      this.Theme.init();
      this.Sidebar.init(); // Handles desktop and mobile toggle
      this.Navigation.init();
      this.Tooltips.init();

      // Initialize information modules
      this.Display.init();
      this.SystemOS.init();
      this.Hardware.init();
      this.Media.init();
      this.Connectivity.init();
      this.Browser.init();
      this.Performance.init();
      this.AdvancedAPIs.init(); // New module for the extra APIs grouping

      if(this.elements.currentYear) this.elements.currentYear.textContent = new Date().getFullYear();
      this.elements.copyReportBtn?.addEventListener('click', () => this.Reporting.copyReport());
      console.log("Inspector Pro X Initialized.");
    },

    // --- Modules (Object-Based Namespacing) ---
    Theme: {
      init() {
        document.documentElement.setAttribute('data-theme', App.state.currentTheme);
        App.Theme.updateIcon(App.state.currentTheme);
        App.elements.themeToggleBtn?.addEventListener('click', App.Theme.toggle);
      },
      toggle() {
        App.state.currentTheme = (App.state.currentTheme === 'light') ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', App.state.currentTheme);
        localStorage.setItem('theme', App.state.currentTheme);
        App.Theme.updateIcon(App.state.currentTheme);
        if(App.state.fpsVisualizerCtx) App.Display.drawFpsVisualizer(); // Redraw with new theme colors
      },
      updateIcon(theme) {
        if(App.elements.themeIconSun && App.elements.themeIconMoon) {
          App.elements.themeIconSun.style.display = (theme === 'light') ? 'block' : 'none';
          App.elements.themeIconMoon.style.display = (theme === 'dark') ? 'block' : 'none';
        }
      }
    },

    Sidebar: {
      init() {
        // Desktop Toggle
        App.elements.sidebarToggleDesktop?.addEventListener('click', () => {
          App.state.isSidebarCollapsed = !App.state.isSidebarCollapsed;
          App.elements.appSidebar?.classList.toggle('collapsed', App.state.isSidebarCollapsed);
          localStorage.setItem('sidebarCollapsed', App.state.isSidebarCollapsed);
        });
        // Apply initial collapsed state on desktop
        if(window.innerWidth > 768) { // Only apply stored collapse state on larger screens
          App.elements.appSidebar?.classList.toggle('collapsed', App.state.isSidebarCollapsed);
        }


        // Mobile Toggle
        App.elements.sidebarToggleMobile?.addEventListener('click', () => {
          App.state.isMobileSidebarOpen = !App.state.isMobileSidebarOpen;
          App.elements.appSidebar?.classList.toggle('open', App.state.isMobileSidebarOpen);
          if(App.state.isMobileSidebarOpen && App.elements.appSidebar.classList.contains('collapsed')) {
            // If opening on mobile AND it was collapsed from desktop state, un-collapse it.
            App.elements.appSidebar.classList.remove('collapsed');
          }
        });

        // Close mobile sidebar if clicking outside (optional)
        document.addEventListener('click', (event) => {
          if(App.state.isMobileSidebarOpen &&
            !App.elements.appSidebar.contains(event.target) &&
            !App.elements.sidebarToggleMobile.contains(event.target)) {
            App.state.isMobileSidebarOpen = false;
            App.elements.appSidebar.classList.remove('open');
          }
        });


        // Resize listener to handle collapsing logic better for desktop/mobile views
        window.addEventListener('resize', () => {
          if(window.innerWidth > 768) { // Desktop
            App.elements.appSidebar.classList.remove('open'); // Ensure mobile 'open' class is removed
            App.state.isMobileSidebarOpen = false;
            // Re-apply desktop collapsed state if it was set
            App.elements.appSidebar.classList.toggle('collapsed', App.state.isSidebarCollapsed === true);
          } else { // Mobile
            // If sidebar was desktop-collapsed, it should remain logically collapsed (icon only mode)
            // but can still be forced 'open' physically with the 'open' class for mobile.
            // The 'collapsed' class primarily controls the text visibility and padding here for mobile logic.
            // App.elements.appSidebar.classList.remove('collapsed'); // Generally, mobile doesn't benefit from forced icon-only IF open.
          }
        });
        // Trigger resize once to set initial state correctly based on width AND stored preference
        window.dispatchEvent(new Event('resize'));
      }
    },

    Navigation: {
      init() {
        App.elements.navLinks.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            App.Navigation.navigateTo(e.currentTarget.dataset.target, e.currentTarget);
            if(App.state.isMobileSidebarOpen && window.innerWidth <= 768) { // Close mobile sidebar on nav
              App.state.isMobileSidebarOpen = false;
              App.elements.appSidebar.classList.remove('open');
            }
          });
        });
        // Initial page load - set title for the default active panel
        const activeLink = document.querySelector('.app-sidebar .nav-link.active');
        if(activeLink && App.elements.pageTitle) App.elements.pageTitle.textContent = activeLink.querySelector('.link-text').textContent;
      },
      navigateTo(targetPanelId, clickedLink) {
        App.elements.navLinks.forEach(l => l.classList.remove('active'));
        clickedLink.classList.add('active');

        App.elements.contentPanels.forEach(panel => panel.classList.remove('active'));
        const targetPanel = App.getEl(targetPanelId);
        if(targetPanel) targetPanel.classList.add('active');

        if(App.elements.pageTitle) App.elements.pageTitle.textContent = clickedLink.querySelector('.link-text').textContent;
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        }); // Scroll to top of new content panel
      }
    },

    Tooltips: {
      init() {
        document.querySelectorAll('[title]').forEach(el => {
          let originalTitle = el.title || '';
          el.addEventListener('mouseenter', (e) => {
            const currentTitle = el.getAttribute('data-dynamic-title') || originalTitle; // Use dynamic if set
            if(currentTitle) {
              el.setAttribute('data-original-title-store', originalTitle); //Store what was initially from HTML
              el.removeAttribute('title');
              App.Tooltips.show(e.currentTarget, currentTitle);
            }
          });
          el.addEventListener('mouseleave', (e) => {
            App.Tooltips.hide();
            if(el.getAttribute('data-original-title-store')) {
              el.setAttribute('title', el.getAttribute('data-original-title-store'));
              el.removeAttribute('data-original-title-store');
            }
            el.removeAttribute('data-dynamic-title'); // Clear dynamic title
          });
        });
      },
      show(element, text) {
        const tooltipEl = App.elements.tooltip;
        if(!tooltipEl || !element || !text) return;
        tooltipEl.textContent = text;
        const rect = element.getBoundingClientRect();

        tooltipEl.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipEl.offsetWidth / 2)}px`;
        tooltipEl.style.top = `${rect.bottom + window.scrollY + 8}px`; // 8px below
        tooltipEl.classList.add('visible');
      },
      hide() {
        if(App.elements.tooltip) App.elements.tooltip.classList.remove('visible');
      },
      // Special function to update tooltip text dynamically, e.g., for "Copied!" messages
      updateAndShow(element, text, duration = 2000) {
        element.setAttribute('data-dynamic-title', text); // Store new dynamic title
        App.Tooltips.show(element, text); // Show it immediately

        if(App.state.tooltipTimeout) clearTimeout(App.state.tooltipTimeout);
        App.state.tooltipTimeout = setTimeout(() => {
          App.Tooltips.hide();
          element.removeAttribute('data-dynamic-title'); // Clear dynamic after timeout
        }, duration);
      }
    },

    Display: {
      init() {
        this.getPrimaryInfo();
        this.getAdvancedDisplayInfo();
        App.elements.startRefreshRateTestBtn?.addEventListener('click', () => this.estimateRefreshRate(false));
        App.elements.loadMultiScreenBtn?.addEventListener('click', () => this.getMultiScreenDetails());
        this.estimateRefreshRate(true); // Initial quick estimate
      },
      getPrimaryInfo() {
        try {
          App.setText('currentResolution', `${screen.width} x ${screen.height}`);
          App.setText('availableResolution', `${window.innerWidth} x ${window.innerHeight}`);
          App.setText('colorDepthVal', `${screen.colorDepth} bits`);
          App.setText('pixelRatioVal', window.devicePixelRatio || 'N/A');
          if(screen.orientation) {
            App.setText('orientationVal', screen.orientation.type);
            screen.orientation.addEventListener('change', () => App.setText('orientationVal', screen.orientation.type));
          } else {
            App.handleErrorText('orientationVal', 'Orientation API N/A');
          }
        } catch (e) {
          console.error("Error in Display.getPrimaryInfo:", e);
          App.handleErrorText('currentResolution');
        }
      },
      getAdvancedDisplayInfo() {
        const touchSupport = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        App.setText('touchSupportVal', touchSupport ? `Yes (${navigator.maxTouchPoints || 'Unknown'} points)` : 'No', {
          status: touchSupport ? 'success' : 'neutral'
        });
        const checkMediaQuery = (mq, id, successMsg, failMsg, standardMsg) => {
          if(window.matchMedia) {
            let result = failMsg;
            let sClass = 'neutral';
            if(window.matchMedia(`(${mq}: high)`).matches) {
              result = `${successMsg} (High)`;
              sClass = 'success';
            } else if(window.matchMedia(`(${mq}: p3)`).matches) {
              result = `${successMsg} (Display P3)`;
              sClass = 'success';
            } else if(window.matchMedia(`(${mq}: rec2020)`).matches) {
              result = `${successMsg} (Rec.2020)`;
              sClass = 'success';
            } else if(window.matchMedia(`(${mq}: standard)`).matches || window.matchMedia(`(${mq}: srgb)`).matches) {
              result = standardMsg;
              sClass = 'neutral'
            }
            App.setText(id, result, {
              status: sClass
            });
          } else App.handleErrorText(id, 'Media Query API N/A');
        };
        checkMediaQuery('dynamic-range', 'hdrStatusVal', 'HDR Capable', 'HDR Not Detected (SDR)', 'SDR (Standard)');
        checkMediaQuery('color-gamut', 'colorGamutStatusVal', 'Wide Gamut', 'Color Gamut Undetermined', 'Likely sRGB');
      },
      estimateRefreshRate(quickEstimate = false) {
        if(App.state.isFpsEstimating && !quickEstimate) return;
        App.state.isFpsEstimating = true;
        const fpsEl = App.getEl('estimatedFpsVal'),
          btn = App.elements.startRefreshRateTestBtn;
        const visualizerCanvas = App.getEl('fpsVisualizer');
        if(visualizerCanvas && !App.state.fpsVisualizerCtx) App.state.fpsVisualizerCtx = visualizerCanvas.getContext('2d');
        App.state.fpsFrames = [];
        if(!quickEstimate) {
          if(fpsEl) fpsEl.textContent = 'Testing...';
          if(btn) btn.disabled = true;
        }
        let frameCount = 0;
        const testDuration = quickEstimate ? 350 : 2000;
        const startTime = performance.now();
        App.state.fpsLastFrameTime = startTime;
        const animate = (currentTime) => {
          frameCount++;
          const delta = currentTime - App.state.fpsLastFrameTime;
          App.state.fpsLastFrameTime = currentTime;
          if(delta <= 0) {
            requestAnimationFrame(animate);
            return;
          } // Skip if delta is zero/negative
          const currentFPS = 1000 / delta;
          if(!quickEstimate || App.state.fpsFrames.length < 50) App.state.fpsFrames.push(currentFPS);
          App.state.fpsVisualizerFrames.push(currentFPS);
          if(App.state.fpsVisualizerFrames.length > 50) App.state.fpsVisualizerFrames.shift();
          this.drawFpsVisualizer();
          if(performance.now() - startTime < testDuration) App.state.fpsRafId = requestAnimationFrame(animate);
          else {
            App.state.isFpsEstimating = false;
            const avgFps = App.state.fpsFrames.length ? App.state.fpsFrames.reduce((a, b) => Math.min(300, a) + Math.min(300, b), 0) / App.state.fpsFrames.length : 0; // Cap individual frame contributions to avoid extreme outliers biasing avg upwards
            if(fpsEl) fpsEl.textContent = `${Math.round(avgFps)} Hz (${quickEstimate ? 'Quick Est.' : 'Avg'})`;
            if(btn && !quickEstimate) btn.disabled = false;
            if(!quickEstimate) App.state.fpsFrames = []; // Reset for potential next full test
          }
        };
        if(App.state.fpsRafId) cancelAnimationFrame(App.state.fpsRafId);
        App.state.fpsRafId = requestAnimationFrame(animate);
      },
      drawFpsVisualizer() {
        const ctx = App.state.fpsVisualizerCtx;
        if(!ctx) return;
        const canvas = ctx.canvas,
          W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const barWidth = W / App.state.fpsVisualizerFrames.length;
        const maxFpsGraph = 165;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#007bff';
        App.state.fpsVisualizerFrames.forEach((val, i) => {
          const barHeight = Math.max(1, Math.min(H, ((val || 0) / maxFpsGraph) * H)); /* Ensure bar is visible */
          ctx.fillRect(i * barWidth, H - barHeight, Math.max(1, barWidth - 0.5), barHeight); // -0.5 for slight gap
        });
      },
      async getMultiScreenDetails() {
        const containerEl = App.getEl('multiScreenDetailsGrid'),
          containerWrapper = App.getEl('multiScreenDetailsContainer');
        const btn = App.elements.loadMultiScreenBtn;
        if(!containerEl || !btn || !containerWrapper) return;
        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerHTML += ' (Loading...)';
        containerWrapper.style.display = 'block';
        containerEl.innerHTML = '<div class="info-card"><p class="card-value">Querying screen details...</p></div>';

        try {
          const hasGetScreenDetails = typeof window.getScreenDetails === 'function';
          const hasWindowManagement = navigator.windowManagement && typeof navigator.windowManagement.getScreenDetails === 'function';

          if(!hasGetScreenDetails && !hasWindowManagement) {
            containerEl.innerHTML = '<div class="info-card"><p class="card-value value-warning">Screen Details API not supported.</p></div>';
            return;
          }
          const screenDetails = await (hasGetScreenDetails ? window.getScreenDetails() : navigator.windowManagement.getScreenDetails());
          const renderFn = (details) => {
            containerEl.innerHTML = ''; // Clear
            if(!details.screens || details.screens.length === 0) {
              containerEl.innerHTML = '<div class="info-card"><p class="card-value">No extended screen information available.</p></div>';
              return;
            }
            details.screens.forEach((s, i) => {
              const card = document.createElement('div');
              card.className = 'info-card';
              card.innerHTML = `
                            <div class="card-label">Screen ${i + 1} ${s.isPrimary ? '<strong class="value-success">(Primary)</strong>' : ''} ${s.isInternal ? '(Internal)' : '(External)'}</div>
                            <p><strong>Label:</strong> <span class="card-value code-text">${s.label || (s.id ? `ID: ${s.id.slice(0,20)}...` : 'N/A')}</span></p>
                            <p><strong>Resolution:</strong> <span class="card-value">${s.width}x${s.height} @ ${s.colorDepth || screen.colorDepth} bit</span></p>
                            <p><strong>Available Area:</strong> <span class="card-value">${s.availWidth}x${s.availHeight}</span></p>
                            <p><strong>Pixel Ratio:</strong> <span class="card-value">${s.devicePixelRatio || window.devicePixelRatio}</span></p>
                            <p><strong>Orientation:</strong> <span class="card-value">${s.orientation ? s.orientation.type : 'N/A'}</span></p>`;
              containerEl.appendChild(card);
            });
            const primary = details.screens.find(s => s.isPrimary);
            if(primary) App.setText('currentResolution', `${primary.width}x${primary.height} (from Screen Details)`);
          };
          renderFn(screenDetails);
          screenDetails.addEventListener('screenschange', (event) => {
            console.log('screenschange event:', event);
            renderFn(screenDetails)
          });
        } catch (e) {
          console.error("Multi-screen error:", e);
          containerEl.innerHTML = `<div class="info-card"><p class="card-value value-error">Error: ${e.message}. Ensure permission is granted.</p></div>`;
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalBtnText;
        }
      }
    }, // End Display Module

    SystemOS: {
      init() {
        this.getOSInfo();
        this.getBatteryInfo();
      },
      getOSInfo() {
        try {
          App.setText('osPlatformVal', navigator.platform || 'N/A');
          App.setText('userAgentFullVal', navigator.userAgent || 'N/A', {
            isCode: true
          });
          if(navigator.userAgentData) {
            const uad = navigator.userAgentData;
            App.setText('osUadPlatformVal', uad.platform || 'N/A');
            App.setText('osUadArchVal', uad.architecture || 'N/A');
            let osVer = uad.platformVersion || "";
            if(uad.platform === "Windows" && osVer) {
              const build = parseInt((osVer.match(/\.([0-9]+)$/) || [])[1] || (osVer.split('.')[2])); // Try to get build after second dot, or third part.
              let winName = "Windows";
              if(build >= 22000) winName = "Windows 11 Family";
              else if(build >= 10240) winName = "Windows 10 Family";
              osVer = `${osVer} (${winName})`;
            }
            App.setText('osUadVersionVal', osVer || uad.platformVersion || "N/A", {
              isCode: true
            });
          } else {
            ['osUadPlatformVal', 'osUadVersionVal', 'osUadArchVal'].forEach(id => App.handleErrorText(id, 'UserAgentData API N/A'));
          }
          const ua = navigator.userAgent.toLowerCase();
          let consoleHint = 'Not Detected';
          if(ua.includes('playstation 5') || ua.includes('ps5')) consoleHint = 'PlayStation 5';
          else if(ua.includes('playstation 4') || ua.includes('ps4')) consoleHint = 'PlayStation 4';
          else if(ua.includes('xbox series x') || ua.includes('xbox series s') || (ua.includes('xbox') && ua.includes('edgex'))) consoleHint = 'Xbox Series X/S'; // Edgex is common on newer Xbox
          else if(ua.includes('xbox one') || (ua.includes('xbox') && !ua.includes('edgex'))) consoleHint = 'Xbox One'; // Older Xbox UAs are simpler
          else if(ua.includes('nintendo switch') || ua.includes('nintendobrowser')) consoleHint = 'Nintendo Switch';

          App.setText('gameConsoleHintVal', consoleHint, {
            status: consoleHint !== 'Not Detected' ? 'warning' : 'neutral'
          });
        } catch (e) {
          console.error("OS Info Error:", e);
        }
      },
      async getBatteryInfo() {
        const statusElId = 'batteryStatusVal',
          barContainer = App.getEl('batteryLevelBarContainer'),
          bar = App.getEl('batteryLevelBar');
        if(!('getBattery' in navigator)) {
          App.setText(statusElId, 'Battery API N/A', {
            status: 'warning'
          });
          if(barContainer) barContainer.style.display = 'none';
          return;
        }
        try {
          const battery = await navigator.getBattery();
          const msToMinSec = (ms) => { // Helper for time conversion
            if(!isFinite(ms) || ms === 0) return '?';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m ${seconds}s`;
          }
          const updateFn = () => {
            let text = `${(battery.level * 100).toFixed(0)}%`;
            if(battery.charging) {
              text += ` (Charging${battery.chargingTime !== Infinity && battery.chargingTime > 0 ? ', ' + msToMinSec(battery.chargingTime * 1000) + ' to full' : ''})`;
            } else {
              text += ` (Discharging${battery.dischargingTime !== Infinity && battery.dischargingTime > 0 ? ', ' + msToMinSec(battery.dischargingTime * 1000) + ' left' : ''})`;
            }
            if(barContainer && bar) {
              barContainer.style.display = 'block';
              bar.style.width = `${battery.level * 100}%`;
              bar.style.backgroundColor = (battery.level <= 0.1 && !battery.charging) ? 'var(--error-color)' : (battery.level <= 0.2 && !battery.charging) ? 'var(--warning-color)' : 'var(--success-color)';
            }
            App.setText(statusElId, text, {
              status: battery.level <= 0.2 && !battery.charging ? 'error' : 'neutral'
            });
          };

          updateFn();
          ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach(ev => battery.addEventListener(ev, updateFn));
        } catch (e) {
          console.error("Battery API Error:", e);
          App.setText(statusElId, 'Error accessing Battery API', {
            status: 'error'
          });
          if(barContainer) barContainer.style.display = 'none';
        }
      }
    }, // End SystemOS Module

    Hardware: {
      init() {
        App.setText('cpuCoresVal', navigator.hardwareConcurrency || 'N/A');
        App.setText('deviceMemoryVal', navigator.deviceMemory ? `${navigator.deviceMemory} GB (Minimum Reported)` : 'Device Memory API N/A');
        this.getWebGLContextAndInfo();
        this.checkEMEHDCP();
        App.elements.loadWebGLExtensionsBtn?.addEventListener('click', () => this.listWebGLExtensions());
      },
      getWebGLContextAndInfo() {
        const canvas = document.createElement('canvas');
        try {
          App.state.webGlContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {}
        const gl = App.state.webGlContext;
        if(gl) {
          App.setText('webglVersionVal', gl.getParameter(gl.VERSION).match(/WebGL (\d\.\d)/)?.[1] || '1.0 (Fallback)', {
            isCode: true
          });
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if(debugInfo) {
            App.setText('gpuRendererVal', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A', {
              isCode: true
            });
            const angle = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            App.setText('webglAngleVal', angle && angle.toLowerCase().includes('angle') ? angle : 'N/A or Not ANGLE', {
              isCode: true
            });
          } else {
            App.handleErrorText('gpuRendererVal', 'Debug Info N/A');
            App.setText('webglAngleVal', 'N/A', {
              isCode: true
            });
          }
        } else {
          ['webglVersionVal', 'gpuRendererVal', 'webglAngleVal'].forEach(id => App.handleErrorText(id, 'WebGL N/A'));
        }
      },
      listWebGLExtensions() {
        const gl = App.state.webGlContext;
        const listElId = 'webGlExtensionsList';
        if(gl) {
          const extensions = gl.getSupportedExtensions();
          if(extensions && extensions.length > 0) {
            App.setText(listElId, extensions.join('\n'), {
              isCode: true
            });
          } else {
            App.setText(listElId, 'No extensions reported or WebGL not available.', {
              isCode: true
            });
          }
        } else {
          App.setText(listElId, 'WebGL context not available to query extensions.', {
            isCode: true,
            status: 'warning'
          });
        }
      },
      async checkEMEHDCP() {
        if(!navigator.requestMediaKeySystemAccess) {
          App.handleErrorText('emeHdcpStatusVal', 'EME API N/A');
          return;
        }
        const config = [{
          videoCapabilities: [{
            contentType: 'video/mp4; codecs="avc1.42E01E"',
            hdcp: 'required'
          }]
        }];
        try {
          await navigator.requestMediaKeySystemAccess('com.widevine.alpha', config);
          App.setText('emeHdcpStatusVal', 'Widevine + HDCP "required" Policy Supported', {
            status: 'success'
          });
        } catch (e) {
          App.setText('emeHdcpStatusVal', 'Widevine HDCP "required" Policy Test Failed/Unsupported', {
            status: 'warning'
          });
          console.warn("EME Test Error (HDCP 'required'):", e);
        }
      }
    }, // End Hardware Module

    Media: {
      init() {
        App.elements.loadAudioDevicesBtn?.addEventListener('click', () => this.getAudioDevices());
        App.elements.checkVideoCodecsBtn?.addEventListener('click', () => this.checkAllVideoCodecs());
        App.elements.checkAudioCodecsBtn?.addEventListener('click', () => this.checkAllAudioCodecs());
        App.elements.checkDrmBtn?.addEventListener('click', () => this.checkDRMSupport());
      },
      async getAudioDevices() {
        const listId = 'audioDevicesList';
        App.getEl(listId).innerHTML = '<div class="list-item">Querying... (May require mic permission for full list)</div>';
        if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          App.setHTMLList(listId, [], 'list-item value-warning', 'MediaDevices API N/A');
          return;
        }
        try {
          // Attempt to get user media to ensure labels are populated, if permission hasn't been granted before
          await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        } catch (e) {
          console.warn("Microphone permission potentially needed for full audio device labels. Error:", e.name);
        }
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputs = devices.filter(d => d.kind === 'audiooutput').map(d => `<strong>${d.label || `Output Device (ID: ${d.deviceId.slice(0,10)}...)`}</strong> ${d.deviceId === 'default' ? '(Default)' : ''}`);
          App.setHTMLList(listId, outputs, 'list-item', 'No audio output devices identified or permission denied.');
        } catch (e) {
          App.setHTMLList(listId, [], 'list-item value-error', `Error enumerating audio devices: ${e.message}`);
        }
      },
      async _checkCodec(config, name, containerId, type = 'decoding') {
        const container = App.getEl(containerId);
        if(!container) return;
        const itemId = `${name.replace(/[\s().;/="]/g,'')}_status_item`; // Sanitize name for ID
        let itemEl = container.querySelector(`#${itemId}`);
        if(!itemEl) {
          itemEl = document.createElement('div');
          itemEl.className = 'list-item';
          itemEl.id = itemId;
          container.appendChild(itemEl);
        }
        itemEl.innerHTML = `Checking ${name}...`;

        if(!('mediaCapabilities' in navigator) || !navigator.mediaCapabilities[`${type}Info`]) {
          itemEl.innerHTML = `<strong class="value-warning">${name}:</strong> MediaCapabilities API N/A`;
          return;
        }
        try {
          const capConfig = type === 'video' ? {
            type: 'file',
            video: config
          } : {
            type: 'file',
            audio: config
          };
          const res = await navigator.mediaCapabilities[`${type}Info`](capConfig);
          let text = res.supported ? `Supported (Smooth: ${res.smooth}, Power Efficient: ${res.powerEfficient})` : 'Not Supported';
          let stat = res.supported ? 'success' : 'error';
          itemEl.innerHTML = `<strong class="value-${stat}">${name}:</strong> ${text}<br/><code>${config.contentType}</code>`;
        } catch (e) {
          itemEl.innerHTML = `<strong class="value-error">${name}: Error (${e.name})</strong><br/><code>${config.contentType}</code>`;
          console.warn(`Codec check error for ${name}:`, e);
        }
      },
      async checkAllVideoCodecs() {
        const listId = 'videoCodecsSupportList';
        App.getEl(listId).innerHTML = ''; // Clear first
        const commonCodecs = [{
          name: 'H.264 (AVC) Baseline',
          config: {
            contentType: 'video/mp4; codecs="avc1.42E01E"'
          }
        }, {
          name: 'H.265 (HEVC) Main',
          config: {
            contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"'
          }
        }, {
          name: 'VP9 Profile 0',
          config: {
            contentType: 'video/webm; codecs="vp09.00.10.08"'
          }
        }, {
          name: 'AV1 Main Profile',
          config: {
            contentType: 'video/mp4; codecs="av01.0.04M.08"'
          }
        }, ];
        commonCodecs.forEach(c => this._checkCodec(c.config, c.name, listId, 'video'));
      },
      async checkAllAudioCodecs() {
        const listId = 'audioCodecsSupportList';
        App.getEl(listId).innerHTML = '';
        const commonCodecs = [{
          name: 'AAC-LC',
          config: {
            contentType: 'audio/mp4; codecs="mp4a.40.2"'
          }
        }, {
          name: 'Opus',
          config: {
            contentType: 'audio/webm; codecs="opus"'
          }
        }, {
          name: 'FLAC',
          config: {
            contentType: 'audio/flac'
          }
        }, {
          name: 'MP3',
          config: {
            contentType: 'audio/mpeg'
          }
        }, ];
        commonCodecs.forEach(c => this._checkCodec(c.config, c.name, listId, 'audio'));
      },
      async checkDRMSupport() {
        const listId = 'drmSupportList';
        App.getEl(listId).innerHTML = '<div class="list-item">Checking...</div>';
        if(!navigator.requestMediaKeySystemAccess) {
          App.setHTMLList(listId, [], 'list-item value-warning', 'MediaKeySystemAccess API N/A');
          return;
        }
        const systems = [{
          name: 'Widevine',
          id: 'com.widevine.alpha'
        }, {
          name: 'PlayReady',
          id: 'com.microsoft.playready'
        }, {
          name: 'FairPlay',
          id: 'com.apple.fps' // Generic FairPlay, specific versions might differ
        }, {
          name: 'Clear Key',
          id: 'org.w3.clearkey'
        }, ];
        let results = [];
        for(const s of systems) {
          try {
            await navigator.requestMediaKeySystemAccess(s.id, [{
              videoCapabilities: [{
                contentType: 'video/mp4; codecs="avc1.4D401E"'
              }]
            }]);
            results.push(`<strong class="value-success">${s.name}:</strong> Supported`);
          } catch (e) {
            results.push(`<strong>${s.name}:</strong> Not Supported/Error`);
          }
        }
        App.setHTMLList(listId, results, 'list-item');
      }
    }, // End Media Module

    Connectivity: {
      init() {
        this.updateStatus();
        if(navigator.connection) navigator.connection.addEventListener('change', () => this.updateStatus());
        window.addEventListener('online', () => this.updateStatus(true));
        window.addEventListener('offline', () => this.updateStatus(false));
        App.elements.startSpeedTestBtn?.addEventListener('click', () => this.startSpeedTest());
      },
      updateStatus(onlineState = null) {
        const isOnline = onlineState !== null ? onlineState : navigator.onLine;
        App.setText('onlineStatusVal', isOnline ? 'Online' : 'Offline', {
          status: isOnline ? 'success' : 'error'
        });
        if(navigator.connection) {
          App.setText('connectionTypeVal', navigator.connection.effectiveType || 'N/A');
          App.setText('connectionDownlinkVal', navigator.connection.downlink ? `${navigator.connection.downlink} Mbps (Effective)` : 'N/A');
          App.setText('connectionRttVal', navigator.connection.rtt !== undefined ? `${navigator.connection.rtt} ms (Effective)` : 'N/A');
          App.setText('connectionSaveDataVal', navigator.connection.saveData ? 'Enabled' : 'Disabled', {
            status: navigator.connection.saveData ? 'warning' : 'neutral'
          });
        } else {
          ['connectionTypeVal', 'connectionDownlinkVal', 'connectionRttVal', 'connectionSaveDataVal'].forEach(id => App.handleErrorText(id, 'Net Info API N/A'));
        }
      },
      async startSpeedTest() {
        const resultId = 'speedTestResultVal',
          progContainer = App.getEl('speedTestProgressContainer'),
          progBar = App.getEl('speedTestProgressBar'),
          btn = App.elements.startSpeedTestBtn;
        if(!App.getEl(resultId) || !btn) return;
        App.setText(resultId, 'Testing...');
        btn.disabled = true;
        if(progContainer) progContainer.style.display = 'block';
        if(progBar) progBar.style.width = '0%';

        // Public CDN file - ~5MB. Using a different one to potentially avoid too-aggressive caching.
        const testFile = `https://cachefly.cachefly.net/10mb.test?rand=${Date.now()}`; // Cachefly provides test files
        const fileSizeMB = 10; // Approximate size of the file in MB for progress
        let receivedLength = 0;
        const contentLength = fileSizeMB * 1024 * 1024; // Expected bytes

        try {
          const startTime = performance.now();
          const response = await fetch(testFile, {
            method: 'GET',
            cache: 'no-store',
            mode: 'cors'
          });
          if(!response.ok) throw new Error(`HTTP Error: ${response.status}`);

          const reader = response.body.getReader();
          // const actualContentLength = response.headers.get('Content-Length') ? parseInt(response.headers.get('Content-Length')) : contentLength;

          while(true) {
            const {
              done,
              value
            } = await reader.read();
            if(done) break;
            receivedLength += value.length;
            if(progBar) progBar.style.width = `${Math.min(100,(receivedLength/contentLength)*100)}%`;
          }
          const durationSecs = (performance.now() - startTime) / 1000;
          const speedMbps = ((receivedLength / (1024 * 1024)) * 8) / durationSecs;
          App.setText(resultId, `${speedMbps.toFixed(2)} Mbps`);
          if(progBar) progBar.style.width = `100%`; // Ensure it hits 100% on completion
        } catch (e) {
          console.error("Speedtest Error:", e);
          App.setText(resultId, `Error (${e.message.slice(0,30)}...)`, {
            status: 'error'
          });
        } finally {
          btn.disabled = false;
          setTimeout(() => { // Hide progress bar after a short delay
            if(progContainer) progContainer.style.display = 'none';
            if(progBar) progBar.style.width = '0%';
          }, 1500);
        }
      }
    }, // End Connectivity Module

    Browser: {
      init() {
        this.getDetails();
        // this.getStorageInfo(); // Storage API info is often not useful / restricted. Can be re-enabled if desired.
      },
      getDetails() {
        if(navigator.userAgentData) {
          const uad = navigator.userAgentData;
          const primaryBrand = uad.brands.find(b => !b.brand.toLowerCase().includes("not") && !b.brand.toLowerCase().includes("chromium") && !b.brand.toLowerCase().includes("brand")) || uad.brands[0];
          App.setText('browserNameVersionUadVal', primaryBrand ? `${primaryBrand.brand} ${primaryBrand.version}` : "N/A (UAD)");
          App.setText('browserBrandsUadVal', uad.brands.map(b => `${b.brand} ${b.version}`).join(';\n ') || "N/A", {
            isCode: true
          });
          App.setText('browserMobileUadVal', uad.mobile ? 'Yes' : 'No', {
            status: uad.mobile ? 'success' : 'neutral'
          });
        } else {
          ['browserNameVersionUadVal', 'browserBrandsUadVal', 'browserMobileUadVal'].forEach(id => App.handleErrorText(id, 'UAD API N/A'));
          // Fallback to UserAgent string parsing if UAD is not available
          const ua = navigator.userAgent;
          let browserName = "Unknown";
          let browserVersion = "Unknown";
          // Basic UA parsing (can be expanded)
          if(ua.includes("Firefox/")) {
            browserName = "Firefox";
            browserVersion = ua.split("Firefox/")[1].split(" ")[0];
          } else if(ua.includes("Chrome/") && !ua.includes("Edg/")) {
            browserName = "Chrome";
            browserVersion = ua.split("Chrome/")[1].split(" ")[0];
          } else if(ua.includes("Edg/")) {
            browserName = "Edge";
            browserVersion = ua.split("Edg/")[1].split(" ")[0];
          } else if(ua.includes("Safari/") && !ua.includes("Chrome/")) {
            browserName = "Safari";
            browserVersion = ua.split("Version/")[1] ? ua.split("Version/")[1].split(" ")[0] : "Unknown";
          }
          App.setText('browserNameVersionUadVal', `${browserName} ${browserVersion} (UA Fallback)`);
        }
        App.setText('browserLanguagesVal', navigator.languages ? navigator.languages.join(', ') : navigator.language, {
          isCode: true
        });
        App.checkAPISupport(navigator.cookieEnabled, 'cookiesEnabledVal', 'Cookies');
      },
      async getStorageInfo() { // Optional, can be re-enabled in init()
        if(navigator.storage && navigator.storage.estimate) {
          try {
            const est = await navigator.storage.estimate();
            App.setText('storageQuotaVal', est.quota ? `${(est.quota/(1024*1024)).toFixed(2)} MB Total` : 'N/A');
            App.setText('storageUsageVal', est.usage ? `${(est.usage/(1024*1024)).toFixed(2)} MB Used` : 'N/A');
          } catch (e) {
            ['storageQuotaVal', 'storageUsageVal'].forEach(id => App.handleErrorText(id, 'Error accessing Storage API'));
          }
        } else {
          ['storageQuotaVal', 'storageUsageVal'].forEach(id => App.handleErrorText(id, 'Storage API N/A'));
        }
      }
    }, // End Browser Module

    Performance: {
      init() {
        try {
          if(window.performance) {
            const timing = window.performance.timing;
            const navigation = window.performance.getEntriesByType("navigation")[0]; // Use modern Perf API

            if(navigation) {
              App.setText('perfNavTypeVal', {
                'navigate': 'Navigation',
                'reload': 'Reload',
                'back_forward': 'History',
                'prerender': 'Prerender'
              } [navigation.type] || navigation.type || 'Unknown');

              const calcTime = (val) => (val > 0) ? `${val.toFixed(0)} ms` : 'N/A';

              App.setText('perfLoadTimeVal', calcTime(navigation.loadEventEnd));
              App.setText('perfTtfbVal', calcTime(navigation.responseStart)); // TTFB is usually just responseStart from navigationStart (which is 0 in this relative context)
              App.setText('perfDomInteractiveVal', calcTime(navigation.domInteractive));
              App.setText('perfDomLoadedVal', calcTime(navigation.domContentLoadedEventEnd));
            } else if(timing) { // Fallback for older browsers
              App.setText('perfNavTypeVal', {
                0: 'Navigation',
                1: 'Reload Scipt',
                2: 'History',
                255: 'Other Scipt'
              } [window.performance.navigation.type] || 'Unknown (Legacy)');
              const calcLegacyTime = (end, start) => (end > 0 && start > 0 && end > start) ? (end - start) + ' ms' : 'N/A';
              App.setText('perfLoadTimeVal', calcLegacyTime(timing.loadEventEnd, timing.navigationStart));
              App.setText('perfTtfbVal', calcLegacyTime(timing.responseStart, timing.navigationStart));
              App.setText('perfDomInteractiveVal', calcLegacyTime(timing.domInteractive, timing.navigationStart));
              App.setText('perfDomLoadedVal', calcLegacyTime(timing.domContentLoadedEventEnd, timing.navigationStart));
            } else {
              ['perfNavTypeVal', 'perfLoadTimeVal', 'perfTtfbVal', 'perfDomInteractiveVal', 'perfDomLoadedVal'].forEach(id => App.handleErrorText(id, 'Perf Navigation API N/A'));
            }

            if(window.performance.memory) {
              const m = window.performance.memory,
                MB = (b) => (b / (1024 * 1024)).toFixed(2);
              App.setText('perfJsHeapLimitVal', `${MB(m.jsHeapSizeLimit)}`);
              App.setText('perfJsHeapTotalVal', `${MB(m.totalJSHeapSize)}`);
              App.setText('perfJsHeapUsedVal', `${MB(m.usedJSHeapSize)}`);
            } else {
              ['perfJsHeapLimitVal', 'perfJsHeapTotalVal', 'perfJsHeapUsedVal'].forEach(id => App.handleErrorText(id, 'Perf Memory API N/A'));
            }
          } else {
            ['perfNavTypeVal', 'perfLoadTimeVal', 'perfTtfbVal', 'perfDomInteractiveVal', 'perfDomLoadedVal', 'perfJsHeapLimitVal', 'perfJsHeapTotalVal', 'perfJsHeapUsedVal'].forEach(id => App.handleErrorText(id, 'Performance API N/A'));
          }
        } catch (e) {
          console.error("Performance Metrics Error: ", e);
          // Handle partial errors if some metrics are available but others fail
        }
      }
    }, // End Performance Module

    AdvancedAPIs: {
      init() {
        App.checkAPISupport(typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function', 'wasmSupportVal', 'WebAssembly');
        App.checkAPISupport('serviceWorker'in navigator, 'serviceWorkerSupportVal', 'Service Workers');
        App.checkAPISupport('geolocation'in navigator, 'geolocationApiVal', 'Geolocation API', false);
        App.checkAPISupport('PresentationRequest'in window, 'presentationApiVal', 'Presentation API');
        App.checkAPISupport(typeof navigator.xr !== 'undefined' && typeof navigator.xr.isSessionSupported === 'function', 'webXrApiVal', 'WebXR (VR/AR)');
        App.checkAPISupport(typeof navigator.getGamepads === 'function' || 'ongamepadconnected'in window, 'gamepadApiVal', 'Gamepad API');
        App.checkAPISupport(typeof navigator.keyboard !== 'undefined' && 'getLayoutMap'in navigator.keyboard, 'keyboardApiVal', 'Keyboard Layout API');
        App.checkAPISupport('share'in navigator && typeof navigator.share === 'function', 'webShareApiVal', 'Web Share API');
        App.checkAPISupport('getInstalledRelatedApps'in navigator, 'relatedAppsApiVal', 'Installed Related Apps API');
        App.checkAPISupport('IdleDetector'in window, 'idleDetectionApiVal', 'Idle Detection API');
        App.checkAPISupport(navigator.virtualKeyboard && typeof navigator.virtualKeyboard.show === 'function', 'virtualKeyboardApiVal', 'Virtual Keyboard API');
        App.checkAPISupport('contentIndex'in navigator || ('serviceWorker'in navigator && 'ContentIndex'in window), 'contentIndexingApiVal', 'Content Indexing API');

        this.checkFontAccessAPI();
        App.elements.loadLocalFontsBtn?.addEventListener('click', () => this.listLocalFonts());
      },
      checkFontAccessAPI() {
        const statusId = 'fontAccessApiStatusVal';
        if('fonts'in navigator && typeof navigator.fonts.query === 'function') {
          App.setText(statusId, 'Supported (navigator.fonts.query)', {
            status: 'success'
          });
        } else if('queryLocalFonts'in window) {
          App.setText(statusId, 'Supported (window.queryLocalFonts - Legacy)', {
            status: 'success'
          });
        } else {
          App.setText(statusId, 'Not Supported by this browser.', {
            status: 'warning'
          });
        }
      },
      async listLocalFonts() {
        const listContainerId = 'localFontsListContainer';
        const listEl = App.getEl(listContainerId);
        const statusEl = App.getEl('fontAccessApiStatusVal');
        if(!listEl || !statusEl) return;

        listEl.style.display = 'block';
        App.setHTMLList(listContainerId, [], 'list-item', 'Querying local fonts (requires permission)...');
        this.checkFontAccessAPI(); // Update status display just in case

        try {
          let availableFonts = null;
          if('fonts'in navigator && typeof navigator.fonts.query === 'function') {
            availableFonts = await navigator.fonts.query();
          } else if('queryLocalFonts'in window) {
            availableFonts = await window.queryLocalFonts();
          } else {
            App.setHTMLList(listContainerId, [], 'list-item value-warning', 'No Font Access API method found.');
            return;
          }

          if(availableFonts && availableFonts.length > 0) {
            const fontNames = availableFonts.map(fontData =>
              `<strong>${fontData.family}</strong> (${fontData.fullName || 'N/A'}) - Style: ${fontData.style || 'N/A'}, Weight: ${fontData.weight || 'N/A'}`
            );
            App.setHTMLList(listContainerId, fontNames, 'list-item');
          } else {
            App.setHTMLList(listContainerId, [], 'list-item', 'No local fonts reported or permission denied/revoked.');
          }
        } catch (err) {
          console.error("Font Access API error:", err);
          let errorMsg = `Error: ${err.name}`;
          if(err.name === 'SecurityError') errorMsg += ' - Permission likely denied or feature disabled by policy.';
          else if(err.name === 'NotAllowedError') errorMsg += ' - Permission explicitly denied by user.';
          else errorMsg += ` - ${err.message}`;
          App.setHTMLList(listContainerId, [], 'list-item value-error', errorMsg);
        }
      }
    }, // End AdvancedAPIs Module

    Reporting: {
      async copyReport() {
        let report = `Inspector Pro X - Diagnostic Report\nGenerated: ${new Date().toLocaleString()}\n`;
        report += "============================================\n\n";

        const contentPanels = document.querySelectorAll('.content-panel');
        contentPanels.forEach(panel => {
          const panelId = panel.id.replace('-panel', '');
          const navLink = document.querySelector(`.nav-link[data-target="${panel.id}"] .link-text`);
          report += `--- ${(navLink ? navLink.textContent.trim() : panelId.toUpperCase())} SECTION ---\n`;

          panel.querySelectorAll('.info-card').forEach(card => {
            const labelEl = card.querySelector('.card-label');
            const valueEl = card.querySelector('.card-value');
            const descEl = card.querySelector('.card-description');

            let cardReport = `  ${labelEl ? labelEl.textContent.trim() : 'Info:'}:`;
            if(valueEl && valueEl.textContent.trim() !== '-') {
                // For multi-line code-text, ensure it's formatted reasonably
                if (valueEl.classList.contains('code-text')) {
                    cardReport += `\n    ${valueEl.textContent.trim().split('\n').map(line => line.trim()).join('\n    ')}`;
                } else {
                    cardReport += ` ${valueEl.textContent.trim()}`;
                }
            }

            if(descEl && descEl.textContent.trim()) cardReport += `\n    (${descEl.textContent.trim().replace(/\s\s+/g, ' ')})`;
            report += cardReport + '\n';

            const listContainer = card.querySelector('.list-display-container');
            if(listContainer && listContainer.style.display !== 'none') {
              listContainer.querySelectorAll('.list-item').forEach(item => {
                // Clean up HTML tags (like <strong>) from list items for plain text report
                let itemText = item.innerHTML.replace(/<[^>]*>/g, " ").replace(/\s\s+/g, ' ').trim();
                if(itemText && itemText.toLowerCase() !== 'click to enumerate.' && itemText.toLowerCase() !== 'click to test.' && itemText.toLowerCase() !== 'click to enumerate' && itemText.toLowerCase() !== 'querying...' && !itemText.toLowerCase().includes('querying local fonts')) {
                     report += `    - ${itemText}\n`;
                }
              });
            }
            // Special handling for webgl extensions list which is directly in a card-value.code-text
            if (card.querySelector('#webGlExtensionsList') && card.querySelector('#webGlExtensionsList').textContent.trim() !== 'Click "Load Extensions" to query.') {
                const extensionsText = card.querySelector('#webGlExtensionsList').textContent.trim();
                if (extensionsText) {
                    report += `    Extensions:\n    ${extensionsText.split('\n').map(line => `  ${line.trim()}`).join('\n    ')}\n`;
                }
            }
             // Special handling for font list
             if (card.querySelector('#localFontsListContainer') && card.querySelector('#localFontsListContainer').style.display !== 'none') {
                const fontItems = card.querySelectorAll('#localFontsListContainer .list-item');
                let fontsFound = false;
                fontItems.forEach(item => {
                    let itemText = item.innerHTML.replace(/<[^>]*>/g, " ").replace(/\s\s+/g, ' ').trim();
                    if(itemText && !itemText.toLowerCase().includes('querying') && !itemText.toLowerCase().includes('no font access api') && !itemText.toLowerCase().includes('no local fonts reported')) {
                        if (!fontsFound) {
                            report += `    Available Fonts:\n`;
                            fontsFound = true;
                        }
                        report += `      - ${itemText}\n`;
                    }
                });
            }


          });
          report += "\n";
        });
        report += "============================================\n";
        report += "/!\\ Accuracy based on Browser APIs. Hardware direct-access is NOT possible.\n";

        try {
          await navigator.clipboard.writeText(report);
          App.Tooltips.updateAndShow(App.elements.copyReportBtn, "Report Copied!");
        } catch (e) {
          console.error('Failed to copy:', e);
          App.Tooltips.updateAndShow(App.elements.copyReportBtn, "Copy Failed! (See Console)");
          console.log("--- REPORT --- \n", report); // Log to console as fallback
        }
      }
    } // End Reporting Module

  }; // End App Object

  App.init(); // Initialize the application
});
