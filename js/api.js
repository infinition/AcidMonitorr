/**
 * api.js
 * Universal Fetch Wrapper and Service API calls
 */

// Universal Fetch Wrapper
async function apiFetch(url, options = {}, retries = 3) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const start = Date.now();

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);

        const duration = Date.now() - start;
        Logger.api('FETCH', url, response.status, duration);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(id);
        const duration = Date.now() - start;
        Logger.error('FETCH', `Failed to fetch ${url}`, error);

        if (retries > 0 && error.name !== 'AbortError') {
            Logger.warn('FETCH', `Retrying... (${retries} attempts left)`);
            await new Promise(r => setTimeout(r, 1000));
            return apiFetch(url, options, retries - 1);
        }

        // Show error banner if final failure
        if (window.UI && window.UI.showErrorBanner) {
            // Extract service name from URL for better error message
            let service = 'Unknown';
            if (url.includes(':8989')) service = 'Sonarr';
            else if (url.includes(':8310')) service = 'Radarr';
            else if (url.includes(':9696')) service = 'Prowlarr';
            else if (url.includes(':32400')) service = 'Plex';

            window.UI.showErrorBanner(service, `Connection failed: ${error.message}`);
        }

        return null; // Return null on failure
    }
}

const API = {
    // --- Sonarr ---
    fetchSonarrQueue: async () => {
        if (!Config.sonarrKey || !Config.enabled.sonarr) return [];
        const data = await apiFetch(`http://${Config.ip}:8989/api/v3/queue?apikey=${Config.sonarrKey}`);
        if (data) {
            UI.updateStatus('sonarr', 'online', data.totalRecords || "0");
            return data.records.map(r => ({
                id: r.id,
                client: 'Sonarr',
                title: r.title || (r.series ? r.series.title : 'Unknown'),
                quality: r.quality?.quality?.name || 'Unknown',
                status: r.status || 'Unknown',
                eta: r.timeleft || '-',
                protocol: r.protocol
            }));
        }
        UI.updateStatus('sonarr', 'warning', 'Err');
        return [];
    },

    fetchSonarrLibrary: async () => {
        if (!Config.sonarrKey || !Config.enabled.sonarr) return [];
        const data = await apiFetch(`http://${Config.ip}:8989/api/v3/series?apikey=${Config.sonarrKey}`);
        if (data) {
            State.mediaLibrary.series = data.map(s => ({
                id: s.id,
                title: s.title,
                seasonCount: s.seasonCount || s.seasons?.length || 0,
                monitored: s.monitored,
                status: s.status,
                network: s.network,
                added: new Date(s.added).getTime(),
                image: s.images && s.images.length ? `http://${Config.ip}:8989${s.images[0].url}` : null
            }));
            UI.renderLibrary('series');
        }
    },

    // --- Radarr ---
    fetchRadarrQueue: async () => {
        if (!Config.radarrKey || !Config.enabled.radarr) return [];
        const data = await apiFetch(`http://${Config.ip}:8310/api/v3/queue?apikey=${Config.radarrKey}`);
        if (data) {
            UI.updateStatus('radarr', 'online', data.totalRecords || "0");
            return data.records.map(r => ({
                id: r.id,
                client: 'Radarr',
                title: r.title || (r.movie ? r.movie.title : 'Unknown'),
                quality: r.quality?.quality?.name || 'Unknown',
                status: r.status || 'Unknown',
                eta: r.timeleft || '-',
                protocol: r.protocol
            }));
        }
        UI.updateStatus('radarr', 'warning', 'Err');
        return [];
    },

    fetchRadarrLibrary: async () => {
        if (!Config.radarrKey || !Config.enabled.radarr) return [];
        const data = await apiFetch(`http://${Config.ip}:8310/api/v3/movie?apikey=${Config.radarrKey}`);
        if (data) {
            State.mediaLibrary.movies = data.map(m => ({
                id: m.id,
                title: m.title,
                year: m.year,
                monitored: m.monitored,
                status: m.hasFile ? 'Downloaded' : 'Missing',
                quality: m.movieFile?.quality?.quality?.name || 'Unknown',
                added: new Date(m.added).getTime(),
                image: m.images && m.images.length ? `http://${Config.ip}:8310${m.images[0].url}` : null
            }));
            UI.renderLibrary('movie');
        }
    },

    // --- Prowlarr ---
    fetchProwlarr: async () => {
        if (!Config.prowlarrKey || !Config.enabled.prowlarr) return;
        const data = await apiFetch(`http://${Config.ip}:9696/api/v1/indexer?apikey=${Config.prowlarrKey}`);
        if (data) {
            UI.updateStatus('prowlarr', 'online', data.length || "0");
            document.getElementById('dash-jackett-count').innerText = data.length || "0";
            UI.renderIndexers(data);
        } else {
            UI.updateStatus('prowlarr', 'warning', 'Err');
        }
    },

    // --- Plex ---
    fetchPlex: async () => {
        if (!Config.plexToken || !Config.enabled.plex) return;

        // 1. Sessions
        const sessionsData = await apiFetch(`http://${Config.ip}:32400/status/sessions?X-Plex-Token=${Config.plexToken}`, { headers: { 'Accept': 'application/json' } });
        if (sessionsData) {
            UI.updateStatus('plex', 'online');
            const size = sessionsData.MediaContainer.size || 0;
            document.getElementById('plex-count').innerText = size;
            document.getElementById('plex-live-count').innerText = size;
            UI.renderPlexSessions(sessionsData.MediaContainer.Metadata || []);

            // Bandwidth calc
            document.getElementById('plex-bandwidth').innerText = (size * 8.5).toFixed(1) + ' Mbps';
        } else {
            UI.updateStatus('plex', 'warning', 'Err');
        }

        // 2. Recently Added
        const recentData = await apiFetch(`http://${Config.ip}:32400/library/recentlyAdded?X-Plex-Token=${Config.plexToken}&limit=10`, { headers: { 'Accept': 'application/json' } });
        if (recentData) {
            UI.renderPlexRecent(recentData.MediaContainer.Metadata || []);
        }
    },

    // --- RDT Client ---
    fetchRDTClient: async () => {
        if (!Config.enabled.rdtclient) return [];
        const data = await apiFetch(`http://${Config.ip}:6500/api/v2/torrents/info`);
        if (data) {
            UI.updateStatus('rdtclient', 'online', data.length || "0");
            if (Array.isArray(data)) {
                return data.map(t => ({
                    id: t.hash,
                    client: 'RDT-Client',
                    title: t.name || 'Unknown',
                    quality: 'N/A',
                    status: t.state || 'Unknown',
                    eta: (t.progress * 100).toFixed(1) + '%'
                }));
            }
        } else {
            UI.updateStatus('rdtclient', 'warning', 'Err');
        }
        return [];
    },

    // --- History (New) ---
    fetchHistory: async () => {
        let history = [];

        if (Config.enabled.sonarr && Config.sonarrKey) {
            const sonarrHist = await apiFetch(`http://${Config.ip}:8989/api/v3/history?pageSize=20&apikey=${Config.sonarrKey}`);
            if (sonarrHist && sonarrHist.records) {
                history.push(...sonarrHist.records.map(r => ({
                    ...r, source: 'Sonarr', title: r.series ? r.series.title : r.sourceTitle
                })));
            }
        }

        if (Config.enabled.radarr && Config.radarrKey) {
            const radarrHist = await apiFetch(`http://${Config.ip}:8310/api/v3/history?pageSize=20&apikey=${Config.radarrKey}`);
            if (radarrHist && radarrHist.records) {
                history.push(...radarrHist.records.map(r => ({
                    ...r, source: 'Radarr', title: r.movie ? r.movie.title : r.sourceTitle
                })));
            }
        }

        // Sort by date desc
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        State.historyData = history.slice(0, 20);
        UI.renderHistory(State.historyData);

        // Generate Stats
        if (window.Stats) {
            const stats = Stats.generateStats(history);
            Stats.renderCharts(stats);
        }
    },

    // --- Calendar (New) ---
    fetchCalendar: async (startStr, endStr) => {
        let events = [];

        if (Config.enabled.sonarr && Config.sonarrKey) {
            const data = await apiFetch(`http://${Config.ip}:8989/api/v3/calendar?start=${startStr}&end=${endStr}&apikey=${Config.sonarrKey}`);
            if (data) events.push(...data.map(e => ({ ...e, type: 'series', date: e.airDate })));
        }

        if (Config.enabled.radarr && Config.radarrKey) {
            const data = await apiFetch(`http://${Config.ip}:8310/api/v3/calendar?start=${startStr}&end=${endStr}&apikey=${Config.radarrKey}`);
            if (data) events.push(...data.map(e => ({ ...e, type: 'movie', date: e.inCinemas || e.physicalRelease })));
        }

        return events;
    },

    // --- Commands ---
    triggerServiceAction: async (service, commandName, id = null) => {
        const endpoint = service === 'sonarr' ? 8989 : 8310;
        const apiKey = service === 'sonarr' ? Config.sonarrKey : Config.radarrKey;

        if (!apiKey) { UI.showToast(`Clé API manquante pour ${service}`, 'danger'); return; }

        const payload = { name: commandName };
        if (id) {
            if (commandName === 'RescanMovie') payload.movieId = id;
            if (commandName === 'RefreshSeries') payload.seriesId = id;
        }

        const res = await apiFetch(`http://${Config.ip}:${endpoint}/api/v3/command?apikey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res) {
            UI.showToast(`Commande ${commandName} envoyée à ${service}`, 'success');
            Logger.info('CMD', `Sent ${commandName} to ${service}`);
        } else {
            UI.showToast(`Erreur commande ${service}`, 'danger');
        }
    }
};
