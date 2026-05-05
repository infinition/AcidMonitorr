/**
 * navigation.js
 * SPA Navigation Logic
 */

function showSection(id) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));

    // Show target section
    const target = document.getElementById(`section-${id}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }

    // Reset scroll
    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll) mainScroll.scrollTop = 0;

    // Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'border-acid-green', 'bg-white/5', 'text-acid-green');
        el.classList.add('text-gray-400', 'border-transparent');
    });

    const nav = document.getElementById(`nav-${id}`);
    if (nav) {
        nav.classList.add('active', 'border-acid-green', 'bg-white/5', 'text-acid-green');
        nav.classList.remove('text-gray-400', 'border-transparent');
    }

    // Save state
    State.ui.activeSection = id;
    localStorage.setItem('acidmonitorr_active_section', id);

    Logger.info('NAV', `Switched to section: ${id}`);
}

// Mobile Menu
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }
});
