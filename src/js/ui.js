/**
 * ui.js - UI Renderers and DOM Manipulation (Tauri)
 */

// Generate a placeholder poster SVG as data URI
function posterFallback(title, year) {
    const initials = (title || '?').split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
    const colors = ['#1a1a2e','#16213e','#0f3460','#1b1b2f','#2d132c','#1a1a1a'];
    const bg = colors[Math.abs((title || '').length) % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
        <rect width="300" height="450" fill="${bg}"/>
        <text x="150" y="200" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="#ccff00">${initials}</text>
        <text x="150" y="260" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#888">${(title || '').substring(0, 25)}</text>
        ${year ? `<text x="150" y="285" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#555">${year}</text>` : ''}
        <rect x="20" y="380" width="260" height="2" rx="1" fill="#333"/>
        <text x="150" y="420" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#444">ACIDMONITORR</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

const UI = {
    showErrorBanner: (service, message) => {
        let banner = document.getElementById('error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'error-banner';
            banner.className = 'error-banner';
            banner.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span id="error-text"></span>
                <button data-action="close-error"><i class="fas fa-times"></i></button>
            `;
            document.body.appendChild(banner);
        }
        document.getElementById('error-text').innerText = `[${service}] ${message}`;
        banner.classList.add('visible');
        setTimeout(() => banner.classList.remove('visible'), 10000);
    },

    showToast: (message, type = 'info') => {
        const colors = {
            info: 'border-acid-accent text-acid-accent',
            success: 'border-acid-green text-acid-green',
            danger: 'border-acid-danger text-acid-danger',
            warning: 'border-yellow-500 text-yellow-500'
        };
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 bg-gray-900 border-l-4 ${colors[type]} text-white px-6 py-4 rounded shadow-[0_0_20px_rgba(0,0,0,0.5)] z-[100] transform transition-all duration-300 translate-y-20 opacity-0 flex items-center font-medium`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-3"></i> ${message}`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-20', 'opacity-0'));
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    updateStatus: (service, status, text) => {
        const dot = document.getElementById(`${service}-status`);
        if (dot) dot.className = `status-dot status-${status}`;
        const countEl = document.getElementById(`${service}-count`);
        if (countEl && text !== undefined) countEl.innerText = text;
        const dashEl = document.getElementById(`dash-${service}-count`);
        if (dashEl && text !== undefined) dashEl.innerText = text;
    },

    renderLibrary: (type) => {
        const isMovie = type === 'movie' || type === 'movies';
        const lib = isMovie ? State.mediaLibrary.movies : State.mediaLibrary.series;
        const state = isMovie ? State.ui.movies : State.ui.series;

        let filtered = lib.filter(item => item.title.toLowerCase().includes(state.filter || ''));

        filtered.sort((a, b) => {
            switch (state.sort) {
                case 'title_asc': case 'title': return a.title.localeCompare(b.title);
                case 'date_desc': case 'added': return (b.added || 0) - (a.added || 0);
                case 'date_asc': return (a.added || 0) - (b.added || 0);
                case 'year_desc': case 'year': return (b.year || 0) - (a.year || 0);
                case 'missing': return (a.status === 'Missing' ? -1 : 1);
                case 'status': return (a.status || '').localeCompare(b.status || '');
                case 'network': return (a.network || '').localeCompare(b.network || '');
                default: return 0;
            }
        });

        const gridId = isMovie ? 'movies-grid' : 'series-grid';
        UI.renderMediaGrid(filtered, gridId, isMovie ? 'movie' : 'series');
    },

    renderMediaGrid: (items, elementId, type) => {
        const container = document.getElementById(elementId);
        if (!container) return;

        if (!items.length) {
            container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-600">
                <i class="fas ${type === 'movie' ? 'fa-film' : 'fa-tv'} text-4xl mb-4 opacity-20"></i>
                <p>Aucun contenu trouve.</p>
            </div>`;
            return;
        }

        container.innerHTML = items.map(item => {
            const statusColor = item.status && item.status.toLowerCase().includes('missing') ? 'border-red-500' : (item.hasFile ? 'border-green-500' : 'border-gray-700');
            const statusIcon = item.hasFile ? '<i class="fas fa-check text-green-500"></i>' : (item.monitored ? '<i class="fas fa-search text-red-500"></i>' : '<i class="fas fa-eye-slash text-gray-500"></i>');
            const posterUrl = item.image || posterFallback(item.title, item.year);
            const service = type === 'movie' ? 'radarr' : 'sonarr';
            const command = type === 'movie' ? 'RescanMovie' : 'RefreshSeries';

            // Check if item is currently downloading
            const dl = (typeof getQueueForMedia === 'function') ? getQueueForMedia(type, item.id) : null;
            const dlOverlay = dl ? `
                <div class="absolute top-0 left-0 right-0 bg-black/80 p-1.5 flex items-center gap-2 z-10">
                    <i class="fas fa-download text-acid-green text-[10px] animate-pulse"></i>
                    <div class="flex-1 h-1.5 bg-gray-700 rounded overflow-hidden">
                        <div class="h-full bg-acid-green rounded transition-all" style="width:${dl.progress}%"></div>
                    </div>
                    <span class="text-acid-green text-[10px] font-mono font-bold">${dl.progress}%</span>
                </div>` : '';
            const safeTitle = (item.title || '').replace(/'/g, '').replace(/"/g, '');

            return `
            <div class="group relative aspect-[2/3] bg-gray-900 rounded-lg overflow-hidden border-2 ${statusColor} transition-transform hover:scale-105 hover:z-10 shadow-lg cursor-pointer" data-action="open-detail" data-param="${type}" data-id="${item.id}">
                ${dlOverlay}
                <img src="${posterUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" onerror="this.onerror=null;this.src=posterFallback('${safeTitle}','${item.year||''}')">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                <div class="absolute bottom-0 left-0 right-0 p-3">
                    <h4 class="text-white font-bold text-sm leading-tight truncate">${item.title}</h4>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-gray-400">${item.year || ''}</span>
                        <span class="text-xs bg-black/50 px-1.5 rounded border border-gray-700">${statusIcon}</span>
                    </div>
                </div>
                <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                    <button data-action="trigger-action" data-param="${service}" data-param2="${command}" data-id="${item.id}" class="bg-acid-green text-black h-8 w-8 rounded-full flex items-center justify-center hover:bg-white shadow-lg" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    renderRealQueue: (queueData) => {
        const listElement = document.getElementById('dashboard-queue-list');
        const fullList = document.getElementById('full-queue-list');

        const activityEl = document.getElementById('dash-activity-count');
        if (activityEl) activityEl.innerText = queueData.length;

        const emptyHtml = `<tr><td colspan="6" class="p-4 text-center text-gray-500"><i class="fas fa-check-circle mr-2"></i>Aucun telechargement actif.</td></tr>`;

        if (!queueData.length) {
            if (listElement) listElement.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">Aucune activite recente.</td></tr>`;
            if (fullList) fullList.innerHTML = emptyHtml;
            return;
        }

        if (listElement) {
            listElement.innerHTML = queueData.slice(0, 5).map(item => {
                const icon = item.client === 'Sonarr' ? 'fa-tv' : item.client === 'Radarr' ? 'fa-film' : 'fa-server';
                const color = item.client === 'Sonarr' ? 'text-acid-accent' : item.client === 'Radarr' ? 'text-yellow-500' : 'text-purple-400';
                const pct = item.progress || 0;
                return `
                <tr class="border-b border-gray-800 hover:bg-white/5 transition-colors group">
                    <td class="py-3 pl-2 text-xs text-gray-400 font-mono">${item.client}</td>
                    <td class="py-3 font-medium text-white truncate max-w-[150px]">
                        <i class="fas ${icon} ${color} mr-2"></i>${item.title}
                    </td>
                    <td class="py-3 w-32">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
                                <div class="h-full bg-acid-green rounded transition-all" style="width:${pct}%"></div>
                            </div>
                            <span class="text-[10px] font-mono text-acid-green font-bold w-8 text-right">${pct}%</span>
                        </div>
                    </td>
                    <td class="py-3 text-right pr-2 text-xs font-mono text-gray-400">${item.eta}</td>
                </tr>`;
            }).join('');
        }

        if (fullList) {
            fullList.innerHTML = queueData.map(item => {
                const svc = (item.client || '').toLowerCase();
                const statusLower = (item.status || '').toLowerCase();
                const statusClass = statusLower.includes('download') ? 'bg-acid-green/10 text-acid-green border-acid-green/30' :
                    statusLower.includes('fail') || statusLower.includes('warn') ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
                return `
                <tr class="hover:bg-white/5 group border-b border-gray-800/50 transition-colors">
                    <td class="p-4 text-sm text-gray-400 font-mono">
                        <div class="flex items-center gap-2"><i class="fas ${item.client === 'Sonarr' ? 'fa-tv text-acid-accent' : item.client === 'Radarr' ? 'fa-film text-yellow-500' : 'fa-server text-purple-400'}"></i> ${item.client}</div>
                    </td>
                    <td class="p-4 font-bold text-white text-sm">${item.title}</td>
                    <td class="p-4 text-xs font-mono text-gray-400">${item.quality}</td>
                    <td class="p-4 text-xs font-mono text-gray-400">${item.size || '-'}</td>
                    <td class="p-4 text-xs font-mono text-white">
                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-2 bg-gray-800 rounded overflow-hidden min-w-[60px]">
                                <div class="h-full bg-acid-green rounded transition-all" style="width:${item.progress || 0}%"></div>
                            </div>
                            <span class="font-bold text-acid-green w-10 text-right">${item.progress || 0}%</span>
                        </div>
                        <div class="text-[10px] text-gray-500 mt-0.5">${item.eta}</div>
                    </td>
                    <td class="p-4"><span class="px-2 py-1 rounded ${statusClass} text-xs font-bold uppercase tracking-wider">${item.status}</span></td>
                    <td class="p-4 text-right">
                        <div class="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button data-action="delete-queue-item" data-param="${svc}" data-id="${item.id}" data-param2="" class="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-gray-800" title="Retirer de la queue">
                                <i class="fas fa-times"></i>
                            </button>
                            <button data-action="delete-queue-item" data-param="${svc}" data-id="${item.id}" data-param2="blocklist" class="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-gray-800" title="Retirer + Blocklist">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    },

    renderHistory: (history) => {
        const container = document.getElementById('history-list');
        if (!container) return;

        container.innerHTML = history.slice(0, 20).map(item => {
            const statusColor = item.eventType === 'grabbed' ? 'text-yellow-500' : (item.eventType === 'downloadFolderImported' ? 'text-acid-green' : 'text-red-500');
            const icon = item.source === 'Sonarr' ? 'fa-tv' : 'fa-film';
            return `
            <tr class="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                <td class="px-4 py-3 text-xs text-gray-500">${new Date(item.date).toLocaleDateString()}</td>
                <td class="px-4 py-3 font-medium text-white flex items-center gap-2">
                    <i class="fas ${icon} text-gray-600"></i> ${item.title}
                </td>
                <td class="px-4 py-3 text-xs text-gray-400">${item.quality?.quality?.name || 'Unknown'}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${item.data?.indexer || 'Unknown'}</td>
                <td class="px-4 py-3 text-xs font-bold ${statusColor} uppercase">${item.eventType}</td>
            </tr>`;
        }).join('');
    },

    renderPlexSessions: (sessions) => {
        const container = document.getElementById('plex-streams-container') || document.getElementById('plex-sessions-grid');
        if (!container) return;

        const countEl = document.getElementById('plex-sessions-count');
        if (countEl) countEl.innerText = sessions.length;

        if (!sessions.length) {
            container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-gray-600 py-12"><i class="fas fa-video-slash text-4xl mb-4 opacity-20"></i><p>Aucune session active</p></div>`;
            return;
        }

        container.innerHTML = sessions.map(s => {
            const user = s.User?.title || 'Unknown';
            const title = s.grandparentTitle ? `${s.grandparentTitle} - ${s.title}` : s.title;
            const thumb = s.thumb || s.art || '';
            const progress = s.viewOffset && s.duration ? (s.viewOffset / s.duration) * 100 : 0;
            const transcode = s.TranscodeSession ? 'Transcode' : 'Direct Play';
            const quality = s.Media && s.Media[0] ? s.Media[0].videoResolution + 'p' : 'Unknown';

            return `
            <div class="stream-card glass-panel p-4 rounded-xl border border-yellow-600/30 relative overflow-hidden">
                <div class="relative z-10 flex gap-4">
                    <img src="http://${Config.ip}:${Config.plexPort}${thumb}?X-Plex-Token=${Config.plexToken}" class="w-16 h-24 object-cover rounded bg-black shadow-lg" onerror="this.style.display='none'">
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-white text-sm truncate">${title}</h4>
                            <span class="text-[10px] bg-yellow-600 text-black px-1 rounded font-bold">LIVE</span>
                        </div>
                        <p class="text-xs text-gray-400 truncate">${user} - ${quality} - ${transcode}</p>
                        <div class="mt-3">
                            <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>${progress.toFixed(0)}%</span>
                                <span>${s.Player?.state || 'playing'}</span>
                            </div>
                            <div class="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div class="h-full bg-yellow-500" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    renderPlexRecent: (items) => {
        const container = document.getElementById('plex-recent-list') || document.getElementById('plex-recent-grid');
        if (!container || !items.length) return;

        container.innerHTML = items.map(item => {
            const img = item.thumb || item.art;
            const rk = item.ratingKey || '';
            return `
            <div class="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer flex-shrink-0" data-action="plex-view-detail" data-id="${rk}">
                <img src="http://${Config.ip}:${Config.plexPort}${img}?X-Plex-Token=${Config.plexToken}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.style.display='none'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                <div class="absolute bottom-0 left-0 right-0 p-3">
                    <h4 class="text-white text-xs font-bold truncate">${item.title}</h4>
                    <span class="text-[10px] text-gray-400">${item.year || ''}</span>
                </div>
            </div>`;
        }).join('');
    },

    renderIndexers: (items) => {
        const container = document.getElementById('indexers-list') || document.getElementById('indexers-grid');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-gray-600">Aucun indexeur detecte.</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const isOk = item.enable !== false;
            const borderColor = isOk ? 'border-green-500' : 'border-red-500';
            return `
            <div class="glass-panel p-4 rounded-lg border-l-2 ${borderColor} flex justify-between items-center hover:bg-white/5 transition-colors">
                <div>
                    <h4 class="font-bold text-white text-sm">${item.name || 'Indexer'}</h4>
                    <div class="text-xs text-gray-500 mt-1">${item.protocol || 'indexer'}</div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isOk ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}">
                        ${isOk ? 'ACTIF' : 'INACTIF'}
                    </span>
                </div>
            </div>`;
        }).join('');
    },

    // --- Interactive search modal ---
    openInteractiveSearch: async (type, id, seasonNumber) => {
        const modal = document.getElementById('search-modal');
        const title = document.getElementById('search-modal-title');
        const content = document.getElementById('search-modal-content');
        if (!modal) return;

        modal.classList.remove('hidden');
        title.innerText = 'Recherche interactive...';
        content.innerHTML = '<div class="flex items-center justify-center py-20 text-gray-500"><div class="loader h-8 w-8 border-4 border-gray-600"></div><span class="ml-4">Interrogation des indexeurs...</span></div>';

        let releases = null;
        let service = 'radarr';
        let currentVersionHtml = '';

        if (type === 'movie') {
            // Get current movie file info for comparison
            const movie = State.mediaLibrary.movies.find(m => m.id === id);
            if (movie) {
                const detail = await API.fetchMovieDetail(id);
                if (detail?.movieFile?.mediaInfo) {
                    const mi = detail.movieFile.mediaInfo;
                    const badges = (typeof mediaInfoBadges === 'function') ? mediaInfoBadges(mi) : '';
                    const fileSize = detail.movieFile.size ? formatBytes(detail.movieFile.size) : '-';
                    const qName = detail.movieFile.quality?.quality?.name || '-';
                    currentVersionHtml = `<div class="glass-panel p-3 rounded-lg mb-4 border border-acid-green/20 flex items-center gap-4">
                        <i class="fas fa-file-video text-acid-green"></i>
                        <div>
                            <span class="text-white text-xs font-bold">Version actuelle:</span>
                            <span class="text-gray-400 text-xs ml-2">${qName} - ${fileSize}</span>
                        </div>
                        <div class="flex gap-1 ml-auto">${badges}</div>
                    </div>`;
                }
            }
            releases = await API.interactiveSearchMovie(id);
        } else if (type === 'episode') {
            service = 'sonarr';
            releases = await API.interactiveSearchEpisode(id);
        } else if (type === 'season') {
            service = 'sonarr';
            releases = await API.interactiveSearchSeason(id, seasonNumber);
        }

        if (!releases || !Array.isArray(releases) || releases.length === 0) {
            content.innerHTML = '<div class="text-center py-20 text-gray-500"><i class="fas fa-search text-4xl mb-4 opacity-20"></i><p>Aucun resultat trouve</p></div>';
            title.innerText = 'Recherche interactive - 0 resultats';
            return;
        }

        title.innerText = `Recherche interactive - ${releases.length} resultats`;

        // Store releases for grab reference
        window._interactiveReleases = releases;

        content.innerHTML = `${currentVersionHtml}
        <table class="w-full text-xs">
            <thead class="bg-black/40 text-gray-500 uppercase sticky top-0 z-10">
                <tr>
                    <th class="p-2 text-left">Titre</th>
                    <th class="p-2 text-left w-24">Indexeur</th>
                    <th class="p-2 text-left w-20">Taille</th>
                    <th class="p-2 text-left w-16">Seeds</th>
                    <th class="p-2 text-left w-20">Qualite</th>
                    <th class="p-2 text-left w-16">Age</th>
                    <th class="p-2 text-left w-16">Statut</th>
                    <th class="p-2 w-10"></th>
                </tr>
            </thead>
            <tbody>
                ${releases.map((r, idx) => {
                    const sizeGB = r.size ? (r.size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '-';
                    const seeds = r.seeders != null ? r.seeders : '-';
                    const quality = r.quality?.quality?.name || '-';
                    const age = r.age != null ? r.age + 'j' : '-';
                    const rejections = r.rejections || [];
                    const isRejected = rejections.length > 0 || r.rejected === true;
                    const rejReasons = rejections.map(rj => rj.reason || rj).join(', ');
                    const rowClass = isRejected ? 'opacity-60 hover:opacity-100' : 'hover:bg-white/5';
                    const seedClass = seeds > 5 ? 'text-green-400' : seeds > 0 ? 'text-yellow-400' : 'text-red-400';
                    return `
                <tr class="border-b border-gray-800/50 ${rowClass} transition-opacity">
                    <td class="p-2 text-white truncate max-w-[300px]" title="${(r.title || '').replace(/"/g, '&quot;')}">${r.title || '-'}</td>
                    <td class="p-2 text-gray-400">${r.indexer || '-'}</td>
                    <td class="p-2 text-gray-400 font-mono">${sizeGB}</td>
                    <td class="p-2 ${seedClass} font-mono">${seeds}</td>
                    <td class="p-2"><span class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">${quality}</span></td>
                    <td class="p-2 text-gray-500">${age}</td>
                    <td class="p-2">${isRejected ? `<span class="text-yellow-500 cursor-help" title="${rejReasons}"><i class="fas fa-exclamation-triangle"></i></span>` : '<span class="text-green-400"><i class="fas fa-check-circle"></i></span>'}</td>
                    <td class="p-2"><button data-action="grab-release-idx" data-param="${service}" data-param2="${idx}" class="${isRejected ? 'text-yellow-500 hover:text-yellow-300' : 'text-acid-green hover:text-white'} p-1" title="${isRejected ? 'Forcer le telechargement' : 'Telecharger'}"><i class="fas fa-download"></i></button></td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    },

    // --- Disk space ---
    renderDiskSpace: (folders) => {
        const container = document.getElementById('disk-space-container');
        if (!container || !folders.length) return;

        container.innerHTML = folders.map(f => {
            const free = f.freeSpace || 0;
            const total = f.totalSpace || 0;
            const used = total > 0 ? total - free : 0;
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            const pctColor = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-acid-green';
            return `
            <div class="mb-3">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400 truncate" title="${f.path}">${f.path}</span>
                    <span class="text-gray-500">${f.source}</span>
                </div>
                <div class="h-2 bg-gray-800 rounded overflow-hidden">
                    <div class="h-full ${pctColor} rounded" style="width:${pct}%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>${formatBytes(free)} libre</span>
                    <span>${total > 0 ? formatBytes(total) + ' total' : '-'}</span>
                </div>
            </div>`;
        }).join('');
    },

    // --- System health ---
    renderSystemHealth: (issues) => {
        const container = document.getElementById('health-container');
        if (!container) return;

        if (!issues.length) {
            container.innerHTML = '<div class="text-xs text-green-400 flex items-center gap-2"><i class="fas fa-check-circle"></i> Tous les services sont en bonne sante</div>';
            return;
        }

        container.innerHTML = issues.map(h => {
            const icon = h.type === 'error' ? 'fa-exclamation-circle text-red-500' : h.type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' : 'fa-info-circle text-blue-400';
            return `
            <div class="flex items-start gap-2 p-2 rounded bg-white/5 text-xs">
                <i class="fas ${icon} mt-0.5"></i>
                <div class="flex-1">
                    <span class="text-white">[${h.source}]</span>
                    <span class="text-gray-400">${h.message}</span>
                </div>
            </div>`;
        }).join('');
    },

    // --- Plex watchlist ---
    renderPlexWatchlist: (items) => {
        const container = document.getElementById('plex-watchlist-container');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">Watchlist vide</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const title = item.title || 'Unknown';
            const year = item.year || '';
            const thumb = item.thumb || '';
            const ratingKey = item.ratingKey || '';
            return `
            <div class="watchlist-item flex items-center gap-3 p-2 rounded hover:bg-white/5 group">
                <div class="w-8 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    ${thumb ? `<img src="https://metadata.provider.plex.tv${thumb}?X-Plex-Token=${Config.plexToken}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-white text-xs font-medium truncate">${title}</div>
                    <div class="text-gray-500 text-[10px]">${year}</div>
                </div>
                <button data-action="plex-remove-watchlist" data-id="${ratingKey}" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 transition-opacity" title="Retirer">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        }).join('');
    },

    // --- Plex Search (multi-mode: plex library + discover new) ---
    performPlexSearch: async (query) => {
        if (!query || query.length < 2) return;
        const container = document.getElementById('plex-search-results');
        if (!container) return;
        const mode = window._plexSearchMode || 'all';

        container.innerHTML = '<div class="text-center py-10 text-gray-500"><div class="loader h-8 w-8 border-4 border-gray-600 mx-auto mb-2"></div>Recherche en cours...</div>';

        let html = '';

        // --- PLEX LIBRARY results ---
        if (mode === 'all' || mode === 'plex') {
            const data = await API.plexSearch(query);
            if (data?.MediaContainer?.Hub) {
                data.MediaContainer.Hub.forEach(hub => {
                    if (!hub.Metadata || hub.Metadata.length === 0) return;
                    const hubType = hub.type || hub.hubIdentifier || '';
                    const typeLabel = hubType.includes('movie') ? 'Films (Plex)' : hubType.includes('show') ? 'Series (Plex)' : hub.title || 'Plex';
                    html += `<div class="mb-4">
                        <h4 class="text-xs font-bold text-acid-plex uppercase tracking-wider mb-2"><i class="fas fa-play-circle mr-1"></i>${typeLabel} - Dans ma bibliotheque</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            ${hub.Metadata.map(item => {
                                const thumb = item.thumb ? `http://${Config.ip}:${Config.plexPort}${item.thumb}?X-Plex-Token=${Config.plexToken}` : posterFallback(item.title, item.year);
                                return `<div class="group relative aspect-[2/3] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-acid-plex cursor-pointer transition-all" data-action="plex-view-detail" data-id="${item.ratingKey || ''}">
                                    <img src="${thumb}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                                    <div class="absolute top-2 left-2"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-acid-plex/30 text-acid-plex border border-acid-plex/40">PLEX</span></div>
                                    <div class="absolute bottom-0 left-0 right-0 p-2">
                                        <h4 class="text-white font-bold text-xs leading-tight truncate">${item.title || ''}</h4>
                                        <div class="text-gray-400 text-[10px]">${item.year || ''}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                });
            }
        }

        // --- DISCOVER: Search Radarr + Sonarr lookups for NEW content ---
        if (mode === 'all' || mode === 'discover') {
            // Store results for add-from-discover
            window._discoverMovies = [];
            window._discoverSeries = [];

            // Search movies via Radarr
            if (Config.enabled.radarr && Config.radarrKey) {
                try {
                    const movies = await tauriInvoke('search_radarr_movies', { term: query });
                    if (movies && Array.isArray(movies)) {
                        window._discoverMovies = movies;
                        const newMovies = movies.filter(m => !m.id || m.id === 0);
                        if (newMovies.length > 0) {
                            html += `<div class="mb-4">
                                <h4 class="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2"><i class="fas fa-film mr-1"></i>Films a decouvrir (TMDb)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    ${newMovies.slice(0, 8).map((m, idx) => {
                                        const img = m.images?.find(i => i.coverType === 'poster');
                                        const imgUrl = img?.remoteUrl || posterFallback(m.title, m.year);
                                        const overview = (m.overview || '').substring(0, 120) + (m.overview?.length > 120 ? '...' : '');
                                        const rating = m.ratings?.tmdb?.value ? (m.ratings.tmdb.value * 10).toFixed(0) + '%' : '-';
                                        const realIdx = movies.indexOf(m);
                                        return `<div class="flex bg-gray-900 border border-gray-700 rounded-lg p-3 gap-3 hover:border-yellow-500 transition-all">
                                            <div class="w-16 flex-shrink-0">
                                                <img src="${imgUrl}" class="w-full h-24 object-cover rounded bg-gray-800">
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <h4 class="font-bold text-white text-sm">${m.title}</h4>
                                                        <div class="text-[10px] text-gray-400">${m.year || ''} - ${rating}</div>
                                                    </div>
                                                </div>
                                                <p class="text-[10px] text-gray-500 mt-1">${overview}</p>
                                                <button data-action="add-from-discover" data-param="movie" data-param2="${realIdx}" class="mt-2 bg-yellow-500 text-black px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-yellow-400">
                                                    <i class="fas fa-plus mr-1"></i>Ajouter a Radarr
                                                </button>
                                            </div>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        }
                    }
                } catch (e) { Logger.error('UI', 'Radarr discover failed', e); }
            }

            // Search series via Sonarr
            if (Config.enabled.sonarr && Config.sonarrKey) {
                try {
                    const series = await tauriInvoke('search_sonarr_series', { term: query });
                    if (series && Array.isArray(series)) {
                        window._discoverSeries = series;
                        const newSeries = series.filter(s => !s.id || s.id === 0);
                        if (newSeries.length > 0) {
                            html += `<div class="mb-4">
                                <h4 class="text-xs font-bold text-acid-accent uppercase tracking-wider mb-2"><i class="fas fa-tv mr-1"></i>Series a decouvrir (TVDb)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    ${newSeries.slice(0, 8).map((s, idx) => {
                                        const img = s.images?.find(i => i.coverType === 'poster');
                                        const imgUrl = img?.remoteUrl || posterFallback(s.title, s.year);
                                        const overview = (s.overview || '').substring(0, 120) + (s.overview?.length > 120 ? '...' : '');
                                        const realIdx = series.indexOf(s);
                                        return `<div class="flex bg-gray-900 border border-gray-700 rounded-lg p-3 gap-3 hover:border-acid-accent transition-all">
                                            <div class="w-16 flex-shrink-0">
                                                <img src="${imgUrl}" class="w-full h-24 object-cover rounded bg-gray-800">
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <h4 class="font-bold text-white text-sm">${s.title}</h4>
                                                        <div class="text-[10px] text-gray-400">${s.year || ''} - ${s.network || ''}</div>
                                                    </div>
                                                </div>
                                                <p class="text-[10px] text-gray-500 mt-1">${overview}</p>
                                                <button data-action="add-from-discover" data-param="series" data-param2="${realIdx}" class="mt-2 bg-acid-accent text-black px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-cyan-400">
                                                    <i class="fas fa-plus mr-1"></i>Ajouter a Sonarr
                                                </button>
                                            </div>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        }
                    }
                } catch (e) { Logger.error('UI', 'Sonarr discover failed', e); }
            }
        }

        container.innerHTML = html || '<div class="text-center py-10 text-gray-500">Aucun resultat trouve</div>';
    },

    // --- Plex Detail ---
    openPlexDetail: async (ratingKey) => {
        if (!ratingKey) return;
        const modal = document.getElementById('detail-modal');
        const title = document.getElementById('detail-modal-title');
        const content = document.getElementById('detail-modal-content');
        if (!modal) return;

        modal.classList.remove('hidden');
        title.innerText = 'Chargement...';
        content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="loader h-8 w-8 border-4 border-gray-600"></div></div>';

        const data = await API.fetchPlexMetadata(ratingKey);
        if (!data?.MediaContainer?.Metadata?.[0]) {
            content.innerHTML = '<div class="p-10 text-center text-red-500">Erreur</div>';
            return;
        }

        const m = data.MediaContainer.Metadata[0];
        title.innerText = m.title || 'Plex';
        const thumb = m.thumb ? `http://${Config.ip}:${Config.plexPort}${m.thumb}?X-Plex-Token=${Config.plexToken}` : '';
        const art = m.art ? `http://${Config.ip}:${Config.plexPort}${m.art}?X-Plex-Token=${Config.plexToken}` : '';
        const directors = (m.Director || []).map(d => d.tag).join(', ') || '-';
        const actors = (m.Role || []).map(r => `${r.tag}${r.role ? ' (' + r.role + ')' : ''}`).join(', ') || '-';
        const genres = (m.Genre || []).map(g => g.tag).join(', ') || '-';
        const duration = m.duration ? formatDuration(Math.round(m.duration / 60000)) : '-';

        // Media info from streams
        let mediaInfoHtml = '';
        if (m.Media && m.Media.length > 0) {
            const media = m.Media[0];
            const vRes = media.videoResolution || '-';
            const vCodec = (media.videoCodec || '').toUpperCase();
            const aCodec = (media.audioCodec || '').toUpperCase();
            const aCh = media.audioChannels || '-';
            const container = media.container || '-';
            const fileSize = media.Part?.[0]?.size ? formatBytes(media.Part[0].size) : '-';
            const filePath = media.Part?.[0]?.file || '';

            mediaInfoHtml = `
            <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Resolution</div><div class="text-xs text-white font-bold">${vRes}p</div></div>
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Video</div><div class="text-xs text-white font-bold">${vCodec}</div></div>
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Audio</div><div class="text-xs text-white font-bold">${aCodec} ${aCh}ch</div></div>
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Format</div><div class="text-xs text-white font-bold">${container}</div></div>
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Taille</div><div class="text-xs text-white font-bold">${fileSize}</div></div>
                <div class="glass-panel p-2 rounded text-center"><div class="text-[10px] text-gray-500">Bitrate</div><div class="text-xs text-white font-bold">${media.bitrate ? Math.round(media.bitrate/1000) + ' Mbps' : '-'}</div></div>
            </div>
            ${filePath ? `<div class="mt-2 text-[10px] text-gray-600 font-mono truncate" title="${filePath}"><i class="fas fa-folder-open mr-1"></i>${filePath}</div>` : ''}`;
        }

        content.innerHTML = `
        <div class="relative">
            ${art ? `<div class="h-48 bg-cover bg-center opacity-30" style="background-image:url('${art}')"></div><div class="absolute inset-0 h-48 bg-gradient-to-b from-transparent to-[#0a0a0a]"></div>` : '<div class="h-12"></div>'}
        </div>
        <div class="p-6 flex gap-6 -mt-24 relative z-10">
            <div class="w-40 flex-shrink-0">
                ${thumb ? `<img src="${thumb}" class="w-full rounded-lg shadow-2xl border border-gray-700">` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <h2 class="text-2xl font-display font-bold text-white">${m.title}</h2>
                <div class="text-sm text-gray-400 mt-1">${m.year || ''} &middot; ${duration} &middot; ${genres}</div>
                <div class="text-sm text-gray-400 mt-2"><i class="fas fa-user mr-1 text-acid-plex"></i><span class="text-gray-300">${actors}</span></div>
                <div class="text-sm text-gray-400 mt-1"><i class="fas fa-video mr-1 text-acid-plex"></i>Realisateur: <span class="text-gray-300">${directors}</span></div>
                ${m.rating ? `<div class="mt-2"><span class="px-2 py-1 rounded bg-acid-plex/20 text-acid-plex border border-acid-plex/30 text-xs font-bold">${m.rating}/10</span></div>` : ''}
                <p class="text-sm text-gray-400 mt-4 leading-relaxed">${m.summary || ''}</p>
            </div>
        </div>
        <div class="px-6 pb-6">${mediaInfoHtml}</div>`;
    },

    handleBatchSelection: (checkbox, id, type) => {
        Logger.debug('UI', `Batch select: ${id} (${type}) - ${checkbox.checked}`);
    },

    openMediaDetail: async (id, type) => {
        const modal = document.getElementById('detail-modal');
        const title = document.getElementById('detail-modal-title');
        const content = document.getElementById('detail-modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');
        title.innerText = 'Chargement...';
        content.innerHTML = '<div class="flex items-center justify-center py-20 text-gray-500"><div class="loader h-8 w-8 border-4 border-gray-600"></div></div>';

        try {
            if (type === 'movie') {
                const data = await API.fetchMovieDetail(id);
                if (data) UI.renderMovieDetail(data, content, title);
                else content.innerHTML = '<div class="p-10 text-center text-red-500">Erreur de chargement</div>';
            } else {
                const data = await API.fetchSeriesDetail(id);
                if (data) UI.renderSeriesDetail(data, content, title);
                else content.innerHTML = '<div class="p-10 text-center text-red-500">Erreur de chargement</div>';
            }
        } catch (e) {
            content.innerHTML = `<div class="p-10 text-center text-red-500">Erreur: ${e}</div>`;
        }
    },

    renderMovieDetail: (movie, container, titleEl) => {
        const m = movie;
        titleEl.innerText = m.title || 'Film';
        const posterUrl = getImageUrl(m.images, 'radarr', Config.radarrPort) || '';
        const fanart = m.images?.find(i => i.coverType === 'fanart');
        const fanartUrl = fanart ? (fanart.remoteUrl && fanart.remoteUrl.startsWith('http') ? fanart.remoteUrl : `http://${Config.ip}:${Config.radarrPort}${fanart.url || ''}`) : '';
        const statusColor = m.hasFile ? 'text-green-400' : 'text-red-400';
        const statusText = m.hasFile ? 'Disponible' : 'Manquant';
        const quality = m.movieFile?.quality?.quality?.name || '-';
        const size = m.movieFile?.size ? formatBytes(m.movieFile.size) : '-';
        const runtime = m.runtime ? `${m.runtime} min` : '-';
        const genres = (m.genres || []).join(', ') || '-';
        const ratings = m.ratings?.imdb?.value ? `IMDb ${m.ratings.imdb.value}` : (m.ratings?.tmdb?.value ? `TMDb ${m.ratings.tmdb.value}` : '-');
        const fileId = m.movieFile?.id || 0;
        const mi = m.movieFile?.mediaInfo || {};
        const miBadges = (typeof mediaInfoBadges === 'function') ? mediaInfoBadges(mi) : '';
        const filePath = m.movieFile?.path || '';
        // Check download status
        const dl = (typeof getQueueForMedia === 'function') ? getQueueForMedia('movie', m.id) : null;

        container.innerHTML = `
        <div class="relative">
            ${fanartUrl ? `<div class="h-48 bg-cover bg-center opacity-30" style="background-image:url('${fanartUrl}')"></div><div class="absolute inset-0 h-48 bg-gradient-to-b from-transparent to-[#0a0a0a]"></div>` : '<div class="h-12"></div>'}
        </div>
        <div class="p-6 flex gap-6 -mt-24 relative z-10">
            <div class="w-40 flex-shrink-0">
                ${posterUrl ? `<img src="${posterUrl}" class="w-full rounded-lg shadow-2xl border border-gray-700">` : '<div class="w-full aspect-[2/3] bg-gray-800 rounded-lg"></div>'}
            </div>
            <div class="flex-1 min-w-0">
                <h2 class="text-2xl font-display font-bold text-white">${m.title}</h2>
                <div class="text-sm text-gray-400 mt-1">${m.year || ''} &middot; ${runtime} &middot; ${genres}</div>
                <div class="flex items-center gap-4 mt-3">
                    <span class="px-3 py-1 rounded text-xs font-bold uppercase ${statusColor} bg-white/5 border border-white/10">${statusText}</span>
                    <span class="text-xs text-gray-500">${ratings}</span>
                    ${m.monitored ? '<span class="text-acid-green text-xs"><i class="fas fa-bookmark mr-1"></i>Surveille</span>' : '<span class="text-gray-500 text-xs"><i class="far fa-bookmark mr-1"></i>Non surveille</span>'}
                </div>
                <p class="text-sm text-gray-400 mt-4 leading-relaxed">${m.overview || 'Aucun synopsis disponible.'}</p>
                ${miBadges ? `<div class="flex flex-wrap gap-1 mt-3">${miBadges}</div>` : ''}
            </div>
        </div>
        <div class="px-6 pb-6">
            ${dl ? `
            <div class="glass-panel rounded-lg p-4 mb-4 border border-acid-green/20">
                <div class="flex items-center gap-3 mb-2">
                    <i class="fas fa-download text-acid-green animate-pulse"></i>
                    <span class="text-white text-sm font-bold">Telechargement en cours</span>
                    <span class="text-acid-green font-mono font-bold ml-auto">${dl.progress}%</span>
                </div>
                <div class="h-2 bg-gray-800 rounded overflow-hidden">
                    <div class="h-full bg-acid-green rounded transition-all" style="width:${dl.progress}%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>${dl.quality || ''} - ${dl.size || ''}</span>
                    <span>ETA: ${dl.eta}</span>
                </div>
            </div>` : ''}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Qualite</div>
                    <div class="text-sm text-white font-bold mt-1">${quality}</div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Taille</div>
                    <div class="text-sm text-white font-bold mt-1">${size}</div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Studio</div>
                    <div class="text-sm text-white font-bold mt-1">${m.studio || '-'}</div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Certification</div>
                    <div class="text-sm text-white font-bold mt-1">${m.certification || '-'}</div>
                </div>
            </div>
            ${filePath ? `<div class="mt-3 text-[10px] text-gray-600 font-mono truncate" title="${filePath}"><i class="fas fa-folder-open mr-1"></i>${filePath}</div>` : ''}
            <!-- Action buttons -->
            <div class="flex flex-wrap gap-2 mt-6">
                <button data-action="play-trailer" data-title="${(m.title||'').replace(/"/g,'')}" data-year="${m.year||''}" class="bg-red-600 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500 transition-colors">
                    <i class="fas fa-play mr-1"></i>Bande-annonce
                </button>
                <button data-action="trigger-action" data-param="radarr" data-param2="RefreshMovie" data-id="${m.id}" class="bg-acid-green text-black px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white transition-colors">
                    <i class="fas fa-sync-alt mr-1"></i>Rafraichir
                </button>
                <button data-action="search-movie" data-id="${m.id}" class="bg-gray-800 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-gray-700 border border-gray-700">
                    <i class="fas fa-search mr-1"></i>Recherche auto
                </button>
                <button data-action="interactive-search" data-param="movie" data-id="${m.id}" class="bg-acid-accent/20 text-acid-accent px-4 py-2 rounded font-bold text-xs uppercase hover:bg-acid-accent/30 border border-acid-accent/30">
                    <i class="fas fa-list-ul mr-1"></i>Recherche interactive
                </button>
                ${fileId ? `<button data-action="delete-movie-file" data-id="${fileId}" class="bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-yellow-500/20 border border-yellow-500/30">
                    <i class="fas fa-file-alt mr-1"></i>Suppr. fichier
                </button>` : ''}
                <button data-action="delete-movie" data-id="${m.id}" data-param2="false" class="bg-red-500/10 text-red-400 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500/20 border border-red-500/30">
                    <i class="fas fa-unlink mr-1"></i>Retirer
                </button>
                <button data-action="delete-movie" data-id="${m.id}" data-param2="true" class="bg-red-500/20 text-red-500 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500/30 border border-red-500/50">
                    <i class="fas fa-trash mr-1"></i>Suppr. + fichiers
                </button>
            </div>
        </div>`;
    },

    renderSeriesDetail: (data, container, titleEl) => {
        const s = data.series || {};
        const episodes = Array.isArray(data.episodes) ? data.episodes : (Array.isArray(data) ? [] : []);
        const episodeFiles = Array.isArray(data.episodeFiles) ? data.episodeFiles : [];
        // Build file lookup by ID
        const fileMap = {};
        episodeFiles.forEach(ef => { fileMap[ef.id] = ef; });
        titleEl.innerText = s.title || 'Serie';
        const posterUrl = getImageUrl(s.images, 'sonarr', Config.sonarrPort) || '';
        const fanart = s.images?.find(i => i.coverType === 'fanart');
        const fanartUrl = fanart ? (fanart.remoteUrl && fanart.remoteUrl.startsWith('http') ? fanart.remoteUrl : `http://${Config.ip}:${Config.sonarrPort}${fanart.url || ''}`) : '';
        const totalEps = episodes.length || 0;
        const downloadedEps = episodes.filter(e => e.hasFile).length || 0;
        const missingEps = episodes.filter(e => e.monitored && !e.hasFile && e.airDateUtc && new Date(e.airDateUtc) < new Date()).length || 0;
        const pct = totalEps > 0 ? Math.round((downloadedEps / totalEps) * 100) : 0;
        const genres = (s.genres || []).join(', ') || '-';
        const network = s.network || '-';
        const runtime = s.runtime ? `${s.runtime} min` : '-';
        const statusColor = s.status === 'ended' ? 'text-gray-400' : 'text-green-400';
        const statusText = s.status === 'ended' ? 'Terminee' : (s.status === 'continuing' ? 'En cours' : s.status || '-');

        // Group episodes by season
        const seasons = {};
        episodes.forEach(ep => {
            const sn = ep.seasonNumber;
            if (!seasons[sn]) seasons[sn] = [];
            seasons[sn].push(ep);
        });

        const seasonKeys = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));

        container.innerHTML = `
        <div class="relative">
            ${fanartUrl ? `<div class="h-48 bg-cover bg-center opacity-30" style="background-image:url('${fanartUrl}')"></div><div class="absolute inset-0 h-48 bg-gradient-to-b from-transparent to-[#0a0a0a]"></div>` : '<div class="h-12"></div>'}
        </div>
        <div class="p-6 flex gap-6 -mt-24 relative z-10">
            <div class="w-40 flex-shrink-0">
                ${posterUrl ? `<img src="${posterUrl}" class="w-full rounded-lg shadow-2xl border border-gray-700">` : '<div class="w-full aspect-[2/3] bg-gray-800 rounded-lg"></div>'}
            </div>
            <div class="flex-1 min-w-0">
                <h2 class="text-2xl font-display font-bold text-white">${s.title}</h2>
                <div class="text-sm text-gray-400 mt-1">${s.year || ''} &middot; ${network} &middot; ${runtime}/ep &middot; ${genres}</div>
                <div class="flex items-center gap-4 mt-3">
                    <span class="px-3 py-1 rounded text-xs font-bold uppercase ${statusColor} bg-white/5 border border-white/10">${statusText}</span>
                    ${s.monitored ? '<span class="text-acid-green text-xs"><i class="fas fa-bookmark mr-1"></i>Surveillee</span>' : ''}
                </div>
                <p class="text-sm text-gray-400 mt-4 leading-relaxed">${s.overview || 'Aucun synopsis disponible.'}</p>
            </div>
        </div>
        <div class="px-6 pb-2">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Episodes</div>
                    <div class="text-sm text-white font-bold mt-1">${downloadedEps} / ${totalEps}</div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Progression</div>
                    <div class="text-sm text-white font-bold mt-1">${pct}%</div>
                    <div class="h-1 bg-gray-800 rounded mt-2"><div class="h-full bg-acid-green rounded" style="width:${pct}%"></div></div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Manquants</div>
                    <div class="text-sm ${missingEps > 0 ? 'text-red-400' : 'text-green-400'} font-bold mt-1">${missingEps}</div>
                </div>
                <div class="glass-panel p-3 rounded-lg">
                    <div class="text-xs text-gray-500 uppercase">Saisons</div>
                    <div class="text-sm text-white font-bold mt-1">${s.seasonCount || seasonKeys.length}</div>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-6">
                <button data-action="play-trailer" data-title="${(s.title||'').replace(/"/g,'')}" data-year="${s.year||''}" class="bg-red-600 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500 transition-colors">
                    <i class="fas fa-play mr-1"></i>Bande-annonce
                </button>
                <button data-action="trigger-action" data-param="sonarr" data-param2="RefreshSeries" data-id="${s.id}" class="bg-acid-green text-black px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white transition-colors">
                    <i class="fas fa-sync-alt mr-1"></i>Rafraichir
                </button>
                <button data-action="search-series" data-id="${s.id}" class="bg-gray-800 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-gray-700 border border-gray-700">
                    <i class="fas fa-search mr-1"></i>Recherche complete
                </button>
                <button data-action="delete-series" data-id="${s.id}" data-param2="false" class="bg-red-500/10 text-red-400 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500/20 border border-red-500/30">
                    <i class="fas fa-unlink mr-1"></i>Retirer
                </button>
                <button data-action="delete-series" data-id="${s.id}" data-param2="true" class="bg-red-500/20 text-red-500 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-red-500/30 border border-red-500/50">
                    <i class="fas fa-trash mr-1"></i>Suppr. + fichiers
                </button>
            </div>
        </div>
        <div class="px-6 pb-6 mt-4">
            <h3 class="font-display font-bold text-lg text-white mb-4">Episodes par saison</h3>
            <div class="space-y-2">
                ${seasonKeys.map(sn => {
                    const eps = seasons[sn].sort((a, b) => a.episodeNumber - b.episodeNumber);
                    const dlCount = eps.filter(e => e.hasFile).length || 0;
                    const snPct = (eps.length > 0 && !isNaN(dlCount)) ? Math.round((dlCount / eps.length) * 100) : 0;
                    return `
                    <details class="glass-panel rounded-lg border border-gray-800 overflow-hidden">
                        <summary class="p-3 cursor-pointer hover:bg-white/5 flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-bold text-sm">${sn == 0 ? 'Specials' : 'Saison ' + sn}</span>
                                <span class="text-xs text-gray-500">${dlCount}/${eps.length} episodes</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-24 h-1.5 bg-gray-800 rounded"><div class="h-full rounded ${snPct === 100 ? 'bg-green-500' : 'bg-acid-accent'}" style="width:${snPct}%"></div></div>
                                <span class="text-xs font-mono ${snPct === 100 ? 'text-green-400' : 'text-gray-400'}">${snPct}%</span>
                            </div>
                        </summary>
                        <div class="border-t border-gray-800">
                            <!-- Season actions -->
                            <div class="flex gap-2 p-2 bg-black/30 border-b border-gray-800">
                                <button data-action="search-season" data-id="${s.id}" data-param="${sn}" class="text-[10px] bg-gray-800 text-acid-accent px-3 py-1 rounded hover:bg-gray-700 border border-gray-700">
                                    <i class="fas fa-search mr-1"></i>Chercher saison ${sn}
                                </button>
                                <button data-action="interactive-search" data-param="season" data-id="${s.id}" data-season="${sn}" class="text-[10px] bg-gray-800 text-acid-accent px-3 py-1 rounded hover:bg-gray-700 border border-gray-700">
                                    <i class="fas fa-list-ul mr-1"></i>Recherche interactive
                                </button>
                            </div>
                            <div class="max-h-72 overflow-y-auto">
                            <table class="w-full text-xs">
                                ${eps.map(ep => {
                                    const epFileId = ep.episodeFileId || 0;
                                    const epFile = fileMap[epFileId];
                                    const epMi = epFile?.mediaInfo || {};
                                    const epBadges = (typeof mediaInfoBadges === 'function' && epFile) ? mediaInfoBadges(epMi) : '';
                                    const epQuality = epFile?.quality?.quality?.name || '';
                                    const epSize = epFile?.size ? formatBytes(epFile.size) : '';
                                    return `
                                <tr class="border-b border-gray-800/50 hover:bg-white/5 group">
                                    <td class="px-3 py-2 text-gray-500 font-mono w-10">${ep.episodeNumber}</td>
                                    <td class="px-3 py-2 text-white">
                                        <div>${ep.title || 'TBA'}</div>
                                        ${epBadges ? `<div class="flex flex-wrap gap-0.5 mt-1">${epBadges}</div>` : ''}
                                    </td>
                                    <td class="px-3 py-2 text-gray-500 w-24 text-[10px]">
                                        <div>${ep.airDate || '-'}</div>
                                        ${epSize ? `<div class="text-gray-600">${epSize}</div>` : ''}
                                    </td>
                                    <td class="px-3 py-2 w-8 text-center">${ep.hasFile ? '<i class="fas fa-check text-green-500"></i>' : (ep.monitored ? '<i class="fas fa-clock text-yellow-500"></i>' : '<i class="fas fa-minus text-gray-600"></i>')}</td>
                                    <td class="px-1 py-2 w-24 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button data-action="search-episode" data-id="${ep.id}" class="text-acid-accent hover:text-white p-1" title="Rechercher"><i class="fas fa-search"></i></button>
                                        <button data-action="interactive-search" data-param="episode" data-id="${ep.id}" class="text-acid-accent hover:text-white p-1" title="Recherche interactive"><i class="fas fa-list"></i></button>
                                        ${epFileId ? `<button data-action="delete-episode-file" data-id="${epFileId}" class="text-red-400 hover:text-red-300 p-1" title="Supprimer fichier"><i class="fas fa-trash"></i></button>` : ''}
                                    </td>
                                </tr>`}).join('')}
                            </table>
                            </div>
                        </div>
                    </details>`;
                }).join('')}
            </div>
        </div>`;
    }
};
