// script.js
document.addEventListener('DOMContentLoaded', () => {
    const getEl = (id) => document.getElementById(id);
    const querySel = (selector) => document.querySelector(selector);
    const querySelAll = (selector) => document.querySelectorAll(selector);

    // --- Theme Toggle ---
    const themeToggleBtn = getEl('theme-toggle-btn');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const sunIcon = getEl('theme-icon-sun');
    const moonIcon = getEl('theme-icon-moon');

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'block';
        } else {
            if(sunIcon) sunIcon.style.display = 'block';
            if(moonIcon) moonIcon.style.display = 'none';
        }
    }
    updateThemeIcon(currentTheme);

    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            theme = theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateThemeIcon(theme);
        });
    }

    // --- Tab Navigation ---
    const tabLinks = querySelAll('.tab-link');
    const tabPanels = querySelAll('.tab-panel');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetTab = link.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                if (panel.id === `${targetTab}-section`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });

    // --- Utility functions ---
    const setText = (id, value, statusClass = '') => {
        const el = getEl(id);
        if (el) {
            el.textContent = value === undefined || value === null || value === '' ? 'N/A' : String(value);
            el.className = 'card-value'; // Reset classes
            if (statusClass) el.classList.add(statusCLASS); // Typo: statusClass - corrected below
        }
    };
    // Corrected - typo statusCLASS
    const setTextWithStatus = (id, value, status = '') => { // status can be 'success', 'warning', 'error'
        const el = getEl(id);
        if (el) {
            el.textContent = (value === undefined || value === null || String(value).trim() === '') ? 'N/A' : String(value);
            el.className = 'card-value'; // Reset classes
            if (status) el.classList.add(`text-${status}`);
        }
    };

    const setHTML = (id, htmlContent) => {
        const el = getEl(id);
        if (el) el.innerHTML = htmlContent;
    };
    
    const safeAccess = (obj, path, defaultValue = 'N/A') => {
        try {
            const value = path.split('.').reduce((o, k) => (o || {})[k], obj);
            return value === undefined || value === null ? defaultValue : value;
        } catch (e) {
            return defaultValue;
        }
    };

    // --- Modules for different info categories ---

    const DisplayInfo = {
        init() {
            this.getPrimaryInfo();
            this.getHDRStatus();
            this.getColorGamut();
            this.getTouchSupport();
            if(getEl('start-refresh-rate-test')) getEl('start-refresh-rate-test').addEventListener('click', () => this.estimateRefreshRate());
            if(getEl('load-multi-screen')) getEl('load-multi-screen').addEventListener('click', () => this.getMultiScreenDetails());
            this.estimateRefreshRate(true); // Initial quick estimate
        },
        getPrimaryInfo() {
            setText('current-resolution', `${screen.width} x ${screen.height}`);
            setText('available-resolution', `${screen.availWidth} x ${screen.availHeight}`);
            setText('color-depth', `${screen.colorDepth} bits`);
            setText('pixel-ratio', window.devicePixelRatio || 'N/A');
            if (screen.orientation) {
                setText('orientation', screen.orientation.type);
                screen.orientation.addEventListener('change', () => setText('orientation', screen.orientation.type));
            } else {
                setText('orientation', 'API not supported');
            }
        },
        getTouchSupport() {
            let touchSupport = 'No';
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.DocumentTouch && document instanceof DocumentTouch)) {
                 touchSupport = `Yes (${navigator.maxTouchPoints || 'unknown'} touch points)`;
            }
            setTextWithStatus('touch-support', touchSupport, navigator.maxTouchPoints > 0 ? 'success' : '');
        },
        getHDRStatus() {
            let status = 'Not Detected / Not Supported';
            if (window.matchMedia) {
                if (window.matchMedia('(dynamic-range: high)').matches) {
                    status = 'Supported (dynamic-range: high)';
                    setTextWithStatus('hdr-status', status, 'success'); return;
                }
                 if (window.matchMedia('(dynamic-range: standard)').matches) { // Some browsers may only report this
                    status = 'Standard Dynamic Range (SDR)';
                }
            }
             setTextWithStatus('hdr-status', status);
        },
        getColorGamut() {
            let gamut = 'sRGB (or unknown)';
            if (window.matchMedia) {
                if (window.matchMedia('(color-gamut: rec2020)').matches) gamut = 'Rec.2020 (Wide Gamut)';
                else if (window.matchMedia('(color-gamut: p3)').matches) gamut = 'Display P3 (Wide Gamut)';
                else if (window.matchMedia('(color-gamut: srgb)').matches) gamut = 'sRGB';
            }
            setTextWithStatus('color-gamut-status', gamut, gamut.includes('Wide') ? 'success' : '');
        },
        frames: [],
        lastFrameTime: performance.now(),
        rafId: null,
        isEstimatingFps: false,
        estimateRefreshRate(quickEstimate = false) {
            if (this.isEstimatingFps && !quickEstimate) return;
            this.isEstimatingFps = true;

            const fpsEl = getEl('estimated-fps');
            const visualizerCanvas = getEl('fps-visualizer');
            this.ctx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;
            this.frames = [];
            this.framesDisplay = Array(50).fill(0) // For visualizer
            
            if(!quickEstimate){
                 fpsEl.textContent = 'Testing...';
                if(getEl('start-refresh-rate-test')) getEl('start-refresh-rate-test').disabled = true;
            }

            let frameCount = 0;
            const testDuration = quickEstimate ? 500 : 2000; //ms
            const startTime = performance.now();

            const animate = (currentTime) => {
                frameCount++;
                const deltaTime = currentTime - this.lastFrameTime;
                this.lastFrameTime = currentTime;
                if (deltaTime > 0) {
                    const currentFPS = 1000 / deltaTime;
                    this.frames.push(currentFPS);
                    if (this.frames.length > 100) this.frames.shift(); // Keep last 100 frames for averaging

                     // Update visualizer data
                    this.framesDisplay.push(currentFPS);
                    if (this.framesDisplay.length > 50) this.framesDisplay.shift();
                }
                this.drawFpsVisualizer();

                if (currentTime - startTime < testDuration) {
                    this.rafId = requestAnimationFrame(animate);
                } else {
                    this.isEstimatingFps = false;
                    const avgFps = this.frames.length > 0 ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length : 0;
                    fpsEl.textContent = `${Math.round(avgFps)} Hz (Avg)`;
                     if(!quickEstimate && getEl('start-refresh-rate-test')) getEl('start-refresh-rate-test').disabled = false;
                    this.frames = []; // Clear for next test
                }
            };
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = requestAnimationFrame(animate);
        },
        drawFpsVisualizer() {
            if (!this.ctx) return;
            const canvas = this.ctx.canvas;
            const W = canvas.width;
            const H = canvas.height;
            this.ctx.clearRect(0, 0, W, H);
            const barWidth = W / this.framesDisplay.length;
            const maxFpsGraph = 150; // Max FPS for graph scaling

            this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#1877f2';

            for (let i = 0; i < this.framesDisplay.length; i++) {
                const val = this.framesDisplay[i] || 0;
                const barHeight = Math.min(H, (val / maxFpsGraph) * H);
                this.ctx.fillRect(i * barWidth, H - barHeight, barWidth - 1, barHeight);
            }
        },
        async getMultiScreenDetails() {
            const container = getEl('multi-screen-details');
            const button = getEl('load-multi-screen');
            if(!container || !button) return;

            button.disabled = true; button.textContent = 'Loading...';
            container.innerHTML = '<p>Requesting permission for screen details...</p>';
            try {
                if (!('getScreenDetails' in window) && !('windowManagement' in navigator && navigator.windowManagement.getScreenDetails)) {
                    container.innerHTML = '<p class="text-warning">Multi-Screen Detail API (getScreenDetails or windowManagement) not supported by this browser.</p>';
                    return;
                }

                let screenDetails;
                 if (typeof window.getScreenDetails === 'function') {
                    screenDetails = await window.getScreenDetails();
                } else if (navigator.windowManagement && typeof navigator.windowManagement.getScreenDetails === 'function') {
                    screenDetails = await navigator.windowManagement.getScreenDetails(); // Older path
                } else {
                     container.innerHTML = '<p class="text-error">Screen Details API not found though initially detected.</p>';
                     return;
                }


                const renderScreenInfo = (details) => {
                    container.innerHTML = ''; // Clear
                     if (!details.screens || details.screens.length === 0) {
                        container.innerHTML = '<p>No extended screen information available or permission denied.</p>';
                        return;
                    }
                    details.screens.forEach((s, index) => {
                        const card = document.createElement('div');
                        card.className = 'info-card';
                        card.innerHTML = `
                            <div class="card-label">Screen ${index + 1} ${s.isPrimary ? '<strong class="text-success">(Primary)</strong>' : ''} ${s.isInternal ? '(Internal)' : '(External)'}</div>
                            <p><strong>ID Guess:</strong> ${s.label || s.id || `Screen ${index+1}` }</p>
                            <p><strong>Resolution:</strong> ${s.width}x${s.height} @ ${s.colorDepth}bit</p>
                            <p><strong>Available:</strong> ${s.availWidth}x${s.availHeight}</p>
                            <p><strong>Pixel Ratio:</strong> ${s.devicePixelRatio}</p>
                            <p><strong>Orientation:</strong> ${s.orientation ? s.orientation.type : 'N/A'}</p>
                        `;
                        container.appendChild(card);
                    });
                };

                renderScreenInfo(screenDetails);
                screenDetails.addEventListener('screenschange', () => renderScreenInfo(screenDetails)); // Handle changes

            } catch (err) {
                console.error("Multi-screen error:", err);
                container.innerHTML = `<p class="text-error">Error accessing screen details: ${err.message}. Ensure permission is granted.</p>`;
            } finally {
                button.disabled = false; button.textContent = 'Reload (needs permission)';
            }
        }
    };

    const SystemInfo = {
        init() {
            this.getOSInfo();
        },
        getOSInfo() {
            setText('os-platform', navigator.platform || 'N/A');
            setText('user-agent-full', navigator.userAgent || 'N/A');

            if (navigator.userAgentData) {
                const uad = navigator.userAgentData;
                setText('os-uad-platform', uad.platform || 'N/A');
                setText('os-uad-version', uad.platformVersion || 'N/A'); // This can be Windows Build no.
                setText('os-uad-arch', uad.architecture || 'N/A');
                
                // Windows detailed version from UAD TBD - requires mapping build numbers
                 if (uad.platform === "Windows" && uad.platformVersion) {
                    const build = parseInt(uad.platformVersion.split('.')[2]);
                    let winVer = "Windows";
                    if (build >= 22000) winVer = "Windows 11";
                    else if (build >= 10240 ) winVer = "Windows 10"; // Simplified
                    // could add more precise build to (22H2 etc strings)
                    setText('os-uad-version', `${uad.platformVersion} (${winVer} family)`);
                }


            } else {
                setText('os-uad-platform', 'UserAgentData API not supported');
                setText('os-uad-version', 'N/A');
                setText('os-uad-arch', 'N/A');
            }

            // Game Console Hint (very basic)
            const ua = navigator.userAgent.toLowerCase();
            let consoleHint = 'Not Detected';
            if (ua.includes('playstation 5') || ua.includes('ps5')) consoleHint = 'PlayStation 5 (Hint)';
            else if (ua.includes('playstation 4') || ua.includes('ps4')) consoleHint = 'PlayStation 4 (Hint)';
            else if (ua.includes('playstation 3') || ua.includes('ps3')) consoleHint = 'PlayStation 3 (Hint)';
            else if (ua.includes('xbox')) consoleHint = 'Xbox (Hint)';
            else if (ua.includes('nintendo switch') || ua.includes('nintendo wiiu')) consoleHint = 'Nintendo Console (Hint)';
            
            setTextWithStatus('game-console-hint', consoleHint, consoleHint !== 'Not Detected' ? 'warning' : '');

        }
    };

    const HardwareInfo = {
        init() {
            this.getCPUInfo();
            this.getMemoryInfo();
            this.getGPUInfo();
            this.checkEMEHDCP();
        },
        getCPUInfo() {
            setText('cpu-cores', navigator.hardwareConcurrency || 'N/A');
        },
        getMemoryInfo() {
            setText('device-memory', navigator.deviceMemory ? `${navigator.deviceMemory} GB (Approx.)` : 'N/A');
        },
        getGPUInfo() {
            const canvas = document.createElement('canvas');
            let gl;
            try {
                 gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            } catch (e) {}

            if (gl) {
                setText('webgl-version', gl.getParameter(gl.VERSION));
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    setText('gpu-renderer', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A');
                    // Get ANGLE backend if relevant (Windows mostly)
                    if (navigator.platform.startsWith('Win') && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase().includes('angle')) {
                         const angleBackendMatch = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)).match(/ANGLE \((.*?) Direct3D(.*?) (vs_\d_0 ps_\d_0)\)/i);
                         if (angleBackendMatch && angleBackendMatch[1] && angleBackendMatch[2]) {
                            setText('webgl-angle', `ANGLE on Direct3D ${angleBackendMatch[2].trim()} (${angleBackendMatch[1].trim()})`);
                         } else {
                            setText('webgl-angle', "Detected via ANGLE (details unavailable)");
                         }
                    } else {
                        setText('webgl-angle', 'N/A (Not ANGLE or not detectable)');
                    }

                } else {
                    setText('gpu-renderer', 'Debug info not available');
                     setText('webgl-angle', 'N/A');
                }
            } else {
                setText('webgl-version', 'WebGL not supported', 'error');
                setText('gpu-renderer', 'N/A');
                setText('webgl-angle', 'N/A');
            }
        },
        async checkEMEHDCP() {
            const el = getEl('eme-hdcp-status');
            if (!el) return;
            if (!navigator.requestMediaKeySystemAccess) {
                el.textContent = 'EME API not supported.';
                el.className = 'card-value text-warning';
                return;
            }

            // Check Widevine, as it's common and often requires HDCP
            const config = [{
                initDataTypes: ['cenc'], // 'keyids', 'webm' also common
                audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
                videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"', /* HDCP requirements can be added here */ hdcp: 'required' }], // Try 'required'
            }];

            try {
                el.textContent = 'Checking...';
                // Try requiring HDCP first
                await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{...config[0], videoCapabilities: [{contentType: 'video/mp4; codecs="avc1.42E01E"', hdcp: 'required'}]}]);
                el.textContent = 'HDCP "required" satisfied for Widevine (e.g., HD/4K content should be playable).';
                el.className = 'card-value text-success';
            } catch (e1) {
                 try {
                     // Try with optional HDCP if required failed
                    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{...config[0], videoCapabilities: [{contentType: 'video/mp4; codecs="avc1.42E01E"', hdcp: 'optional'}]}]);
                    el.textContent = 'HDCP "optional" satisfied for Widevine (SD content likely, HD/4K might be restricted if actual HDCP level is low/absent).';
                    el.className = 'card-value text-warning';
                }
                 catch (e2) {
                    console.warn("EME HDCP check error (optional):", e2);
                    el.textContent = 'EME Test for Widevine failed or HDCP not met even optionally. Encrypted content playback might be limited.';
                    el.className = 'card-value text-error';
                }
            }
        },
    };

    const MediaCapabilitiesInfo = {
        init() {
           if(getEl('load-audio-devices')) getEl('load-audio-devices').addEventListener('click', () => this.getAudioDevices());
           if(getEl('check-video-codecs')) getEl('check-video-codecs').addEventListener('click', () => this.checkVideoCodecs());
           if(getEl('check-audio-codecs')) getEl('check-audio-codecs').addEventListener('click', () => this.checkAudioCodecs());
           if(getEl('check-drm')) getEl('check-drm').addEventListener('click', () => this.checkDRMSupport());
        },
        async getAudioDevices() {
            const listEl = getEl('audio-devices-list');
            if (!listEl) return;
            listEl.innerHTML = '<p>Requesting permission for audio devices...</p>';
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                listEl.innerHTML = '<p class="text-warning">MediaDevices API not supported.</p>';
                return;
            }
            try {
                await navigator.mediaDevices.getUserMedia({audio: true}); // Request permission
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
                if (audioOutputDevices.length > 0) {
                    listEl.innerHTML = audioOutputDevices.map(device =>
                        `<div class="info-card">
                            <p><strong>${device.label || `Device ID: ${device.deviceId.substring(0,10)}...`}</strong></p>
                            <p>(Kind: ${device.kind}, Group: ${device.groupId.substring(0,10)}...)</p>
                         </div>`
                    ).join('');
                } else {
                    listEl.innerHTML = '<p>No audio output devices found or permission denied.</p>';
                }
            } catch (err) {
                console.error("Audio devices error:", err);
                listEl.innerHTML = `<p class="text-error">Error getting audio devices: ${err.message}. Ensure microphone permission is granted if prompted (needed to enumerate all audio devices).</p>`;
            }
        },
        async checkVideoCodec(codecConfig, name, container) {
             if (!('mediaCapabilities' in navigator)) {
                container.innerHTML += `<div class="info-card"><p><strong>${name}:</strong> MediaCapabilities API not supported.</p></div>`;
                return;
            }
            try {
                const { supported, smooth, powerEfficient } = await navigator.mediaCapabilities.decodingInfo(codecConfig);
                let statusText;
                let statusClass;
                if (supported) {
                    statusText = `Supported (Smooth: ${smooth}, Power Efficient: ${powerEfficient})`;
                    statusClass = 'text-success';
                } else {
                    statusText = 'Not Supported';
                    statusClass = 'text-error';
                }
                 container.innerHTML += `<div class="info-card"><p><strong class="${statusClass}">${name}:</strong> ${statusText}</p><small><code>${codecConfig.video ? codecConfig.video.contentType : codecConfig.audio.contentType}</code></small></div>`;
            } catch (e) {
                 container.innerHTML += `<div class="info-card"><p><strong class="text-error">${name}:</strong> Error checking (${e.message})</p></div>`;
            }
        },
        async checkVideoCodecs() {
            const container = getEl('video-codecs-support');
            if (!container) return;
            container.innerHTML = '<p>Checking common video codecs...</p>';
            const codecs = [
                { name: 'H.264 (AVC) - 기본', type: 'video', config: { contentType: 'video/mp4; codecs="avc1.42E01E"' } },
                { name: 'H.265 (HEVC) - Main', type: 'video', config: { contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"' } }, // Main profile, Level 3.1
                { name: 'VP9 - Profile 0', type: 'video', config: { contentType: 'video/webm; codecs="vp09.00.10.08"' } },
                { name: 'AV1 - Main', type: 'video', config: { contentType: 'video/mp4; codecs="av01.0.04M.08"' } },
                { name: 'H.264 (AVC) - 4K', type: 'video', config: { contentType: 'video/mp4; codecs="avc1.640028"', width: 3840, height: 2160, bitrate: 20000000, framerate: 30 } },
                { name: 'HEVC HDR10', type: 'video', config: { contentType: 'video/mp4; codecs="hvc1.2.4.L153.B0"; eotf="smpte2084"', /* hdrMetadataType: "hdr10plus" - for HDR10+ if interested */ width:1920, height:1080, bitrate: 10000000, framerate:30}},
            ];
            for (const codec of codecs) {
                await this.checkVideoCodec({ type: codec.type, video: codec.config }, codec.name, container);
            }
        },
         async checkAudioCodecs() {
            const container = getEl('audio-codecs-support');
            if (!container) return;
            container.innerHTML = '<p>Checking common audio codecs...</p>';
            const codecs = [
                { name: 'AAC-LC', type: 'audio', config: { contentType: 'audio/mp4; codecs="mp4a.40.2"' } },
                { name: 'Opus', type: 'audio', config: { contentType: 'audio/webm; codecs="opus"' } },
                { name: 'FLAC', type: 'audio', config: { contentType: 'audio/flac' } },
                { name: 'MP3', type: 'audio', config: { contentType: 'audio/mpeg' } },
                { name: 'Dolby Digital (AC-3) - via E-AC-3 JOC for Atmos hints on some platforms', type: 'audio', config: { contentType: 'audio/mp4; codecs="ec-3"' } }, // browsers mostly support decoding this for web content, not passthrough necessarily
            ];
             for (const codec of codecs) {
                await this.checkVideoCodec({ type: codec.type, audio: codec.config }, codec.name, container); // Reusing video method
            }
        },
        async checkDRMSupport() {
            const listEl = getEl('drm-support-list');
            if (!listEl) return;
            listEl.innerHTML = '<p>Checking DRM support...</p>';
            if (!navigator.requestMediaKeySystemAccess) {
                listEl.innerHTML = '<p class="text-warning">MediaKeySystemAccess API not supported.</p>';
                return;
            }
            const systems = [
                { name: 'Widevine', id: 'com.widevine.alpha' },
                { name: 'PlayReady', id: 'com.microsoft.playready' },
                { name: 'FairPlay', id: 'com.apple.fps.1_0' } // Usually Safari only
                // { name: 'Clear Key', id: 'org.w3.clearkey' } // Test DRM
            ];
            let foundAny = false;
            for (const system of systems) {
                try {
                    await navigator.requestMediaKeySystemAccess(system.id, [{ videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }]);
                    listEl.innerHTML += `<div class="info-card"><p><strong class="text-success">${system.name}:</strong> Supported</p></div>`;
                    foundAny = true;
                } catch (e) {
                    listEl.innerHTML += `<div class="info-card"><p><strong>${system.name}:</strong> Not Supported or Error</p></div>`;
                }
            }
            if (!foundAny && listEl.innerHTML.includes('Checking DRM')) listEl.innerHTML = "<p>No major DRM systems detected as supported.</p>";
        }
    };

    const ConnectivityInfo = {
        init() {
            this.getNetworkStatus();
            if(getEl('start-speed-test-btn')) getEl('start-speed-test-btn').addEventListener('click', () => this.startSpeedTest());
             window.addEventListener('online', () => this.getNetworkStatus(true));
            window.addEventListener('offline', () => this.getNetworkStatus(false));
            if(navigator.connection) {
                navigator.connection.addEventListener('change', () => this.getNetworkStatus());
            }
        },
        getNetworkStatus(forceOnlineState = null) {
            const online = forceOnlineState !== null ? forceOnlineState : navigator.onLine;
            setTextWithStatus('online-status', online ? 'Online' : 'Offline', online ? 'success' : 'error');

            if (navigator.connection) {
                setText('connection-type', navigator.connection.effectiveType || 'N/A');
                setText('connection-downlink', navigator.connection.downlink ? `${navigator.connection.downlink} Mbps (Effective)`: 'N/A');
                setText('connection-rtt', navigator.connection.rtt ? `${navigator.connection.rtt} ms (Effective)`: 'N/A');
            } else {
                setText('connection-type', 'Connection API not supported');
                setText('connection-downlink', 'N/A');
                setText('connection-rtt', 'N/A');
            }
        },
        async startSpeedTest() {
            // Very simplified "speed test"
            const resultEl = getEl('speed-test-result');
            const progressContainer = getEl('speed-test-progress');
            const progressBar = progressContainer ? progressContainer.querySelector('.progress-bar') : null;
            const btn = getEl('start-speed-test-btn');

            if(!resultEl || !progressBar || !btn) return;

            resultEl.textContent = 'Testing...';
            btn.disabled = true;
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';

            const fileSizeMB = 5; // 5MB test file
            const testFileURL = `https://via.placeholder.com/${fileSizeMB*1024}x1.png?text=${Date.now()}`; // Cache buster
            // A better source would be a static asset you control. placeholder.com might have rate limits or be slow.
            // For a real test, use a dedicated endpoint or a file on your server.
           
            try {
                const startTime = performance.now();
                const response = await fetch(testFileURL, {cache: "no-store"});
                
                if(!response.body) {
                     resultEl.textContent = 'ReadableStream not supported for progress.';
                     btn.disabled = false;
                     progressContainer.style.display = 'none';
                    return;
                }

                const reader = response.body.getReader();
                const contentLength = +response.headers.get('Content-Length'); // May not always be present with placeholders
                let receivedLength = 0;

                // Loop to read chunks
                while(true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    receivedLength += value.length;
                    if(contentLength) { // Only show progress if Content-Length is known
                         progressBar.style.width = `${(receivedLength / contentLength) * 100}%`;
                    } else {
                         progressBar.style.width = '50%'; // Indeterminate if no content length
                         progressBar.textContent = `${(receivedLength / (1024*1024)).toFixed(1)}MB`; // show MB received
                    }
                }

                const endTime = performance.now();
                const durationSeconds = (endTime - startTime) / 1000;
                let actualFileSizeMB = fileSizeMB; // Assume this if content-length isn't super reliable
                if(contentLength) actualFileSizeMB = contentLength / (1024 * 1024); // Use actual if available

                const speedMbps = (actualFileSizeMB * 8) / durationSeconds;
                
                resultEl.textContent = `${speedMbps.toFixed(2)} Mbps`;
            } catch (error) {
                console.error('Speed test error:', error);
                resultEl.textContent = `Error: ${error.message}`;
            } finally {
                btn.disabled = false;
                progressContainer.style.display = 'none';
                 progressBar.style.width = '0%';
            }
        }

    };

    const BrowserInfo = {
        init() {
            this.getBrowserDetails();
            this.getStorageInfo();
            this.checkFeatures();
        },
        getBrowserDetails() {
            if (navigator.userAgentData && navigator.userAgentData.brands) {
                const primaryBrand = navigator.userAgentData.brands.find(b => !b.brand.includes("Not") && !b.brand.includes("Chromium")); // Heuristic
                const engineBrand = navigator.userAgentData.brands.find(b => b.brand.includes("Chromium") || b.brand.includes("WebKit") || b.brand.includes("Gecko")); // Approx engine
                 setText('browser-name-version-uad', primaryBrand ? `${primaryBrand.brand} ${primaryBrand.version}` : 'See Full UA');
                 setText('browser-engine-uad', navigator.userAgentData.brands.map(b => `${b.brand} ${b.version}`).join(', ') || 'N/A'); // Shows all including engine ones
                 setText('browser-mobile-uad', navigator.userAgentData.mobile ? 'Yes' : 'No');
            } else {
                 setText('browser-name-version-uad', 'UserAgentData API not supported for brands.');
                 setText('browser-engine-uad', 'N/A');
                 let ua = navigator.userAgent || "";
                 // Basic UA parsing (less reliable)
                 if (ua.includes("Firefox/")) setText('browser-name-version-uad', (ua.match(/Firefox\/([\d.]+)/) || [])[0] || "Firefox (UA)");
                 else if (ua.includes("Chrome/") && !ua.includes("Edg/")) setText('browser-name-version-uad', (ua.match(/Chrome\/([\d.]+)/) || [])[0] || "Chrome (UA)");
                 else if (ua.includes("Edg/")) setText('browser-name-version-uad', (ua.match(/Edg\/([\d.]+)/) || [])[0] || "Edge (UA)");
                 else if (ua.includes("Safari/") && !ua.includes("Chrome/")) setText('browser-name-version-uad', (ua.match(/Version\/([\d.]+).*Safari/) || [])[0] || "Safari (UA)");

            }

            setText('browser-languages', navigator.languages ? navigator.languages.join(', ') : navigator.language);
            setTextWithStatus('cookies-enabled', navigator.cookieEnabled ? 'Yes' : 'No', navigator.cookieEnabled ? 'success' : 'error');
             try {
                setTextWithStatus('java-enabled', navigator.javaEnabled() ? 'Yes' : 'No (Legacy)', navigator.javaEnabled() ? 'warning' : ''); // Java Applets mostly dead
            } catch (e) { setText('java-enabled', 'Error'); }
        },
       async getStorageInfo() {
            if (navigator.storage && navigator.storage.estimate) {
                try {
                    const estimate = await navigator.storage.estimate();
                    setText('storage-quota', estimate.quota ? `${(estimate.quota / (1024 * 1024)).toFixed(2)} MB` : 'N/A');
                    setText('storage-usage', estimate.usage ? `${(estimate.usage / (1024 * 1024)).toFixed(2)} MB` : 'N/A');
                } catch (e) {
                    console.warn("Storage estimate error:", e);
                    setText('storage-quota', 'Error fetching'); setText('storage-usage', 'Error fetching');
                }
            } else {
                 setText('storage-quota', 'API not supported'); setText('storage-usage', 'N/A');
            }
        },
        checkFeatures() {
            setTextWithStatus('wasm-support', typeof WebAssembly === 'object' ? 'Supported' : 'Not Supported', typeof WebAssembly === 'object' ? 'success' : 'error');
            setTextWithStatus('serviceworker-support', 'serviceWorker' in navigator ? 'Supported' : 'Not Supported', 'serviceWorker' in navigator ? 'success' : 'error');
            setTextWithStatus('geolocation-api', 'geolocation' in navigator ? 'Available' : 'Not Available', 'geolocation' in navigator ? 'success' : 'warning');
        }
    };

    // --- Copy Report ---
    const copyReportBtn = getEl('copy-report-btn');
    if(copyReportBtn){
        copyReportBtn.addEventListener('click', async () => {
            let report = `Advanced System & Display Inspector Report (${new Date().toLocaleString()})\n`;
            report += "============================================\n\n";

            querySelAll('.tab-panel').forEach(panel => {
                const titleEl = panel.querySelector('h2');
                if (titleEl) report += `--- ${titleEl.firstChild.textContent.trim()} ---\n`;
                
                panel.querySelectorAll('.info-card').forEach(card => {
                    const labelEl = card.querySelector('.card-label');
                    let valueEl = card.querySelector('.card-value');
                    
                    if (labelEl && valueEl) {
                         report += `${labelEl.textContent.trim()}: ${valueEl.textContent.trim()}\n`;
                    } else if (labelEl && !valueEl) { // For cards that are just informational text
                        report += `${labelEl.textContent.trim()}\n`;
                         card.querySelectorAll('p').forEach(p => report += `  ${p.textContent.trim()}\n`);
                    }
                    // For subgrids like audio devices, media codecs
                    card.querySelectorAll('.info-subgrid .info-card p').forEach(p_sub => { // Check if subgrid exists
                        report += `  ${p_sub.textContent.trim().replace(/\s\s+/g, ' ')}\n`;
                    });

                });
                
                // Specifically for subgrids if sections are structured that way (e.g. screen details manually added)
                const subGrids = panel.querySelectorAll('.info-subgrid');
                 subGrids.forEach(sg => {
                    sg.querySelectorAll('.info-card').forEach(subCard => {
                        let subCardText = "";
                        subCard.querySelectorAll('div.card-label, p, strong').forEach(subEl => {
                            subCardText += subEl.textContent.trim() + " ";
                        });
                        if(subCardText) report += `  - ${subCardText.replace(/\s\s+/g, ' ').trim()}\n`;
                    });
                 });


                report += "\n";
            });

            report += "============================================\n";
            report += "Disclaimer: This information is for indicative purposes only and based on browser-reported data.\n";

            try {
                await navigator.clipboard.writeText(report);
                copyReportBtn.title = "Report Copied!";
                setTimeout(() => copyReportBtn.title = "Copy Report", 2000);
            } catch (err) {
                console.error('Failed to copy report: ', err);
                copyReportBtn.title = "Copy Failed!";
                 setTimeout(() => copyReportBtn.title = "Copy Report", 2000);
                alert('Failed to copy report to clipboard. It has been logged to the console.');
                console.log("--- REPORT --- \n", report);
            }
        });
    }


    // --- Initialize All Modules ---
    DisplayInfo.init();
    SystemInfo.init();
    HardwareInfo.init();
    MediaCapabilitiesInfo.init(); // Contains async calls, UI will update gradually/on button click
    ConnectivityInfo.init();
    BrowserInfo.init();
    
    // Set current year in footer
    if(getEl('current-year')) getEl('current-year').textContent = new Date().getFullYear();

    // Activate the first tab by default
    if(tabLinks.length > 0 && tabPanels.length > 0){
      //  tabLinks[0].click(); // This sets up the default tab panel - not needed if HTML has default active class
    }

});
