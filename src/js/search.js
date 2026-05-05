/**
 * search.js - Search and Add Content Logic (Tauri)
 */

function openAddModal(service) {
    State.currentAddService = service;
    document.getElementById('add-modal-title').innerHTML = `Ajouter <span class="${service === 'radarr' ? 'text-yellow-500' : 'text-acid-accent'}">${service === 'radarr' ? 'Film' : 'Serie'}</span>`;
    document.getElementById('add-results').innerHTML = '<div class="text-center text-gray-500 col-span-full py-10 flex flex-col items-center"><i class="fas fa-keyboard text-4xl mb-3 opacity-30"></i><p>Recherchez un titre...</p></div>';
    document.getElementById('add-search-input').value = '';
    document.getElementById('add-modal').classList.remove('hidden');
    document.getElementById('add-search-input').focus();
}

async function performLookup() {
    const query = document.getElementById('add-search-input').value.trim();
    if (!query) return;

    const container = document.getElementById('add-results');
    container.innerHTML = '<div class="col-span-full text-center text-acid-green py-10"><i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><br>Recherche en cours...</div>';

    try {
        let data;
        if (State.currentAddService === 'sonarr') {
            data = await tauriInvoke('search_sonarr_series', { term: query });
        } else {
            data = await tauriInvoke('search_radarr_movies', { term: query });
        }

        if (data && Array.isArray(data)) {
            State.searchResultsData = data;
            renderSearchResults(data);
        } else {
            throw new Error("Lookup failed");
        }
    } catch (e) {
        container.innerHTML = `<div class="text-red-500 text-center col-span-full">Erreur: ${e}. Verifiez les logs.</div>`;
    }
}

function renderSearchResults(data) {
    const container = document.getElementById('add-results');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center col-span-full">Aucun resultat trouve.</div>';
        return;
    }

    container.innerHTML = data.map((item, idx) => {
        const img = item.images && item.images.length > 0 ? item.images[0].remoteUrl || item.images[0].url : '';
        const year = item.year || 'N/A';
        const exists = item.id !== undefined && item.id !== 0;
        const overview = item.overview ? (item.overview.length > 150 ? item.overview.substring(0, 150) + '...' : item.overview) : 'Aucun synopsis.';
        const rating = item.ratings ? (item.ratings.value * 10).toFixed(0) + '%' : 'N/A';

        return `
        <div class="flex bg-gray-900 border border-gray-700 rounded-lg p-3 gap-4 hover:border-acid-green transition-all group h-48">
            <div class="w-24 flex-shrink-0 relative">
                <img src="${img}" class="h-full w-full object-cover rounded bg-gray-800" onerror="this.style.display='none'">
                <div class="absolute top-1 right-1 bg-black/80 text-acid-green text-[10px] px-1.5 py-0.5 rounded font-bold">${rating}</div>
            </div>
            <div class="flex-1 flex flex-col">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-white text-base leading-tight">${item.title}</h4>
                        <div class="text-xs text-gray-400 mt-0.5">${year} - ${item.network || 'Film'}</div>
                    </div>
                    ${exists ? '<span class="text-acid-green text-xs"><i class="fas fa-check"></i></span>' : ''}
                </div>
                <p class="text-xs text-gray-500 mt-2 flex-1 overflow-hidden leading-relaxed">${overview}</p>
                <button data-action="add-media" data-param="${idx}" class="mt-3 w-full py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${exists ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-acid-green text-black hover:bg-white'}" ${exists ? 'disabled' : ''}>
                    ${exists ? 'Dans la bibliotheque' : '<i class="fas fa-plus mr-1"></i> Ajouter'}
                </button>
            </div>
        </div>`;
    }).join('');
}

async function addMedia(index) {
    const item = State.searchResultsData[index];
    if (!item) return;

    UI.showToast("Configuration de l'ajout...", "info");

    try {
        let rootFolderData, qualityProfileData;

        if (State.currentAddService === 'sonarr') {
            rootFolderData = await tauriInvoke('fetch_sonarr_rootfolder');
            qualityProfileData = await tauriInvoke('fetch_sonarr_qualityprofile');
        } else {
            rootFolderData = await tauriInvoke('fetch_radarr_rootfolder');
            qualityProfileData = await tauriInvoke('fetch_radarr_qualityprofile');
        }

        const rootFolderPath = rootFolderData && rootFolderData[0]?.path;
        const qualityProfileId = qualityProfileData && qualityProfileData[0]?.id;

        if (!rootFolderPath || !qualityProfileId) {
            throw new Error("Impossible de trouver un dossier racine ou un profil qualite.");
        }

        const payload = {
            title: item.title,
            qualityProfileId: qualityProfileId,
            titleSlug: item.titleSlug,
            images: item.images,
            tmdbId: item.tmdbId,
            year: item.year,
            rootFolderPath: rootFolderPath,
            monitored: true,
            addOptions: { searchForMovie: true }
        };

        if (State.currentAddService === 'sonarr') {
            delete payload.tmdbId;
            payload.tvdbId = item.tvdbId;
            payload.seasons = item.seasons;
            payload.addOptions = { searchForMissingEpisodes: true };
        }

        let result;
        if (State.currentAddService === 'sonarr') {
            result = await tauriInvoke('add_sonarr_series', { payload });
        } else {
            result = await tauriInvoke('add_radarr_movie', { payload });
        }

        if (result) {
            UI.showToast(`${item.title} ajoute avec succes !`, 'success');
            document.getElementById('add-modal').classList.add('hidden');
            if (window.refreshFullData) window.refreshFullData(false);
        }
    } catch (e) {
        console.error(e);
        UI.showToast(`Echec de l'ajout: ${e}`, 'danger');
    }
}

function handleSearch(term) {
    if (!term) return;
    openAddModal('radarr');
    document.getElementById('add-search-input').value = term;
    performLookup();
}

// Add content from discover search results (Plex page)
async function addFromDiscover(type, index) {
    let item;
    if (type === 'movie') {
        item = window._discoverMovies?.[index];
    } else {
        item = window._discoverSeries?.[index];
    }
    if (!item) { UI.showToast('Element introuvable', 'danger'); return; }

    UI.showToast(`Ajout de "${item.title}"...`, 'info');

    try {
        let rootFolderData, qualityProfileData;
        if (type === 'series') {
            rootFolderData = await tauriInvoke('fetch_sonarr_rootfolder');
            qualityProfileData = await tauriInvoke('fetch_sonarr_qualityprofile');
        } else {
            rootFolderData = await tauriInvoke('fetch_radarr_rootfolder');
            qualityProfileData = await tauriInvoke('fetch_radarr_qualityprofile');
        }

        const rootFolderPath = rootFolderData?.[0]?.path;
        const qualityProfileId = qualityProfileData?.[0]?.id;
        if (!rootFolderPath || !qualityProfileId) throw new Error('Dossier racine ou profil qualite introuvable');

        const payload = {
            title: item.title,
            qualityProfileId,
            titleSlug: item.titleSlug,
            images: item.images,
            year: item.year,
            rootFolderPath,
            monitored: true,
        };

        if (type === 'series') {
            payload.tvdbId = item.tvdbId;
            payload.seasons = item.seasons;
            payload.addOptions = { searchForMissingEpisodes: true };
            await tauriInvoke('add_sonarr_series', { payload });
        } else {
            payload.tmdbId = item.tmdbId;
            payload.addOptions = { searchForMovie: true };
            await tauriInvoke('add_radarr_movie', { payload });
        }

        UI.showToast(`"${item.title}" ajoute avec succes !`, 'success');
        if (window.refreshFullData) refreshFullData(false);
    } catch (e) {
        UI.showToast(`Echec: ${e}`, 'danger');
    }
}
