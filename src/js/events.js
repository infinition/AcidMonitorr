/**
 * events.js - Event delegation system (replaces inline onclick handlers blocked by CSP)
 * All click/change events are handled here via data-action attributes.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- CLICK delegation ---
    document.body.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;

        e.preventDefault();
        const action = el.dataset.action;
        const param = el.dataset.param;
        const param2 = el.dataset.param2;

        switch (action) {
            // Navigation
            case 'show-section':
                if (typeof showSection === 'function') showSection(param);
                break;

            // Settings
            case 'toggle-settings':
                if (typeof toggleSettings === 'function') toggleSettings();
                break;
            case 'save-config':
                if (typeof saveConfig === 'function') saveConfig();
                break;

            // Refresh
            case 'refresh':
                if (typeof refreshFullData === 'function') refreshFullData(true);
                break;

            // Grid zoom
            case 'grid-zoom':
                if (typeof changeGridSize === 'function') changeGridSize(param, parseInt(param2));
                break;

            // Add content
            case 'open-add-modal':
                if (typeof openAddModal === 'function') openAddModal(param);
                break;
            case 'perform-lookup':
                if (typeof performLookup === 'function') performLookup();
                break;
            case 'add-media':
                if (typeof addMedia === 'function') addMedia(parseInt(param));
                break;

            // Modals close
            case 'close-modal':
                const modal = document.getElementById(param);
                if (modal) modal.classList.add('hidden');
                break;
            case 'close-modal-backdrop':
                const backdrop = el.closest('.fixed');
                if (backdrop) backdrop.classList.add('hidden');
                break;

            // Library filter
            case 'filter-library':
                if (typeof filterLibrary === 'function') filterLibrary(param, param2);
                break;

            // Calendar
            case 'change-month':
                if (typeof changeMonth === 'function') changeMonth(parseInt(param));
                break;

            // Service actions
            case 'trigger-action':
                if (typeof API !== 'undefined' && API.triggerServiceAction) {
                    API.triggerServiceAction(param, param2, el.dataset.id ? parseInt(el.dataset.id) : null);
                }
                break;

            // Media detail
            case 'open-detail':
                if (typeof UI !== 'undefined' && UI.openMediaDetail) {
                    UI.openMediaDetail(parseInt(el.dataset.id), param);
                }
                break;

            // Error banner close
            case 'close-error':
                const banner = el.closest('.error-banner');
                if (banner) banner.classList.remove('visible');
                break;

            // Notifications
            case 'clear-notifications':
                if (typeof Notifications !== 'undefined') {
                    Notifications.items = [];
                    Notifications.render();
                }
                break;

            // Search from mega-search
            case 'mega-search': {
                const searchInput = document.getElementById('mega-search');
                if (searchInput && typeof handleSearch === 'function') handleSearch(searchInput.value);
                break;
            }

            // --- Advanced controls ---
            case 'search-episode':
                if (API.searchEpisodes) API.searchEpisodes([parseInt(el.dataset.id)]);
                break;

            case 'search-season':
                if (API.searchSeason) API.searchSeason(parseInt(el.dataset.id), parseInt(param));
                break;

            case 'search-series':
                if (API.triggerServiceAction) API.triggerServiceAction('sonarr', 'SeriesSearch', parseInt(el.dataset.id));
                break;

            case 'search-movie':
                if (API.triggerServiceAction) API.triggerServiceAction('radarr', 'MoviesSearch', parseInt(el.dataset.id));
                break;

            case 'delete-series':
                if (confirm('Supprimer cette serie ? ' + (param2 === 'true' ? '(fichiers inclus)' : '(sans fichiers)'))) {
                    API.deleteSeries(parseInt(el.dataset.id), param2 === 'true').then(ok => {
                        if (ok) { document.getElementById('detail-modal')?.classList.add('hidden'); refreshFullData(false); }
                    });
                }
                break;

            case 'delete-movie':
                if (confirm('Supprimer ce film ? ' + (param2 === 'true' ? '(fichiers inclus)' : '(sans fichiers)'))) {
                    API.deleteMovie(parseInt(el.dataset.id), param2 === 'true').then(ok => {
                        if (ok) { document.getElementById('detail-modal')?.classList.add('hidden'); refreshFullData(false); }
                    });
                }
                break;

            case 'delete-queue-item':
                if (confirm('Supprimer de la queue ?')) {
                    API.deleteQueueItem(param, parseInt(el.dataset.id), true, param2 === 'blocklist').then(ok => {
                        if (ok) refreshFullData(false);
                    });
                }
                break;

            case 'delete-episode-file':
                if (confirm('Supprimer le fichier de cet episode ?')) {
                    API.deleteEpisodeFile(parseInt(el.dataset.id)).then(ok => {
                        if (ok) UI.showToast('Fichier supprime', 'success');
                    });
                }
                break;

            case 'delete-movie-file':
                if (confirm('Supprimer le fichier de ce film ?')) {
                    API.deleteMovieFile(parseInt(el.dataset.id)).then(ok => {
                        if (ok) UI.showToast('Fichier supprime', 'success');
                    });
                }
                break;

            case 'interactive-search':
                if (UI.openInteractiveSearch) UI.openInteractiveSearch(param, parseInt(el.dataset.id), el.dataset.season ? parseInt(el.dataset.season) : null);
                break;

            case 'grab-release':
                API.grabRelease(param, el.dataset.guid, parseInt(el.dataset.indexer)).then(ok => {
                    if (ok) document.getElementById('search-modal')?.classList.add('hidden');
                });
                break;

            case 'grab-release-idx': {
                const releases = window._interactiveReleases;
                const idx = parseInt(param2);
                if (releases && releases[idx]) {
                    const rel = releases[idx];
                    API.grabRelease(param, rel.guid, rel.indexerId).then(ok => {
                        if (ok) document.getElementById('search-modal')?.classList.add('hidden');
                    });
                }
                break;
            }

            case 'plex-clear-watchlist':
                if (confirm('Vider toute la watchlist Plex ?')) {
                    API.plexClearWatchlist().then(() => refreshFullData(false));
                }
                break;

            case 'plex-remove-watchlist':
                API.plexRemoveFromWatchlist(el.dataset.id).then(ok => {
                    if (ok) el.closest('.watchlist-item')?.remove();
                });
                break;

            case 'search-external':
                if (typeof handleSearch === 'function') {
                    document.getElementById('global-search-results')?.classList.add('hidden');
                    handleSearch(param);
                }
                break;

            case 'plex-search-go': {
                const pq = document.getElementById('plex-search-input');
                if (pq && UI.performPlexSearch) UI.performPlexSearch(pq.value);
                break;
            }

            case 'plex-view-detail':
                if (UI.openPlexDetail) UI.openPlexDetail(el.dataset.id);
                break;

            case 'import-list-sync':
                if (confirm(`Lancer la synchronisation des listes d'import ${param} ?`)) {
                    API.triggerServiceAction(param, 'ImportListSync');
                }
                break;

            case 'plex-search-mode': {
                window._plexSearchMode = param;
                // Update tabs visual
                document.querySelectorAll('[data-action="plex-search-mode"]').forEach(b => {
                    if (b.dataset.param === param) {
                        b.className = 'plex-tab-active px-3 py-1 rounded text-xs font-bold bg-acid-plex/20 text-acid-plex border border-acid-plex/30';
                    } else {
                        b.className = 'px-3 py-1 rounded text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700';
                    }
                });
                // Re-trigger search if input has value
                const psi = document.getElementById('plex-search-input');
                if (psi && psi.value.length >= 2 && UI.performPlexSearch) UI.performPlexSearch(psi.value);
                break;
            }

            case 'add-from-discover':
                if (typeof addFromDiscover === 'function') addFromDiscover(param, parseInt(param2));
                break;

            case 'play-trailer': {
                const title = el.dataset.title || '';
                const year = el.dataset.year || '';
                const searchQ = encodeURIComponent(`${title} ${year} official trailer`);
                // Open YouTube search in browser
                if (window.__TAURI__?.shell?.open) {
                    window.__TAURI__.shell.open(`https://www.youtube.com/results?search_query=${searchQ}`);
                } else {
                    window.open(`https://www.youtube.com/results?search_query=${searchQ}`, '_blank');
                }
                break;
            }

            default:
                console.warn('[EVENTS] Unknown action:', action, param, param2);
        }
    });

    // --- CHANGE delegation (selects) ---
    document.body.addEventListener('change', (e) => {
        const el = e.target.closest('[data-on-change]');
        if (!el) return;

        const action = el.dataset.onChange;
        const param = el.dataset.param;

        switch (action) {
            case 'sort-library':
                if (typeof sortLibrary === 'function') sortLibrary(param, el.value);
                break;
        }
    });

    // --- INPUT delegation (real-time search) ---
    const megaSearch = document.getElementById('mega-search');
    if (megaSearch) {
        megaSearch.addEventListener('input', (e) => {
            if (typeof globalSearch === 'function') globalSearch(e.target.value);
        });
    }

    // --- KEYPRESS delegation ---
    document.body.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        const el = e.target;

        if (el.id === 'mega-search') {
            // Enter = search for NEW content to add
            const results = document.getElementById('global-search-results');
            if (results) results.classList.add('hidden');
            if (typeof handleSearch === 'function') handleSearch(el.value);
        }
        if (el.id === 'add-search-input') {
            if (typeof performLookup === 'function') performLookup();
        }
        if (el.id === 'plex-search-input') {
            if (UI && UI.performPlexSearch) UI.performPlexSearch(el.value);
        }
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('search-wrapper');
        const results = document.getElementById('global-search-results');
        if (results && wrapper && !wrapper.contains(e.target)) {
            results.classList.add('hidden');
        }
    });

    // --- search-external action (from search results "Rechercher en ligne") ---
    // Already handled by the main click delegation above
});
