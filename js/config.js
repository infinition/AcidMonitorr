/**
 * config.js
 * Configuration and State Management
 */

const Config = {
    ip: localStorage.getItem('acid_ip') || '192.168.1.75',
    sonarrKey: localStorage.getItem('acid_sonarr_key') || '',
    radarrKey: localStorage.getItem('acid_radarr_key') || '',
    jackettKey: localStorage.getItem('acid_jackett_key') || '',
    prowlarrKey: localStorage.getItem('acid_prowlarr_key') || '',
    plexToken: localStorage.getItem('acid_plex_token') || '',

    enabled: {
        sonarr: localStorage.getItem('acid_enable_sonarr') !== 'false',
        radarr: localStorage.getItem('acid_enable_radarr') !== 'false',
        jackett: localStorage.getItem('acid_enable_jackett') !== 'false',
        prowlarr: localStorage.getItem('acid_enable_prowlarr') === 'true',
        plex: localStorage.getItem('acid_enable_plex') === 'true',
        flaresolverr: localStorage.getItem('acid_enable_flaresolverr') !== 'false',
        rdtclient: localStorage.getItem('acid_enable_rdtclient') !== 'false',
    },

    isDemo: localStorage.getItem('acid_demo') === 'true',

    // Save current config to localStorage
    save: function () {
        localStorage.setItem('acid_ip', this.ip);
        localStorage.setItem('acid_sonarr_key', this.sonarrKey);
        localStorage.setItem('acid_radarr_key', this.radarrKey);
        localStorage.setItem('acid_jackett_key', this.jackettKey);
        localStorage.setItem('acid_prowlarr_key', this.prowlarrKey);
        localStorage.setItem('acid_plex_token', this.plexToken);
        localStorage.setItem('acid_demo', this.isDemo);

        Object.keys(this.enabled).forEach(key => {
            localStorage.setItem(`acid_enable_${key}`, this.enabled[key]);
        });

        Logger.info('CONFIG', 'Configuration saved');
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
