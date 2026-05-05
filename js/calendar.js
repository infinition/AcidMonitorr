/**
 * calendar.js
 * Release Calendar Logic
 */

const Calendar = {
    currentDate: new Date(),

    init: () => {
        Calendar.render(Calendar.currentDate);
    },

    changeMonth: (delta) => {
        Calendar.currentDate.setMonth(Calendar.currentDate.getMonth() + delta);
        Calendar.render(Calendar.currentDate);
    },

    render: async (date) => {
        const monthDisplay = document.getElementById('calendar-month-display');
        const grid = document.getElementById('calendar-grid');

        if (!monthDisplay || !grid) return;

        const year = date.getFullYear();
        const month = date.getMonth();

        monthDisplay.innerText = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        // Clear grid
        grid.innerHTML = '<div class="col-span-7 text-center py-10"><div class="loader h-8 w-8 border-4 border-gray-600 mx-auto"></div></div>';

        // Fetch events
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const events = await API.fetchCalendar(startStr, endStr);

        // Generate Grid HTML
        let html = '';

        // Headers
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        days.forEach(d => html += `<div class="text-center text-xs font-bold text-gray-500 py-2 bg-gray-900">${d}</div>`);

        // Empty slots for start of month
        let firstDay = start.getDay() || 7; // 1 (Mon) - 7 (Sun)
        for (let i = 1; i < firstDay; i++) {
            html += `<div class="bg-gray-900/50 min-h-[100px]"></div>`;
        }

        // Days
        const lastDate = end.getDate();
        for (let i = 1; i <= lastDate; i++) {
            const currentDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date.startsWith(currentDayStr));
            const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

            html += `
            <div class="bg-gray-900/80 min-h-[100px] p-2 border border-gray-800 relative hover:bg-gray-800 transition-colors group ${isToday ? 'ring-1 ring-acid-green' : ''}">
                <div class="text-xs font-bold ${isToday ? 'text-acid-green' : 'text-gray-500'} mb-2">${i}</div>
                <div class="space-y-1">
                    ${dayEvents.slice(0, 3).map(e => {
                const color = e.hasFile ? 'text-green-400' : (new Date(e.date) < new Date() ? 'text-red-400' : 'text-gray-400');
                return `<div class="text-[10px] truncate ${color}" title="${e.title}">
                            <i class="fas ${e.type === 'series' ? 'fa-tv' : 'fa-film'} mr-1"></i>${e.title}
                        </div>`;
            }).join('')}
                    ${dayEvents.length > 3 ? `<div class="text-[10px] text-acid-accent text-center">+${dayEvents.length - 3} autres</div>` : ''}
                </div>
            </div>`;
        }

        grid.innerHTML = html;
    }
};

// Global helper
function changeMonth(delta) {
    Calendar.changeMonth(delta);
}
