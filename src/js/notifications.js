/**
 * notifications.js - Notification System (Tauri)
 * Notifications are stored in memory (not persisted - they're transient)
 */

const Notifications = {
    items: [],

    init: () => {
        Notifications.render();

        const btn = document.getElementById('notif-btn');
        const dropdown = document.getElementById('notif-dropdown');
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
                Notifications.markAllRead();
            });
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        }
    },

    add: (title, message, type = 'info') => {
        const notif = {
            id: Date.now(),
            title,
            message,
            type,
            date: new Date().toISOString(),
            read: false
        };
        Notifications.items.unshift(notif);
        if (Notifications.items.length > 20) Notifications.items.pop();
        Notifications.render();
        UI.showToast(title, type === 'error' ? 'danger' : 'info');
    },

    markAllRead: () => {
        Notifications.items.forEach(i => i.read = true);
        Notifications.render();
    },

    render: () => {
        const badge = document.getElementById('notif-badge');
        const dropdown = document.getElementById('notif-dropdown');
        const unreadCount = Notifications.items.filter(i => !i.read).length;

        if (badge) {
            badge.classList.toggle('hidden', unreadCount === 0);
        }

        if (dropdown) {
            if (Notifications.items.length === 0) {
                dropdown.innerHTML = '<div class="p-4 text-center text-gray-500 text-xs">Aucune notification</div>';
                return;
            }
            dropdown.innerHTML = `
                <div class="max-h-64 overflow-y-auto">
                    ${Notifications.items.map(i => `
                        <div class="p-3 border-b border-gray-700 hover:bg-white/5 ${i.read ? 'opacity-60' : 'opacity-100'}">
                            <div class="flex justify-between items-start">
                                <h4 class="text-xs font-bold text-white">${i.title}</h4>
                                <span class="text-[10px] text-gray-500">${new Date(i.date).toLocaleTimeString()}</span>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">${i.message}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="p-2 bg-gray-900 border-t border-gray-700 text-center">
                    <button data-action="clear-notifications" class="text-xs text-acid-danger hover:underline">Tout effacer</button>
                </div>
            `;
        }
    },

    check: async () => {
        // Placeholder - in future could compare queue state for new downloads
    }
};
