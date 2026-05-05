/**
 * config.js - Configuration and State Management (Tauri)
 * Config is loaded from / saved to disk via Rust backend
 */

// Tauri invoke helper - lazy access, never crashes
// Tauri invoke helper - fallback to fetch for web mode
async function tauriInvoke(cmd, args) {
    // 1. Try Tauri
    try {
        if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
            return await window.__TAURI__.core.invoke(cmd, args);
        }
    } catch (e) {
        console.warn('[TAURI] invoke error, falling back to fetch:', cmd, e);
    }

    // 2. Fallback to Web API
    try {
        const response = await fetch(`/api/${cmd}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args || {})
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('[WEB] API error for', cmd, e);
        return null;
    }
}

const Config = {
    ip: '192.168.1.75',
    sonarrKey: '',
    radarrKey: '',
    jackettKey: '',
    prowlarrKey: '',
    plexToken: '',
    isDemo: false,
    refreshInterval: 5,
    sonarrPort: 8989,
    radarrPort: 8310,
    prowlarrPort: 9696,
    jackettPort: 9117,
    plexPort: 32400,
    flaresolverrPort: 8191,
    rdtclientPort: 6500,

    enabled: {
        sonarr: true,
        radarr: true,
        jackett: false,
        prowlarr: false,
        plex: false,
        flaresolverr: false,
        rdtclient: false,
    },

    activeSection: 'dashboard',

    // Load config from Rust backend
    load: async function () {
        try {
            const cfg = await tauriInvoke('get_config');
            if (cfg) {
                this.ip = cfg.ip || this.ip;
                this.sonarrKey = cfg.sonarrKey || '';
                this.radarrKey = cfg.radarrKey || '';
                this.jackettKey = cfg.jackettKey || '';
                this.prowlarrKey = cfg.prowlarrKey || '';
                this.plexToken = cfg.plexToken || '';
                this.isDemo = cfg.isDemo || false;
                this.refreshInterval = cfg.refreshInterval || 5;
                this.sonarrPort = cfg.sonarrPort || 8989;
                this.radarrPort = cfg.radarrPort || 8310;
                this.prowlarrPort = cfg.prowlarrPort || 9696;
                this.jackettPort = cfg.jackettPort || 9117;
                this.plexPort = cfg.plexPort || 32400;
                this.flaresolverrPort = cfg.flaresolverrPort || 8191;
                this.rdtclientPort = cfg.rdtclientPort || 6500;
                this.activeSection = cfg.activeSection || 'dashboard';

                if (cfg.enabled) {
                    this.enabled.sonarr = cfg.enabled.sonarr !== false;
                    this.enabled.radarr = cfg.enabled.radarr !== false;
                    this.enabled.jackett = cfg.enabled.jackett === true;
                    this.enabled.prowlarr = cfg.enabled.prowlarr === true;
                    this.enabled.plex = cfg.enabled.plex === true;
                    this.enabled.flaresolverr = cfg.enabled.flaresolverr === true;
                    this.enabled.rdtclient = cfg.enabled.rdtclient === true;
                }
                Logger.info('CONFIG', 'Configuration loaded from disk');
            }
        } catch (e) {
            Logger.warn('CONFIG', 'Could not load config, using defaults', e);
        }
    },

    // Save config to Rust backend (persisted to disk)
    save: async function () {
        try {
            await tauriInvoke('save_config', {
                config: {
                    ip: this.ip,
                    sonarrKey: this.sonarrKey,
                    radarrKey: this.radarrKey,
                    jackettKey: this.jackettKey,
                    prowlarrKey: this.prowlarrKey,
                    plexToken: this.plexToken,
                    isDemo: this.isDemo,
                    enabled: this.enabled,
                    activeSection: this.activeSection,
                    refreshInterval: this.refreshInterval,
                    sonarrPort: this.sonarrPort,
                    radarrPort: this.radarrPort,
                    prowlarrPort: this.prowlarrPort,
                    jackettPort: this.jackettPort,
                    plexPort: this.plexPort,
                    flaresolverrPort: this.flaresolverrPort,
                    rdtclientPort: this.rdtclientPort,
                }
            });
            Logger.info('CONFIG', 'Configuration saved to disk');
        } catch (e) {
            Logger.error('CONFIG', 'Failed to save config', e);
        }
    }
};

// Global State
const State = {
    mediaLibrary: { movies: [], series: [], indexers: [] },
    historyData: [],
    activeQueue: [],
    isFullRefreshing: false,
    isLiveRefreshing: false,

    ui: {
        movies: { sort: 'date_desc', filter: '', gridSize: 6 },
        series: { sort: 'date_desc', filter: '', gridSize: 6 },
        activeSection: 'dashboard'
    },

    currentAddService: null,
    searchResultsData: []
};
