/**
 * main.js - Application Entry Point (Tauri)
 */

function loadSettingsToInputs() {
    document.getElementById('server-ip').value = Config.ip;
    document.getElementById('sonarr-key').value = Config.sonarrKey;
    document.getElementById('radarr-key').value = Config.radarrKey;
    document.getElementById('jackett-key').value = Config.jackettKey;
    document.getElementById('prowlarr-key').value = Config.prowlarrKey;
    document.getElementById('plex-token').value = Config.plexToken;
    document.getElementById('demo-mode-toggle').checked = Config.isDemo;
    document.getElementById('refresh-interval').value = Config.refreshInterval;

    document.getElementById('sonarr-port').value = Config.sonarrPort;
    document.getElementById('radarr-port').value = Config.radarrPort;
    document.getElementById('prowlarr-port').value = Config.prowlarrPort;
    document.getElementById('jackett-port').value = Config.jackettPort;
    document.getElementById('plex-port').value = Config.plexPort;
    document.getElementById('flaresolverr-port').value = Config.flaresolverrPort;
    document.getElementById('rdtclient-port').value = Config.rdtclientPort;

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
        'service-link-sonarr': `http://${Config.ip}:${Config.sonarrPort}`,
        'service-link-radarr': `http://${Config.ip}:${Config.radarrPort}`,
        'service-link-jackett': `http://${Config.ip}:${Config.jackettPort}`,
        'service-link-prowlarr': `http://${Config.ip}:${Config.prowlarrPort}`,
        'service-link-plex': `http://${Config.ip}:${Config.plexPort}/web`,
        'service-link-flaresolverr': `http://${Config.ip}:${Config.flaresolverrPort}`,
        'service-link-rdtclient': `http://${Config.ip}:${Config.rdtclientPort}`,
    };
    for (const [className, url] of Object.entries(links)) {
        const el = document.querySelector('.' + className);
        if (el) el.href = url;
    }
    const displayIp = document.getElementById('display-ip');
    if (displayIp) displayIp.innerText = Config.ip;
}

function renderVisibility() {
    const setVisible = (id, isVisible) => {
        const el = document.getElementById(id);
        if (el) isVisible ? el.classList.remove('hidden') : el.classList.add('hidden');
    };
    ['sonarr', 'radarr', 'jackett', 'prowlarr', 'plex', 'flaresolverr', 'rdtclient'].forEach(svc => {
        setVisible(`nav-${svc}`, Config.enabled[svc]);
        setVisible(`card-${svc}`, Config.enabled[svc]);
    });
}

// --- Refresh Logic ---
let liveInterval = null;

async function refreshFullData(showNotification = false) {
    if (State.isFullRefreshing) return;
    State.isFullRefreshing = true;

    try {
        if (Config.isDemo) {
            State.isFullRefreshing = false;
            return;
        }

        if (showNotification) UI.showToast('Rafraichissement complet...', 'info');

        const q = document.getElementById('dashboard-queue-list');
        if (q) q.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500"><div class="loader h-6 w-6 border-4 border-gray-700 mx-auto mb-2"></div>Sync...</td></tr>`;

        let activeQueueData = [];
        const promises = [];

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
        // Indexers (Prowlarr + Jackett combined)
        let allIndexers = [];
        if (Config.enabled.prowlarr) {
            promises.push(API.fetchProwlarr().then(data => allIndexers.push(...data)));
        }
        if (Config.enabled.jackett) {
            promises.push(API.fetchJackett().then(data => allIndexers.push(...data)));
        }

        if (Config.enabled.plex) {
            promises.push(API.fetchPlex());
            promises.push(API.fetchPlexWatchlist().then(data => {
                if (data?.MediaContainer?.Metadata) {
                    UI.renderPlexWatchlist(data.MediaContainer.Metadata);
                }
            }));
        }
        if (Config.enabled.flaresolverr) promises.push(API.fetchFlaresolverr());

        promises.push(API.fetchHistory());
        promises.push(Calendar.render(Calendar.currentDate));

        // Disk space + health (non-blocking)
        promises.push(API.fetchDiskSpace().then(data => {
            if (data && Array.isArray(data)) UI.renderDiskSpace(data);
        }));
        promises.push(API.fetchSystemHealth().then(data => {
            if (data && Array.isArray(data)) UI.renderSystemHealth(data);
        }));

        await Promise.allSettled(promises);

        // Render combined indexers
        if (allIndexers.length > 0) {
            State.mediaLibrary.indexers = allIndexers;
            const el = document.getElementById('dash-jackett-count');
            if (el) el.innerText = allIndexers.length;
            UI.renderIndexers(allIndexers);
        }

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

async function saveConfig() {
    Config.ip = document.getElementById('server-ip').value;
    Config.sonarrKey = document.getElementById('sonarr-key').value;
    Config.radarrKey = document.getElementById('radarr-key').value;
    Config.jackettKey = document.getElementById('jackett-key').value;
    Config.prowlarrKey = document.getElementById('prowlarr-key').value;
    Config.plexToken = document.getElementById('plex-token').value;
    Config.isDemo = document.getElementById('demo-mode-toggle').checked;
    Config.refreshInterval = parseInt(document.getElementById('refresh-interval').value) || 5;

    Config.sonarrPort = parseInt(document.getElementById('sonarr-port').value) || 8989;
    Config.radarrPort = parseInt(document.getElementById('radarr-port').value) || 8310;
    Config.prowlarrPort = parseInt(document.getElementById('prowlarr-port').value) || 9696;
    Config.jackettPort = parseInt(document.getElementById('jackett-port').value) || 9117;
    Config.plexPort = parseInt(document.getElementById('plex-port').value) || 32400;
    Config.flaresolverrPort = parseInt(document.getElementById('flaresolverr-port').value) || 8191;
    Config.rdtclientPort = parseInt(document.getElementById('rdtclient-port').value) || 6500;

    Config.enabled.sonarr = document.getElementById('enable-sonarr').checked;
    Config.enabled.radarr = document.getElementById('enable-radarr').checked;
    Config.enabled.jackett = document.getElementById('enable-jackett').checked;
    Config.enabled.prowlarr = document.getElementById('enable-prowlarr').checked;
    Config.enabled.plex = document.getElementById('enable-plex').checked;
    Config.enabled.flaresolverr = document.getElementById('enable-flaresolverr').checked;
    Config.enabled.rdtclient = document.getElementById('enable-rdtclient').checked;

    await Config.save();

    updateLinksIp();
    renderVisibility();
    toggleSettings();

    // Restart live polling with new interval
    if (liveInterval) clearInterval(liveInterval);
    liveInterval = setInterval(refreshLiveData, Config.refreshInterval * 1000);

    refreshFullData(true);
    UI.showToast('Configuration sauvegardee', 'success');
}

// --- Init ---
async function init() {
    Logger.info('SYSTEM', 'Initializing AcidMonitorr v3.0 (Tauri)...');

    // Load config from disk via Rust
    await Config.load();

    loadSettingsToInputs();
    updateLinksIp();
    renderVisibility();

    Notifications.init();
    Calendar.init();

    // Restore active section
    showSection(Config.activeSection || 'dashboard');

    refreshFullData(false);

    // Start polling
    liveInterval = setInterval(refreshLiveData, Config.refreshInterval * 1000);
    setInterval(Notifications.check, 30000);

    Logger.info('SYSTEM', 'Initialization complete');
}

// Expose functions to global scope
window.toggleSettings = toggleSettings;
window.saveConfig = saveConfig;
window.refreshFullData = refreshFullData;
window.showSection = showSection;

window.changeGridSize = (type, delta) => {
    const state = type === 'movies' ? State.ui.movies : State.ui.series;
    let newSize = state.gridSize + (delta * 2);
    if (newSize < 2) newSize = 2;
    if (newSize > 8) newSize = 8;
    state.gridSize = newSize;

    const grid = document.getElementById(`${type}-grid`);
    if (grid) grid.className = `grid gap-4 grid-cols-2 md:grid-cols-${Math.max(2, newSize - 2)} lg:grid-cols-${newSize}`;
};

window.filterLibrary = (type, filter) => {
    const stateKey = type === 'movie' || type === 'movies' ? 'movies' : 'series';
    if (filter === 'all') {
        State.ui[stateKey].filter = '';
    } else {
        State.ui[stateKey].filter = '';
    }

    // Apply filter on data
    const lib = stateKey === 'movies' ? State.mediaLibrary.movies : State.mediaLibrary.series;
    let data = [...lib];
    if (filter !== 'all') {
        data = data.filter(item => {
            if (filter === 'monitored') return item.monitored;
            if (filter === 'missing') return !item.hasFile && item.monitored;
            if (filter === 'downloaded') return item.hasFile;
            if (filter === 'ended') return item.status === 'ended';
            if (filter === 'continuing') return item.status === 'continuing';
            return true;
        });
    }

    const gridId = stateKey === 'movies' ? 'movies-grid' : 'series-grid';
    UI.renderMediaGrid(data, gridId, stateKey === 'movies' ? 'movie' : 'series');

    // Update active button state
    const sectionId = stateKey === 'movies' ? 'section-movies' : 'section-series';
    const btns = document.querySelectorAll(`#${sectionId} button[data-action="filter-library"]`);
    btns.forEach(b => {
        if (b.dataset.param2 === filter) {
            b.classList.remove('bg-black/40', 'text-gray-400', 'border-gray-800');
            b.classList.add('bg-white/10', 'text-white', 'border-white/10');
        } else {
            b.classList.add('bg-black/40', 'text-gray-400', 'border-gray-800');
            b.classList.remove('bg-white/10', 'text-white', 'border-white/10');
        }
    });
};

window.sortLibrary = (type, sort) => {
    const stateKey = type === 'movie' || type === 'movies' ? 'movies' : 'series';
    State.ui[stateKey].sort = sort;
    UI.renderLibrary(stateKey);
};

// --- Global Library Search (real-time) ---
window.globalSearch = debounce((term) => {
    const searchResults = document.getElementById('global-search-results');
    if (!searchResults) return;

    if (!term || term.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }

    const t = term.toLowerCase();
    const results = [];

    // Search movies
    State.mediaLibrary.movies.forEach(m => {
        if (m.title.toLowerCase().includes(t)) {
            results.push({ ...m, mediaType: 'movie' });
        }
    });

    // Search series
    State.mediaLibrary.series.forEach(s => {
        if (s.title.toLowerCase().includes(t)) {
            results.push({ ...s, mediaType: 'series' });
        }
    });

    if (results.length === 0) {
        searchResults.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs">Aucun resultat dans la bibliotheque. <span class="text-acid-green cursor-pointer" data-action="search-external" data-param="${term}">Rechercher en ligne</span></div>`;
        searchResults.classList.remove('hidden');
        return;
    }

    searchResults.innerHTML = results.slice(0, 12).map(item => {
        const img = item.image || posterFallback(item.title, item.year);
        const icon = item.mediaType === 'movie' ? 'fa-film text-yellow-500' : 'fa-tv text-acid-accent';
        const status = item.hasFile ? '<i class="fas fa-check text-green-400"></i>' : '<i class="fas fa-clock text-yellow-500"></i>';
        // Check if downloading
        const dl = State.activeQueue.find(q =>
            (item.mediaType === 'movie' && q.movieId === item.id) ||
            (item.mediaType === 'series' && q.seriesId === item.id)
        );
        const dlBadge = dl ? `<span class="text-acid-green text-[10px] animate-pulse"><i class="fas fa-download mr-1"></i>${dl.progress}%</span>` : '';

        return `<div class="flex items-center gap-3 p-2 hover:bg-white/10 rounded cursor-pointer transition-colors" data-action="open-detail" data-param="${item.mediaType}" data-id="${item.id}">
            <img src="${img}" class="w-8 h-12 object-cover rounded bg-gray-800 flex-shrink-0">
            <div class="flex-1 min-w-0">
                <div class="text-white text-xs font-medium truncate"><i class="fas ${icon} mr-1"></i>${item.title}</div>
                <div class="text-gray-500 text-[10px]">${item.year || ''}</div>
            </div>
            <div class="flex items-center gap-2">${dlBadge} ${status}</div>
        </div>`;
    }).join('') + (results.length > 12 ? `<div class="p-2 text-center text-gray-500 text-[10px]">${results.length - 12} autres resultats...</div>` : '');

    searchResults.classList.remove('hidden');
}, 150);

// Helper: get queue item for a media ID
window.getQueueForMedia = (type, id) => {
    return State.activeQueue.find(q =>
        (type === 'movie' && q.movieId === id) ||
        (type === 'series' && q.seriesId === id)
    );
};

// Helper: build media info badges HTML
window.mediaInfoBadges = (mediaInfo) => {
    if (!mediaInfo) return '';
    const badges = [];
    const res = mediaInfo.resolution || mediaInfo.videoResolution;
    if (res) {
        const resText = res.toString().includes('2160') || res.toString().includes('4') ? '4K' : res.toString().includes('1080') ? '1080p' : res.toString().includes('720') ? '720p' : res;
        const resColor = resText === '4K' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : resText === '1080p' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-700 text-gray-400 border-gray-600';
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${resColor} border">${resText}</span>`);
    }
    const vc = mediaInfo.videoCodec || mediaInfo.videoFormat;
    if (vc) {
        const vcName = vc.toString().toLowerCase().includes('hevc') || vc.toString().toLowerCase().includes('265') ? 'HEVC' : vc.toString().toLowerCase().includes('264') ? 'H.264' : vc.toString().toUpperCase();
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600">${vcName}</span>`);
    }
    const hdr = mediaInfo.videoDynamicRange || mediaInfo.videoDynamicRangeType;
    if (hdr && hdr !== 'SDR' && hdr !== '') {
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">${hdr}</span>`);
    }
    const ac = mediaInfo.audioCodec || mediaInfo.audioFormat;
    if (ac) {
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600">${ac}</span>`);
    }
    const ach = mediaInfo.audioChannels;
    if (ach) {
        badges.push(`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600">${ach}ch</span>`);
    }
    return badges.join(' ');
};

// Start
document.addEventListener('DOMContentLoaded', init);
