/**
 * api.js - API calls via Tauri invoke (Rust backend proxy)
 * All HTTP calls go through the Rust backend to avoid CORS
 */

// Helper: build correct image URL from Sonarr/Radarr image objects
function getImageUrl(images, service, port) {
    if (!images || !images.length) return null;
    // Prefer poster, then any image
    const img = images.find(i => i.coverType === 'poster') || images[0];
    if (!img) return null;
    // remoteUrl is a full external URL (https://image.tmdb.org/...)
    if (img.remoteUrl && img.remoteUrl.startsWith('http')) {
        return img.remoteUrl;
    }
    // url is a local path (/MediaCover/...)
    if (img.url) {
        return `http://${Config.ip}:${port}${img.url}`;
    }
    return null;
}

const API = {
    // --- Sonarr ---
    fetchSonarrQueue: async () => {
        if (!Config.sonarrKey || !Config.enabled.sonarr) return [];
        try {
            const data = await tauriInvoke('fetch_sonarr_queue');
            if (data) {
                UI.updateStatus('sonarr', 'online', data.totalRecords || "0");
                return (data.records || []).map(r => ({
                    id: r.id,
                    client: 'Sonarr',
                    title: r.title || (r.series ? r.series.title : 'Unknown'),
                    quality: r.quality?.quality?.name || 'Unknown',
                    status: r.status || 'Unknown',
                    eta: r.timeleft || '-',
                    protocol: r.protocol,
                    size: r.size ? (r.size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '-',
                    sizeleft: r.sizeleft || 0,
                    progress: r.size > 0 ? Math.round(((r.size - (r.sizeleft || 0)) / r.size) * 100) : 0,
                    estimatedCompletionTime: r.estimatedCompletionTime || null,
                    seriesId: r.seriesId
                }));
            }
        } catch (e) {
            Logger.error('API', 'Sonarr queue fetch failed', e);
            UI.updateStatus('sonarr', 'warning', 'Err');
        }
        return [];
    },

    fetchSonarrLibrary: async () => {
        if (!Config.sonarrKey || !Config.enabled.sonarr) return;
        try {
            const data = await tauriInvoke('fetch_sonarr_series');
            if (data && Array.isArray(data)) {
                State.mediaLibrary.series = data.map(s => ({
                    id: s.id,
                    title: s.title,
                    seasonCount: s.seasonCount || s.seasons?.length || 0,
                    monitored: s.monitored,
                    status: s.status,
                    network: s.network,
                    year: s.year,
                    added: new Date(s.added).getTime(),
                    hasFile: s.statistics && s.statistics.episodeFileCount > 0,
                    images: s.images,
                    image: getImageUrl(s.images, 'sonarr', Config.sonarrPort)
                }));
                UI.updateStatus('sonarr', 'online', data.length);
                UI.renderLibrary('series');
            }
        } catch (e) {
            Logger.error('API', 'Sonarr library fetch failed', e);
            UI.updateStatus('sonarr', 'warning', 'Err');
        }
    },

    // --- Radarr ---
    fetchRadarrQueue: async () => {
        if (!Config.radarrKey || !Config.enabled.radarr) return [];
        try {
            const data = await tauriInvoke('fetch_radarr_queue');
            if (data) {
                UI.updateStatus('radarr', 'online', data.totalRecords || "0");
                return (data.records || []).map(r => ({
                    id: r.id,
                    client: 'Radarr',
                    title: r.title || (r.movie ? r.movie.title : 'Unknown'),
                    quality: r.quality?.quality?.name || 'Unknown',
                    status: r.status || 'Unknown',
                    eta: r.timeleft || '-',
                    protocol: r.protocol,
                    size: r.size ? (r.size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '-',
                    sizeleft: r.sizeleft || 0,
                    progress: r.size > 0 ? Math.round(((r.size - (r.sizeleft || 0)) / r.size) * 100) : 0,
                    estimatedCompletionTime: r.estimatedCompletionTime || null,
                    movieId: r.movieId
                }));
            }
        } catch (e) {
            Logger.error('API', 'Radarr queue fetch failed', e);
            UI.updateStatus('radarr', 'warning', 'Err');
        }
        return [];
    },

    fetchRadarrLibrary: async () => {
        if (!Config.radarrKey || !Config.enabled.radarr) return;
        try {
            const data = await tauriInvoke('fetch_radarr_movies');
            if (data && Array.isArray(data)) {
                State.mediaLibrary.movies = data.map(m => ({
                    id: m.id,
                    title: m.title,
                    year: m.year,
                    monitored: m.monitored,
                    status: m.hasFile ? 'Downloaded' : 'Missing',
                    hasFile: m.hasFile,
                    quality: m.movieFile?.quality?.quality?.name || 'Unknown',
                    added: new Date(m.added).getTime(),
                    images: m.images,
                    image: getImageUrl(m.images, 'radarr', Config.radarrPort)
                }));
                UI.updateStatus('radarr', 'online', data.length);
                UI.renderLibrary('movies');
            }
        } catch (e) {
            Logger.error('API', 'Radarr library fetch failed', e);
            UI.updateStatus('radarr', 'warning', 'Err');
        }
    },

    // --- Prowlarr ---
    fetchProwlarr: async () => {
        if (!Config.prowlarrKey || !Config.enabled.prowlarr) return [];
        try {
            const data = await tauriInvoke('fetch_prowlarr_indexers');
            if (data && Array.isArray(data)) {
                UI.updateStatus('prowlarr', 'online', data.length || "0");
                return data;
            }
        } catch (e) {
            Logger.error('API', 'Prowlarr fetch failed', e);
            UI.updateStatus('prowlarr', 'warning', 'Err');
        }
        return [];
    },

    // --- Jackett ---
    fetchJackett: async () => {
        if (!Config.jackettKey || !Config.enabled.jackett) return [];
        try {
            const data = await tauriInvoke('fetch_jackett_indexers');
            if (data && Array.isArray(data)) {
                UI.updateStatus('jackett', 'online', data.length || "0");
                return data;
            }
        } catch (e) {
            Logger.error('API', 'Jackett fetch failed', e);
            UI.updateStatus('jackett', 'warning', 'Err');
        }
        return [];
    },

    // --- Media Detail ---
    fetchSeriesDetail: async (id) => {
        try {
            return await tauriInvoke('fetch_sonarr_series_detail', { id });
        } catch (e) {
            Logger.error('API', 'Series detail fetch failed', e);
            return null;
        }
    },

    fetchMovieDetail: async (id) => {
        try {
            return await tauriInvoke('fetch_radarr_movie_detail', { id });
        } catch (e) {
            Logger.error('API', 'Movie detail fetch failed', e);
            return null;
        }
    },

    // --- Plex ---
    fetchPlex: async () => {
        if (!Config.plexToken || !Config.enabled.plex) return;
        try {
            // Sessions
            const sessionsData = await tauriInvoke('fetch_plex_sessions');
            if (sessionsData) {
                UI.updateStatus('plex', 'online');
                const size = sessionsData.MediaContainer?.size || 0;
                const elCount = document.getElementById('plex-count');
                if (elCount) elCount.innerText = size;
                const elLive = document.getElementById('plex-live-count');
                if (elLive) elLive.innerText = size;
                UI.renderPlexSessions(sessionsData.MediaContainer?.Metadata || []);

                const elBw = document.getElementById('plex-bandwidth');
                if (elBw) elBw.innerText = (size * 8.5).toFixed(1) + ' Mbps';
            }
        } catch (e) {
            Logger.error('API', 'Plex sessions fetch failed', e);
            UI.updateStatus('plex', 'warning', 'Err');
        }

        try {
            // Recent
            const recentData = await tauriInvoke('fetch_plex_recent');
            if (recentData) {
                UI.renderPlexRecent(recentData.MediaContainer?.Metadata || []);
            }
        } catch (e) {
            Logger.error('API', 'Plex recent fetch failed', e);
        }
    },

    // --- RDT Client ---
    fetchRDTClient: async () => {
        if (!Config.enabled.rdtclient) return [];
        try {
            const data = await tauriInvoke('fetch_rdtclient_torrents');
            if (data && Array.isArray(data)) {
                UI.updateStatus('rdtclient', 'online', data.length || "0");
                return data.map(t => ({
                    id: t.hash,
                    client: 'RDT-Client',
                    title: t.name || 'Unknown',
                    quality: 'N/A',
                    status: t.state || 'Unknown',
                    eta: (t.progress * 100).toFixed(1) + '%',
                    size: '-'
                }));
            }
        } catch (e) {
            Logger.error('API', 'RDT-Client fetch failed', e);
            UI.updateStatus('rdtclient', 'warning', 'Err');
        }
        return [];
    },

    // --- Flaresolverr ---
    fetchFlaresolverr: async () => {
        if (!Config.enabled.flaresolverr) return;
        try {
            const data = await tauriInvoke('fetch_flaresolverr_status');
            if (data && data.status === 'online') {
                UI.updateStatus('flaresolverr', 'online', 'OK');
                const el = document.getElementById('flare-status-text');
                if (el) el.innerText = 'OK';
            } else {
                UI.updateStatus('flaresolverr', 'warning', 'Err');
            }
        } catch (e) {
            UI.updateStatus('flaresolverr', 'warning', 'Err');
        }
    },

    // --- History ---
    fetchHistory: async () => {
        let history = [];

        if (Config.enabled.sonarr && Config.sonarrKey) {
            try {
                const sonarrHist = await tauriInvoke('fetch_sonarr_history');
                if (sonarrHist && sonarrHist.records) {
                    history.push(...sonarrHist.records.map(r => ({
                        ...r, source: 'Sonarr', title: r.series ? r.series.title : r.sourceTitle
                    })));
                }
            } catch (e) { Logger.error('API', 'Sonarr history failed', e); }
        }

        if (Config.enabled.radarr && Config.radarrKey) {
            try {
                const radarrHist = await tauriInvoke('fetch_radarr_history');
                if (radarrHist && radarrHist.records) {
                    history.push(...radarrHist.records.map(r => ({
                        ...r, source: 'Radarr', title: r.movie ? r.movie.title : r.sourceTitle
                    })));
                }
            } catch (e) { Logger.error('API', 'Radarr history failed', e); }
        }

        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        State.historyData = history.slice(0, 20);
        UI.renderHistory(State.historyData);

        if (window.Stats) {
            const stats = Stats.generateStats(history);
            Stats.renderCharts(stats);
        }
    },

    // --- Calendar ---
    fetchCalendar: async (startStr, endStr) => {
        let events = [];

        if (Config.enabled.sonarr && Config.sonarrKey) {
            try {
                const data = await tauriInvoke('fetch_sonarr_calendar', { start: startStr, end: endStr });
                if (data && Array.isArray(data)) {
                    events.push(...data.map(e => ({ ...e, type: 'series', date: e.airDate })));
                }
            } catch (e) { Logger.error('API', 'Sonarr calendar failed', e); }
        }

        if (Config.enabled.radarr && Config.radarrKey) {
            try {
                const data = await tauriInvoke('fetch_radarr_calendar', { start: startStr, end: endStr });
                if (data && Array.isArray(data)) {
                    events.push(...data.map(e => ({ ...e, type: 'movie', date: e.inCinemas || e.physicalRelease })));
                }
            } catch (e) { Logger.error('API', 'Radarr calendar failed', e); }
        }

        return events;
    },

    // --- Commands ---
    triggerServiceAction: async (service, commandName, id = null) => {
        try {
            if (service === 'sonarr') {
                await tauriInvoke('sonarr_command', { commandName, id });
            } else {
                await tauriInvoke('radarr_command', { commandName, id });
            }
            UI.showToast(`Commande ${commandName} envoyee a ${service}`, 'success');
        } catch (e) {
            UI.showToast(`Erreur commande ${service}: ${e}`, 'danger');
        }
    },

    // === ADVANCED CONTROLS ===

    // --- Sonarr: episode/season search ---
    searchEpisodes: async (episodeIds) => {
        try {
            await tauriInvoke('sonarr_episode_search', { episodeIds });
            UI.showToast(`Recherche lancee pour ${episodeIds.length} episode(s)`, 'success');
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); }
    },

    searchSeason: async (seriesId, seasonNumber) => {
        try {
            await tauriInvoke('sonarr_season_search', { seriesId, seasonNumber });
            UI.showToast(`Recherche saison ${seasonNumber} lancee`, 'success');
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); }
    },

    // --- Delete series/movie ---
    deleteSeries: async (id, deleteFiles = false) => {
        try {
            await tauriInvoke('delete_sonarr_series', { id, deleteFiles });
            UI.showToast('Serie supprimee', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    deleteMovie: async (id, deleteFiles = false) => {
        try {
            await tauriInvoke('delete_radarr_movie', { id, deleteFiles });
            UI.showToast('Film supprime', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    // --- Delete queue items ---
    deleteQueueItem: async (service, id, removeFromClient = true, blocklist = false) => {
        try {
            const cmd = service === 'sonarr' ? 'delete_sonarr_queue_item' : 'delete_radarr_queue_item';
            await tauriInvoke(cmd, { id, removeFromClient, blocklist });
            UI.showToast('Element supprime de la queue', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    // --- Delete files ---
    deleteEpisodeFile: async (id) => {
        try {
            await tauriInvoke('delete_sonarr_episode_file', { id });
            UI.showToast('Fichier episode supprime', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    deleteMovieFile: async (id) => {
        try {
            await tauriInvoke('delete_radarr_movie_file', { id });
            UI.showToast('Fichier film supprime', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    // --- Interactive search ---
    interactiveSearchEpisode: async (episodeId) => {
        try {
            return await tauriInvoke('sonarr_interactive_search', { episodeId, seriesId: null, seasonNumber: null });
        } catch (e) { UI.showToast(`Erreur recherche: ${e}`, 'danger'); return null; }
    },

    interactiveSearchSeason: async (seriesId, seasonNumber) => {
        try {
            return await tauriInvoke('sonarr_interactive_search', { episodeId: null, seriesId, seasonNumber });
        } catch (e) { UI.showToast(`Erreur recherche: ${e}`, 'danger'); return null; }
    },

    interactiveSearchMovie: async (movieId) => {
        try {
            return await tauriInvoke('radarr_interactive_search', { movieId });
        } catch (e) { UI.showToast(`Erreur recherche: ${e}`, 'danger'); return null; }
    },

    // --- Grab release ---
    grabRelease: async (service, guid, indexerId) => {
        try {
            const cmd = service === 'sonarr' ? 'sonarr_grab_release' : 'radarr_grab_release';
            await tauriInvoke(cmd, { guid, indexerId });
            UI.showToast('Telechargement lance !', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur grab: ${e}`, 'danger'); return false; }
    },

    // --- Toggle monitored ---
    toggleEpisodeMonitored: async (episodeId, monitored) => {
        try {
            await tauriInvoke('sonarr_toggle_episode_monitored', { episodeId, monitored });
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    // === PLEX WATCHLIST ===
    fetchPlexWatchlist: async () => {
        try {
            return await tauriInvoke('fetch_plex_watchlist');
        } catch (e) { Logger.error('API', 'Plex watchlist failed', e); return null; }
    },

    plexRemoveFromWatchlist: async (ratingKey) => {
        try {
            await tauriInvoke('plex_remove_from_watchlist', { ratingKey: String(ratingKey) });
            UI.showToast('Retire de la watchlist', 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    plexClearWatchlist: async () => {
        try {
            const result = await tauriInvoke('plex_clear_watchlist');
            const count = result?.removed || 0;
            UI.showToast(`Watchlist videe (${count} elements)`, 'success');
            return true;
        } catch (e) { UI.showToast(`Erreur: ${e}`, 'danger'); return false; }
    },

    // === DISK SPACE & HEALTH ===
    fetchDiskSpace: async () => {
        try {
            return await tauriInvoke('fetch_disk_space');
        } catch (e) { Logger.error('API', 'Disk space failed', e); return []; }
    },

    fetchSystemHealth: async () => {
        try {
            return await tauriInvoke('fetch_system_health');
        } catch (e) { Logger.error('API', 'System health failed', e); return []; }
    },

    // === PLEX DEEP INTEGRATION ===
    plexSearch: async (query) => {
        try {
            return await tauriInvoke('plex_search', { query });
        } catch (e) { Logger.error('API', 'Plex search failed', e); return null; }
    },

    fetchPlexLibraries: async () => {
        try {
            return await tauriInvoke('fetch_plex_libraries');
        } catch (e) { Logger.error('API', 'Plex libraries failed', e); return null; }
    },

    fetchPlexMetadata: async (ratingKey) => {
        try {
            return await tauriInvoke('fetch_plex_metadata', { ratingKey: String(ratingKey) });
        } catch (e) { Logger.error('API', 'Plex metadata failed', e); return null; }
    },

    fetchPlexHistory: async (limit = 50) => {
        try {
            return await tauriInvoke('fetch_plex_history', { limit });
        } catch (e) { Logger.error('API', 'Plex history failed', e); return null; }
    },

    fetchPlexLibraryItems: async (sectionId, start = 0, size = 50) => {
        try {
            return await tauriInvoke('fetch_plex_library_items', { sectionId: String(sectionId), start, size });
        } catch (e) { Logger.error('API', 'Plex library items failed', e); return null; }
    },

    fetchEpisodeFiles: async (seriesId) => {
        try {
            return await tauriInvoke('fetch_sonarr_episode_files', { seriesId });
        } catch (e) { Logger.error('API', 'Episode files failed', e); return null; }
    }
};
