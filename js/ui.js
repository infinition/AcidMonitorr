/**
 * ui.js
 * UI Renderers and DOM Manipulation
 */

const UI = {
    // --- Error Banner ---
    showErrorBanner: (service, message) => {
        let banner = document.getElementById('error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'error-banner';
            banner.className = 'error-banner';
            banner.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span id="error-text"></span>
                <button onclick="this.parentElement.classList.remove('visible')"><i class="fas fa-times"></i></button>
            `;
            document.body.appendChild(banner);
        }

        document.getElementById('error-text').innerText = `[${service}] ${message}`;
        banner.classList.add('visible');

        // Auto dismiss
        setTimeout(() => banner.classList.remove('visible'), 10000);
    },

    // --- Toasts ---
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

    // --- Status Updates ---
    updateStatus: (service, status, text) => {
        const dot = document.getElementById(`${service}-status`);
        if (dot) dot.className = `status-dot status-${status}`;

        // Update card count
        const countEl = document.getElementById(`${service}-count`);
        if (countEl && text) countEl.innerText = text;

        // Update dashboard KPI
        const dashEl = document.getElementById(`dash-${service}-count`);
        if (dashEl && text) dashEl.innerText = text;
    },

    // --- Library Rendering ---
    renderLibrary: (type) => {
        const lib = type === 'movie' ? State.mediaLibrary.movies : State.mediaLibrary.series;
        const state = type === 'movie' ? State.ui.movies : State.ui.series;

        let filtered = lib.filter(item => item.title.toLowerCase().includes(state.filter));

        // Sort
        filtered.sort((a, b) => {
            switch (state.sort) {
                case 'title_asc': return a.title.localeCompare(b.title);
                case 'date_desc': return (b.added || 0) - (a.added || 0);
                case 'date_asc': return (a.added || 0) - (b.added || 0);
                case 'year_desc': return (b.year || 0) - (a.year || 0);
                case 'missing': return (a.status === 'Missing' ? -1 : 1);
                case 'status': return a.status.localeCompare(b.status);
                case 'network': return (a.network || '').localeCompare(b.network || '');
                default: return 0;
            }
        });

        UI.renderMediaGrid(filtered, type === 'movie' ? 'movies-grid' : 'series-grid', type);
    },

    renderMediaGrid: (items, elementId, type) => {
        const container = document.getElementById(elementId);
        const empty = document.getElementById(type === 'movie' ? 'movies-empty' : 'series-empty');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        container.innerHTML = items.map(item => {
            const statusColor = item.status && item.status.toLowerCase().includes('missing') ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-gray-800';
            const badge = item.monitored ? '<span class="absolute top-2 right-2 text-acid-green drop-shadow-md z-10"><i class="fas fa-bookmark"></i></span>' : '';
            const fallbackImg = `https://via.placeholder.com/300x450/111111/444444?text=${encodeURIComponent(item.title)}`;
            const displayImg = item.image || fallbackImg;
            const metaRight = type === 'movie' ? (item.quality || 'Inconnue') : (item.network || `${item.seasonCount || '-'} S`);
            const metaLeft = type === 'movie' ? (item.year || '') : ((item.seasonCount != null ? `${item.seasonCount} Saisons` : ''));

            return `
            <div class="relative group poster-card bg-gray-900 rounded-lg overflow-hidden border ${statusColor}">
                <div class="aspect-[2/3] w-full bg-gray-800 relative cursor-pointer" onclick="UI.openMediaDetail(${item.id}, '${type}')">
                    <img src="${displayImg}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.src='${fallbackImg}'">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity"></div>
                    
                    <!-- Batch Checkbox -->
                    <div class="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
                        <input type="checkbox" class="w-5 h-5 rounded border-gray-500 text-acid-green focus:ring-acid-green bg-black/50" onchange="UI.handleBatchSelection(this, ${item.id}, '${type}')">
                    </div>
                </div>
                ${badge}
                <div class="absolute inset-0 flex flex-col justify-end p-3 opacity-100 pointer-events-none">
                    <div class="font-bold text-white leading-tight mb-1 text-sm drop-shadow-lg">${item.title}</div>
                    <div class="text-[10px] text-gray-300 flex justify-between items-center mb-2">
                        <span>${metaLeft}</span>
                        <span class="px-1.5 py-0.5 rounded bg-gray-800/80 border border-gray-600 backdrop-blur-sm">${metaRight}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    // --- Queue Rendering ---
    renderRealQueue: (queueData) => {
        const listElement = document.getElementById('dashboard-queue-list');
        const fullList = document.getElementById('full-queue-list');

        if (document.getElementById('dash-activity-count')) {
            document.getElementById('dash-activity-count').innerText = queueData.length;
        }

        const emptyHtml = `<tr><td colspan="6" class="p-4 text-center text-gray-500"><i class="fas fa-check-circle mr-2"></i>Aucun téléchargement actif.</td></tr>`;

        if (!queueData.length) {
            if (listElement) listElement.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">Aucune activité récente.</td></tr>`;
            if (fullList) fullList.innerHTML = emptyHtml;
            return;
        }

        // Dashboard compact view (Top 5)
        if (listElement) {
            listElement.innerHTML = queueData.slice(0, 5).map(item => {
                const icon = item.client === 'Sonarr' ? 'fa-tv' : item.client === 'Radarr' ? 'fa-film' : 'fa-server';
                const color = item.client === 'Sonarr' ? 'text-acid-accent' : item.client === 'Radarr' ? 'text-yellow-500' : 'text-purple-400';
                return `
                <tr class="border-b border-gray-800 hover:bg-white/5 transition-colors group">
                    <td class="py-3 pl-2 text-xs text-gray-400 font-mono">${item.client}</td>
                    <td class="py-3 font-medium text-white truncate max-w-[150px]">
                        <i class="fas ${icon} ${color} mr-2"></i>${item.title}
                    </td>
                    <td class="py-3">
                        <span class="text-[10px] uppercase font-bold text-acid-green ${item.status.toLowerCase().includes('down') ? 'animate-pulse' : ''}">${item.status}</span>
                    </td>
                    <td class="py-3 text-right pr-2 text-xs font-mono">${item.eta}</td>
                </tr>`;
            }).join('');
        }

        // Full view
        if (fullList) {
            fullList.innerHTML = queueData.map(item => `
                <tr class="hover:bg-white/5 group border-b border-gray-800/50 transition-colors">
                    <td class="p-4 text-sm text-gray-400 font-mono">
                        <div class="flex items-center gap-2"><i class="fas ${item.client === 'Sonarr' ? 'fa-tv text-acid-accent' : 'fa-film text-yellow-500'}"></i> ${item.client}</div>
                    </td>
                    <td class="p-4 font-bold text-white text-sm">${item.title}</td>
                    <td class="p-4 text-xs font-mono text-gray-400">${item.quality}</td>
                    <td class="p-4 text-xs font-mono text-white">${item.eta}</td>
                    <td class="p-4"><span class="px-2 py-1 rounded bg-acid-green/10 text-acid-green border border-acid-green/30 text-xs font-bold uppercase tracking-wider">${item.status}</span></td>
                    <td class="p-4 text-right">
                        <div class="opacity-50 group-hover:opacity-100 transition-opacity">
                            <button class="text-red-500 hover:text-red-400 mx-1 p-2 rounded hover:bg-gray-700" onclick="API.deleteItem('${item.id}', '${item.client.toLowerCase()}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    },

    // --- History Rendering ---
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

    // --- Plex Rendering ---
    renderPlexSessions: (sessions) => {
        const container = document.getElementById('plex-streams-container');
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
            <div class="stream-card bg-gray-900 border border-gray-700 rounded-lg overflow-hidden relative group">
                <div class="h-40 bg-black relative">
                    <img src="http://${Config.ip}:32400${thumb}?X-Plex-Token=${Config.plexToken}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity">
                    <div class="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                        <div class="h-full bg-yellow-500" style="width: ${progress}%"></div>
                    </div>
                    <div class="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded text-[10px] font-bold text-white border border-gray-700">
                        ${quality} • ${transcode}
                    </div>
                </div>
                <div class="p-4">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center text-black font-bold text-xs">
                            ${user.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="truncate">
                            <div class="text-white font-bold text-sm truncate">${user}</div>
                            <div class="text-gray-500 text-xs">${s.Player?.device || 'Web'}</div>
                        </div>
                    </div>
                    <div class="text-gray-300 text-xs font-medium truncate">${title}</div>
                </div>
            </div>`;
        }).join('');
    },

    renderPlexRecent: (items) => {
        const container = document.getElementById('plex-recent-list');
        container.innerHTML = items.map(item => {
            const img = item.thumb || item.art;
            return `
            <div class="flex-shrink-0 w-32 group cursor-pointer">
                <div class="aspect-[2/3] rounded-lg overflow-hidden border border-gray-800 relative mb-2">
                    <img src="http://${Config.ip}:32400${img}?X-Plex-Token=${Config.plexToken}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                </div>
                <div class="text-xs text-gray-400 truncate group-hover:text-white">${item.title}</div>
            </div>`;
        }).join('');
    },

    renderIndexers: (items) => {
        const container = document.getElementById('indexers-list');
        const empty = document.getElementById('indexers-empty');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        container.innerHTML = items.map(item => {
            const isOk = item.enable !== false;
            const statusColor = isOk ? 'text-acid-green' : 'text-acid-danger';
            const borderColor = isOk ? 'border-acid-green' : 'border-acid-danger';
            return `
            <div class="glass-panel p-4 rounded-lg flex items-center justify-between border-l-2 ${borderColor} hover:bg-white/5 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xs uppercase border border-gray-700">${(item.name || '??').substring(0, 2)}</div>
                    <div>
                        <div class="font-bold text-white text-sm">${item.name || 'Indexer'}</div>
                        <div class="text-[10px] text-gray-500 uppercase tracking-widest">${item.protocol || 'indexer'}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-mono ${statusColor} flex items-center gap-1"><i class="fas ${isOk ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${isOk ? 'OK' : 'OFF'}</span>
                </div>
            </div>`;
        }).join('');
    },

    // --- Batch Selection ---
    handleBatchSelection: (checkbox, id, type) => {
        // Placeholder for batch logic
        Logger.debug('UI', `Batch select: ${id} (${type}) - ${checkbox.checked}`);
    },

    // --- Media Detail Modal ---
    openMediaDetail: (id, type) => {
        // Placeholder for modal logic
        Logger.debug('UI', `Open detail: ${id} (${type})`);
        // In real impl, fetch details and show modal
    }
};
