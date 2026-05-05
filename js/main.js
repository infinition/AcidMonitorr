/**
 * main.js
 * Application Entry Point
 */

// Initialize inputs from Config
function loadSettingsToInputs() {
    document.getElementById('server-ip').value = Config.ip;
    document.getElementById('sonarr-key').value = Config.sonarrKey;
    document.getElementById('radarr-key').value = Config.radarrKey;
    document.getElementById('jackett-key').value = Config.jackettKey;
    document.getElementById('prowlarr-key').value = Config.prowlarrKey;
    document.getElementById('plex-token').value = Config.plexToken;
    document.getElementById('demo-mode-toggle').checked = Config.isDemo;

    document.getElementById('enable-sonarr').checked = Config.enabled.sonarr;
    document.getElementById('enable-radarr').checked = Config.enabled.radarr;
    document.getElementById('enable-jackett').checked = Config.enabled.jackett;
    document.getElementById('enable-prowlarr').checked = Config.enabled.prowlarr;
    document.getElementById('enable-plex').checked = Config.enabled.plex;
    document.getElementById('enable-flaresolverr').checked = Config.enabled.flaresolverr;
    document.getElementById('enable-rdtclient').checked = Config.enabled.rdtclient;
}

function updateLinksIp() {
    const links = {
        'service-link-sonarr': `http://${Config.ip}:8989`,
        'service-link-radarr': `http://${Config.ip}:8310`,
        'service-link-jackett': `http://${Config.ip}:9117`,
        'service-link-prowlarr': `http://${Config.ip}:9696`,
        'service-link-plex': `http://${Config.ip}:32400/web`,
        'service-link-flaresolverr': `http://${Config.ip}:8191`,
        'service-link-rdtclient': `http://${Config.ip}:6500`,
    };
    for (const [className, url] of Object.entries(links)) {
        const el = document.querySelector('.' + className);
        if (el) el.href = url;
    }
    document.getElementById('display-ip').innerText = Config.ip;
}

function renderVisibility() {
    const setVisible = (id, isVisible) => {
        const el = document.getElementById(id);
        if (el) isVisible ? el.classList.remove('hidden') : el.classList.add('hidden');
    };
    ['sonarr', 'radarr', 'jackett', 'prowlarr', 'plex', 'flaresolverr', 'rdtclient'].forEach(svc => {
        setVisible(`nav-${svc}`, Config.enabled[svc]);
    });
}

// --- Refresh Logic ---

async function refreshFullData(showNotification = false) {
    if (State.isFullRefreshing) return;
    State.isFullRefreshing = true;

    try {
        if (Config.isDemo) {
            // Demo mode logic placeholder
            return;
        }

        if (showNotification) UI.showToast('Rafraîchissement complet...', 'info');

        const q = document.getElementById('dashboard-queue-list');
        if (q) q.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500"><div class="loader h-6 w-6 border-4 border-gray-700 mx-auto mb-2"></div>Sync...</td></tr>`;

        let activeQueueData = [];
        const promises = [];

        // Queue & Library
        if (Config.enabled.sonarr) {
            promises.push(API.fetchSonarrQueue().then(data => activeQueueData.push(...data)));
            promises.push(API.fetchSonarrLibrary());
        }
        if (Config.enabled.radarr) {
            promises.push(API.fetchRadarrQueue().then(data => activeQueueData.push(...data)));
            promises.push(API.fetchRadarrLibrary());
        }
        if (Config.enabled.rdtclient) {
            promises.push(API.fetchRDTClient().then(data => activeQueueData.push(...data)));
        }

        // Other Services
        if (Config.enabled.prowlarr) promises.push(API.fetchProwlarr());
        if (Config.enabled.plex) promises.push(API.fetchPlex());

        // History & Calendar
        promises.push(API.fetchHistory());
        promises.push(Calendar.render(Calendar.currentDate));

        if (Config.enabled.jackett) UI.updateStatus('jackett', 'online', 'Active');

        await Promise.allSettled(promises);

        State.activeQueue = activeQueueData;
        UI.renderRealQueue(activeQueueData);

        Logger.info('SYSTEM', "Full refresh completed");

    } catch (e) {
        Logger.error('SYSTEM', "Full Refresh Error", e);
    } finally {
        State.isFullRefreshing = false;
    }
}

async function refreshLiveData() {
    if (Config.isDemo || State.isFullRefreshing || State.isLiveRefreshing) return;
    State.isLiveRefreshing = true;

    try {
        let activeQueueData = [];
        const promises = [];

        if (Config.enabled.sonarr) promises.push(API.fetchSonarrQueue().then(data => activeQueueData.push(...data)));
        if (Config.enabled.radarr) promises.push(API.fetchRadarrQueue().then(data => activeQueueData.push(...data)));
        if (Config.enabled.rdtclient) promises.push(API.fetchRDTClient().then(data => activeQueueData.push(...data)));
        if (Config.enabled.plex) promises.push(API.fetchPlex());

        await Promise.allSettled(promises);

        State.activeQueue = activeQueueData;
        UI.renderRealQueue(activeQueueData);

    } catch (e) {
        Logger.error('SYSTEM', "Live Refresh Error", e);
    } finally {
        State.isLiveRefreshing = false;
    }
}

// --- Settings Interaction ---
function toggleSettings() {
    document.getElementById('settings-modal').classList.toggle('hidden');
}

function saveConfig() {
    Config.ip = document.getElementById('server-ip').value;
    Config.sonarrKey = document.getElementById('sonarr-key').value;
    Config.radarrKey = document.getElementById('radarr-key').value;
    Config.jackettKey = document.getElementById('jackett-key').value;
    Config.prowlarrKey = document.getElementById('prowlarr-key').value;
    Config.plexToken = document.getElementById('plex-token').value;
    Config.isDemo = document.getElementById('demo-mode-toggle').checked;

    Config.enabled.sonarr = document.getElementById('enable-sonarr').checked;
    Config.enabled.radarr = document.getElementById('enable-radarr').checked;
    Config.enabled.jackett = document.getElementById('enable-jackett').checked;
    Config.enabled.prowlarr = document.getElementById('enable-prowlarr').checked;
    Config.enabled.plex = document.getElementById('enable-plex').checked;
    Config.enabled.flaresolverr = document.getElementById('enable-flaresolverr').checked;
    Config.enabled.rdtclient = document.getElementById('enable-rdtclient').checked;

    Config.save();

    updateLinksIp();
    renderVisibility();
    toggleSettings();
    refreshFullData(true);
    UI.showToast('Configuration sauvegardée', 'success');
}

// --- Init ---
function init() {
    Logger.info('SYSTEM', 'Initializing AcidMonitorr v3.0...');

    loadSettingsToInputs();
    updateLinksIp();
    renderVisibility();

    Notifications.init();
    Calendar.init();

    // Restore active section
    const lastSection = localStorage.getItem('acidmonitorr_active_section') || 'dashboard';
    showSection(lastSection);

    refreshFullData(false);

    // Start polling
    setInterval(refreshLiveData, 5000);
    setInterval(Notifications.check, 30000);

    Logger.info('SYSTEM', 'Initialization complete');
}

// Expose functions to global scope for HTML event handlers
window.toggleSettings = toggleSettings;
window.saveConfig = saveConfig;
window.refreshFullData = refreshFullData;
window.showSection = showSection;
window.changeGridSize = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.style.gridTemplateColumns = `repeat(${val}, minmax(0, 1fr))`;

    // Save state
    if (id.includes('movies')) State.ui.movies.gridSize = val;
    if (id.includes('series')) State.ui.series.gridSize = val;
};

window.filterLibrary = (type) => {
    const inputId = type === 'movie' ? 'movies-search' : 'series-search';
    const val = document.getElementById(inputId).value.toLowerCase();

    if (type === 'movie') State.ui.movies.filter = val;
    else State.ui.series.filter = val;

    UI.renderLibrary(type);
};

window.sortLibrary = (type) => {
    const selectId = type === 'movie' ? 'movies-sort' : 'series-sort';
    const val = document.getElementById(selectId).value;

    if (type === 'movie') State.ui.movies.sort = val;
    else State.ui.series.sort = val;

    UI.renderLibrary(type);
};

// Start
document.addEventListener('DOMContentLoaded', init);
