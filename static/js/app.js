/**
 * AI DIGITAL TWIN HOME - FRONTEND CONTROLLER (APP.JS)
 * Handles REST API polling, device state toggling, water tank simulations,
 * TwinAI Voice & Chat assistant, Smart Automation Scenes, and 3D sync.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================================
    // 1. STATE & GLOBAL REFERENCES
    // =========================================================================
    let house3D = null;
    let localDevices = [];
    let lastWaterLevel = -1;
    let isSliderDragging = false;
    let speechEnabled = true;
    let recognition = null;
    let isRecognizing = false;

    // UI Selectors
    const sysStatusEl = document.getElementById('sys-status');
    const headerSceneNameEl = document.getElementById('header-scene-name');
    const liveClockEl = document.getElementById('live-clock');
    const statDevOnEl = document.getElementById('stat-dev-on');
    const statDevTotalEl = document.getElementById('stat-dev-total');
    const statWaterPctEl = document.getElementById('stat-water-pct');
    const statWaterBadgeEl = document.getElementById('stat-water-status-badge');
    const statPowerWattsEl = document.getElementById('stat-power-watts');
    const statAiScoreEl = document.getElementById('stat-ai-score');
    
    const aiAnomalyBoxEl = document.getElementById('ai-anomaly-box');
    const anomalyTitleEl = document.getElementById('anomaly-title');
    const anomalyDescEl = document.getElementById('anomaly-desc');
    
    const devicesContainer = document.getElementById('devices-container');
    const waterGaugePctEl = document.getElementById('water-gauge-pct');
    const waterVolumeLitersEl = document.getElementById('water-volume-liters');
    const waterStatusPillEl = document.getElementById('water-status-pill');
    const waterStatusTextEl = document.getElementById('water-status-text');
    const waterBarFillEl = document.getElementById('water-bar-fill');
    const waterSliderEl = document.getElementById('water-slider');
    const autoDrainStateEl = document.getElementById('auto-drain-state');
    const canvasWaterAlertEl = document.getElementById('canvas-water-alert');
    const canvasAlertTextEl = document.getElementById('canvas-alert-text');
    
    const aiPredictionHeadingEl = document.getElementById('ai-prediction-heading');
    const aiRecommendationTextEl = document.getElementById('ai-recommendation-text');
    const aiTrendLabelEl = document.getElementById('ai-trend-label');
    const aiTimeWarningEl = document.getElementById('ai-time-warning');
    const aiSlopeValEl = document.getElementById('ai-slope-val');
    const aiEnergyTipEl = document.getElementById('ai-energy-tip');
    
    const energyNowWattsEl = document.getElementById('energy-now-watts');
    const energyDailyKwhEl = document.getElementById('energy-daily-kwh');
    const energyBreakdownListEl = document.getElementById('energy-breakdown-list');
    
    const activityFeedEl = document.getElementById('activity-feed');
    const logCountEl = document.getElementById('log-count');
    const toastContainer = document.getElementById('toast-container');

    // TwinAI Chat Elements
    const twinaiFab = document.getElementById('twinai-fab');
    const twinaiChatbox = document.getElementById('twinai-chatbox');
    const btnChatClose = document.getElementById('btn-chat-close');
    const btnVoiceSpeakToggle = document.getElementById('btn-voice-speak-toggle');
    const chatMessagesEl = document.getElementById('chat-messages');
    const chatTextInput = document.getElementById('chat-text-input');
    const btnChatSend = document.getElementById('btn-chat-send');
    const btnVoiceMic = document.getElementById('btn-voice-mic');
    const voiceListeningBar = document.getElementById('voice-listening-bar');

    // =========================================================================
    // 2. INITIALIZE 3D ENGINE
    // =========================================================================
    try {
        house3D = new House3DEngine('three-canvas-container', (clickedId) => {
            handle3DObjectClick(clickedId);
        });
    } catch (err) {
        console.error("Three.js engine failed to initialize:", err);
    }

    // =========================================================================
    // 3. LIVE CLOCK
    // =========================================================================
    function updateClock() {
        const now = new Date();
        liveClockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // =========================================================================
    // 4. API FETCH & SYNC ENGINE
    // =========================================================================
    async function fetchSystemStatus() {
        try {
            const res = await fetch('/api/status');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (data.success) {
                renderSystemState(data);
            }
        } catch (err) {
            console.warn("Telemetry fetch error:", err);
            sysStatusEl.textContent = "OFFLINE";
            sysStatusEl.className = "pill-value text-red";
        }
    }

    function renderSystemState(data) {
        sysStatusEl.textContent = "ONLINE";
        sysStatusEl.className = "pill-value text-emerald";

        if (headerSceneNameEl && data.system.active_scene) {
            headerSceneNameEl.textContent = data.system.active_scene.toUpperCase();
            updateActiveSceneButtons(data.system.active_scene);
        }

        // Quick Stats
        statDevOnEl.textContent = data.system.devices_on;
        statDevTotalEl.textContent = data.devices.length;
        statWaterPctEl.textContent = `${data.water.level_percent}%`;
        statWaterBadgeEl.textContent = data.water.status;
        statWaterBadgeEl.className = `badge-status ${data.water.status.toLowerCase()}`;
        statPowerWattsEl.textContent = Math.round(data.energy.current_watts);
        statAiScoreEl.textContent = data.ai_prediction.energy.efficiency_score;

        // Render Devices
        localDevices = data.devices;
        renderDeviceCards(data.devices);

        // Synchronize 3D Digital Twin
        if (house3D) {
            data.devices.forEach(d => {
                house3D.setDeviceState(d.id, d.state);
            });
            house3D.setWaterLevel(data.water.level_percent);
        }

        // Water Telemetry
        renderWaterTelemetry(data.water, data.system.auto_drain);

        // AI Predictions
        renderAiAnalytics(data.ai_prediction);

        // AI Anomaly Box
        renderAnomalies(data.ai_prediction.anomalies);

        // Energy Stats
        renderEnergyStats(data.energy);

        // Activity Logs
        renderActivityLogs(data.activity_logs);
    }

    // =========================================================================
    // 5. DEVICE RENDERING & TOGGLES
    // =========================================================================
    function renderDeviceCards(devices) {
        let html = '';
        devices.forEach(d => {
            const isOn = d.state === 1;
            let iconClass = 'fa-solid fa-power-off';
            let extraClass = '';

            if (d.type === 'light') {
                iconClass = 'fa-solid fa-lightbulb';
                if (isOn) extraClass = 'bulb-glowing';
            } else if (d.type === 'fan') {
                iconClass = 'fa-solid fa-fan';
                if (isOn) extraClass = 'fan-spinning';
            } else if (d.type === 'cooler') {
                iconClass = 'fa-solid fa-snowflake';
                extraClass = 'cooler-icon';
            } else if (d.type === 'pump') {
                iconClass = 'fa-solid fa-water';
                extraClass = 'pump-icon';
            } else if (d.id === 'living_tv') {
                iconClass = 'fa-solid fa-tv';
            } else if (d.type === 'appliance') {
                iconClass = 'fa-solid fa-cube';
            }

            html += `
                <div class="device-card ${isOn ? 'is-on' : ''}" data-device-id="${d.id}">
                    <div class="device-card-header">
                        <div class="device-icon-box ${extraClass}">
                            <i class="${iconClass}"></i>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="device-toggle-checkbox" data-id="${d.id}" ${isOn ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="device-name">${d.name}</div>
                    <div class="device-room">${d.room}</div>
                    <div class="device-card-footer">
                        <span class="device-status-text">${isOn ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}</span>
                        <span class="device-power-tag">${d.power_watts}W</span>
                    </div>
                </div>
            `;
        });

        devicesContainer.innerHTML = html;

        const checkboxes = devicesContainer.querySelectorAll('.device-toggle-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const deviceId = e.target.getAttribute('data-id');
                toggleDevice(deviceId);
            });
        });
    }

    async function toggleDevice(deviceId) {
        const dev = localDevices.find(d => d.id === deviceId);
        if (dev) {
            const nextState = dev.state === 1 ? 0 : 1;
            dev.state = nextState;
            if (house3D) house3D.setDeviceState(deviceId, nextState);
        }

        try {
            const res = await fetch(`/api/devices/${deviceId}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                const stateStr = data.device.state === 1 ? 'turned ON' : 'turned OFF';
                showToast(`${data.device.name} ${stateStr}`, 'info');
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("Device toggle failed:", err);
            showToast("Failed to toggle device", "critical");
        }
    }

    function handle3DObjectClick(clickedId) {
        if (clickedId === 'water_tank') {
            switchCamera('utility');
            showToast("Focusing Water Tank & Pump", "info");
            return;
        }

        const dev = localDevices.find(d => d.id === clickedId);
        if (dev) {
            toggleDevice(clickedId);
        }
    }

    // =========================================================================
    // 6. SMART SCENE AUTOMATION
    // =========================================================================
    async function activateScene(sceneName) {
        try {
            const res = await fetch(`/api/scenes/${sceneName}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast(`AI Scene '${sceneName.toUpperCase()}' Activated!`, 'success');
                updateActiveSceneButtons(sceneName);
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("Scene activate error:", err);
        }
    }

    function updateActiveSceneButtons(sceneName) {
        document.querySelectorAll('.btn-scene').forEach(btn => {
            if (btn.getAttribute('data-scene') === sceneName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('.btn-scene').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scene = e.currentTarget.getAttribute('data-scene');
            activateScene(scene);
        });
    });

    // =========================================================================
    // 7. WATER TELEMETRY & CONTROLS
    // =========================================================================
    function renderWaterTelemetry(water, autoDrainEnabled) {
        const level = water.level_percent;
        waterGaugePctEl.textContent = `${level}%`;
        waterVolumeLitersEl.textContent = `${water.liters} / ${water.capacity} Liters`;
        waterStatusTextEl.textContent = water.status;

        waterBarFillEl.style.width = `${Math.min(100, Math.max(0, level))}%`;
        waterBarFillEl.className = 'water-bar-fill';
        waterStatusPillEl.className = 'status-indicator-pill';

        if (level <= 10.0) {
            waterBarFillEl.classList.add('critical');
            waterStatusPillEl.classList.add('critical');
            canvasWaterAlertEl.classList.remove('hidden');
            canvasAlertTextEl.textContent = "CRITICAL: Water Tank Depleted (< 10%)";
            if (lastWaterLevel > 10.0 || lastWaterLevel === -1) {
                showToast("CRITICAL: Water level below 10%!", "critical");
            }
        } else if (level <= 25.0) {
            waterBarFillEl.classList.add('warning');
            waterStatusPillEl.classList.add('warning');
            canvasWaterAlertEl.classList.remove('hidden');
            canvasAlertTextEl.textContent = "WARNING: Water Tank Level is Low (< 25%)";
            if (lastWaterLevel > 25.0 || lastWaterLevel === -1) {
                showToast("WARNING: Water tank reserve below 25%", "warning");
            }
        } else {
            canvasWaterAlertEl.classList.add('hidden');
        }

        lastWaterLevel = level;

        if (!isSliderDragging) {
            waterSliderEl.value = level;
        }

        autoDrainStateEl.textContent = autoDrainEnabled ? "ON" : "OFF";
        autoDrainStateEl.style.color = autoDrainEnabled ? "var(--emerald)" : "var(--text-muted)";
    }

    async function adjustWaterLevel(delta) {
        try {
            const res = await fetch('/api/water/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta: delta })
            });
            const data = await res.json();
            if (data.success) {
                if (house3D) house3D.setWaterLevel(data.water.level_percent);
                showToast(`Water level adjusted to ${data.water.level_percent}%`, 'info');
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("Water adjust error:", err);
        }
    }

    async function resetWaterTank() {
        try {
            const res = await fetch('/api/water/reset', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                if (house3D) house3D.setWaterLevel(data.water.level_percent);
                showToast("Smart Refill completed (85% reserve)", "success");
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("Water reset error:", err);
        }
    }

    async function toggleAutoDrainSimulation() {
        try {
            const res = await fetch('/api/water/toggle_auto_drain', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const txt = data.auto_drain ? "Auto-drain simulation ENABLED" : "Auto-drain simulation PAUSED";
                showToast(txt, "info");
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("Auto drain toggle error:", err);
        }
    }

    document.getElementById('btn-water-sub10').addEventListener('click', () => adjustWaterLevel(-10));
    document.getElementById('btn-water-add10').addEventListener('click', () => adjustWaterLevel(10));
    document.getElementById('btn-water-refill').addEventListener('click', resetWaterTank);
    document.getElementById('btn-toggle-drain').addEventListener('click', toggleAutoDrainSimulation);

    waterSliderEl.addEventListener('input', (e) => {
        isSliderDragging = true;
        const val = parseFloat(e.target.value);
        waterGaugePctEl.textContent = `${val}%`;
        waterBarFillEl.style.width = `${val}%`;
        if (house3D) house3D.setWaterLevel(val);
    });

    waterSliderEl.addEventListener('change', async (e) => {
        isSliderDragging = false;
        const val = parseFloat(e.target.value);
        try {
            await fetch('/api/water/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level: val })
            });
            fetchSystemStatus();
        } catch (err) {
            console.error("Water slider error:", err);
        }
    });

    // =========================================================================
    // 8. AI PREDICTIONS & ANOMALIES
    // =========================================================================
    function renderAiAnalytics(aiData) {
        const waterAi = aiData.water;
        const energyAi = aiData.energy;

        aiPredictionHeadingEl.textContent = waterAi.prediction_text;
        aiRecommendationTextEl.textContent = waterAi.recommendation;

        aiTrendLabelEl.textContent = waterAi.trend_label;
        aiTrendLabelEl.style.color = waterAi.risk_color;

        if (waterAi.mins_to_warning) {
            aiTimeWarningEl.textContent = `~${waterAi.mins_to_warning} mins`;
            aiTimeWarningEl.className = "ai-metric-val font-mono text-amber";
        } else if (waterAi.risk_level === 'CRITICAL') {
            aiTimeWarningEl.textContent = "IMMEDIATE";
            aiTimeWarningEl.className = "ai-metric-val font-mono text-red";
        } else {
            aiTimeWarningEl.textContent = "Adequate";
            aiTimeWarningEl.className = "ai-metric-val font-mono text-emerald";
        }

        aiSlopeValEl.textContent = `${waterAi.slope > 0 ? '+' : ''}${waterAi.slope}%/step`;
        aiEnergyTipEl.textContent = energyAi.tip;
    }

    function renderAnomalies(anomaliesData) {
        if (!anomaliesData || anomaliesData.count === 0) {
            aiAnomalyBoxEl.classList.add('hidden');
            return;
        }

        const firstAnomaly = anomaliesData.anomalies[0];
        anomalyTitleEl.textContent = firstAnomaly.title;
        anomalyDescEl.textContent = `${firstAnomaly.description} — ${firstAnomaly.action}`;
        aiAnomalyBoxEl.classList.remove('hidden');
    }

    // =========================================================================
    // 9. ENERGY BREAKDOWN & ACTIVITY
    // =========================================================================
    function renderEnergyStats(energy) {
        energyNowWattsEl.innerHTML = `${Math.round(energy.current_watts)} <small>Watts</small>`;
        energyDailyKwhEl.innerHTML = `${energy.est_daily_kwh} <small>kWh</small>`;

        let html = '';
        energy.breakdown.forEach(item => {
            const pct = Math.min(100, Math.round((item.active_watts / 350) * 100));
            html += `
                <div class="energy-item">
                    <span class="energy-item-name">${item.name}</span>
                    <div class="energy-item-bar-box">
                        <div class="energy-item-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <span class="font-mono text-amber">${item.active_watts}W</span>
                </div>
            `;
        });
        energyBreakdownListEl.innerHTML = html;
    }

    function renderActivityLogs(logs) {
        if (!logs || logs.length === 0) return;
        logCountEl.textContent = `${logs.length} Events`;

        let html = '';
        logs.forEach(log => {
            let icon = 'fa-bolt';
            if (log.category === 'water') icon = 'fa-water';
            else if (log.category === 'system') icon = 'fa-wand-magic-sparkles';

            const timeStr = log.timestamp.split(' ')[1] || log.timestamp;

            html += `
                <div class="activity-item ${log.category}">
                    <i class="fa-solid ${icon} text-cyan"></i>
                    <span class="activity-time">${timeStr}</span>
                    <span class="activity-msg">${log.message}</span>
                </div>
            `;
        });
        activityFeedEl.innerHTML = html;
    }

    // =========================================================================
    // 10. TWINAI VOICE & CHAT ASSISTANT
    // =========================================================================
    twinaiFab.addEventListener('click', () => {
        twinaiChatbox.classList.toggle('closed');
        if (!twinaiChatbox.classList.contains('closed')) {
            chatTextInput.focus();
        }
    });

    btnChatClose.addEventListener('click', () => {
        twinaiChatbox.classList.add('closed');
    });

    btnVoiceSpeakToggle.addEventListener('click', () => {
        speechEnabled = !speechEnabled;
        btnVoiceSpeakToggle.classList.toggle('active', speechEnabled);
        showToast(speechEnabled ? "Voice speech feedback ENABLED" : "Voice speech feedback MUTED", "info");
    });

    async function sendChatMessage(msg) {
        const text = (msg || chatTextInput.value).trim();
        if (!text) return;

        chatTextInput.value = '';
        appendChatBubble(text, 'user');

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (data.success) {
                appendChatBubble(data.reply, 'bot');
                if (speechEnabled) speakText(data.reply);
                fetchSystemStatus();
            }
        } catch (err) {
            console.error("TwinAI Chat Error:", err);
            appendChatBubble("Sorry, I could not process that command.", 'bot');
        }
    }

    function appendChatBubble(text, sender) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        
        if (sender === 'bot') {
            bubble.innerHTML = `
                <div class="msg-author"><i class="fa-solid fa-robot"></i> TwinAI</div>
                <div class="msg-text">${text}</div>
            `;
        } else {
            bubble.innerHTML = `<div class="msg-text">${text}</div>`;
        }

        chatMessagesEl.appendChild(bubble);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    btnChatSend.addEventListener('click', () => sendChatMessage());
    chatTextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    document.querySelectorAll('.chat-suggestions .chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const msg = e.currentTarget.getAttribute('data-msg');
            sendChatMessage(msg);
        });
    });

    // Web Speech Recognition (Microphone Voice Input)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecognizing = true;
            btnVoiceMic.classList.add('listening');
            voiceListeningBar.classList.remove('hidden');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatTextInput.value = transcript;
            sendChatMessage(transcript);
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            btnVoiceMic.classList.remove('listening');
            voiceListeningBar.classList.add('hidden');
            showToast("Microphone error: " + event.error, "warning");
        };

        recognition.onend = () => {
            isRecognizing = false;
            btnVoiceMic.classList.remove('listening');
            voiceListeningBar.classList.add('hidden');
        };

        btnVoiceMic.addEventListener('click', () => {
            if (isRecognizing) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.warn(e);
                }
            }
        });
    } else {
        btnVoiceMic.addEventListener('click', () => {
            showToast("Speech Recognition not supported in this browser. Please type your message.", "info");
        });
    }

    // =========================================================================
    // 11. CAMERA CONTROLS
    // =========================================================================
    function switchCamera(roomName) {
        if (house3D) house3D.flyTo(roomName);
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-room') === roomName);
        });
    }

    document.querySelectorAll('.cam-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchCamera(e.currentTarget.getAttribute('data-room'));
        });
    });

    document.getElementById('btn-reset-cam').addEventListener('click', () => switchCamera('overview'));

    // =========================================================================
    // 12. TOAST NOTIFICATIONS
    // =========================================================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info text-cyan';
        if (type === 'success') icon = 'fa-circle-check text-emerald';
        else if (type === 'warning') icon = 'fa-triangle-exclamation text-amber';
        else if (type === 'critical') icon = 'fa-triangle-exclamation text-red';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Start Polling Engine
    fetchSystemStatus();
    setInterval(fetchSystemStatus, 2000);
});
