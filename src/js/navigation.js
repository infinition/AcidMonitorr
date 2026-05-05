/**
 * navigation.js - SPA Navigation Logic (Tauri)
 */

function showSection(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));

    const target = document.getElementById(`section-${id}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }

    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll) mainScroll.scrollTop = 0;

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'border-acid-green', 'bg-white/5', 'text-acid-green');
        el.classList.add('text-gray-400', 'border-transparent');
    });

    const nav = document.getElementById(`nav-${id}`);
    if (nav) {
        nav.classList.add('active', 'border-acid-green', 'bg-white/5', 'text-acid-green');
        nav.classList.remove('text-gray-400', 'border-transparent');
    }

    State.ui.activeSection = id;
    Config.activeSection = id;
    // Save section preference (debounced to avoid excessive writes)
    if (window._saveSectionTimeout) clearTimeout(window._saveSectionTimeout);
    window._saveSectionTimeout = setTimeout(() => Config.save(), 2000);

    Logger.info('NAV', `Switched to section: ${id}`);
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }
});
