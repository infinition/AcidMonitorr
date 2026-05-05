/**
 * notifications.js
 * Notification System
 */

const Notifications = {
    items: [],

    init: () => {
        // Load from local storage
        const stored = localStorage.getItem('acidmonitorr_notifications');
        if (stored) Notifications.items = JSON.parse(stored);

        Notifications.render();

        // Toggle dropdown
        const btn = document.getElementById('notif-btn');
        const dropdown = document.getElementById('notif-dropdown');
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
                Notifications.markAllRead();
            });

            // Close on click outside
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

        Notifications.save();
        Notifications.render();

        // Also show toast
        UI.showToast(title, type === 'error' ? 'danger' : 'info');
    },

    markAllRead: () => {
        Notifications.items.forEach(i => i.read = true);
        Notifications.save();
        Notifications.render();
    },

    save: () => {
        localStorage.setItem('acidmonitorr_notifications', JSON.stringify(Notifications.items));
    },

    render: () => {
        const badge = document.getElementById('notif-badge');
        const dropdown = document.getElementById('notif-dropdown');

        const unreadCount = Notifications.items.filter(i => !i.read).length;

        if (badge) {
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
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
                    <button onclick="Notifications.items=[]; Notifications.save(); Notifications.render();" class="text-xs text-acid-danger hover:underline">Tout effacer</button>
                </div>
            `;
        }
    },

    // Polling for new events (simplified)
    check: async () => {
        // In a real app, we would compare history state or check specific endpoints
        // For now, we rely on actions triggering notifications
    }
};
