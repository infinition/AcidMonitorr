/**
 * utils.js
 * Utility functions and Logger for AcidMonitorr v3.0
 */

const Logger = {
    debug: (module, message, data) => {
        console.debug(`[DEBUG][${module}] ${message}`, data || '');
    },
    info: (module, message, data) => {
        console.info(`[INFO][${module}] ${message}`, data || '');
    },
    warn: (module, message, data) => {
        console.warn(`[WARN][${module}] ${message}`, data || '');
    },
    error: (module, message, error) => {
        console.error(`[ERROR][${module}] ${message}`, error);
    },
    api: (service, endpoint, status, duration) => {
        const color = status >= 200 && status < 300 ? 'green' : 'red';
        console.log(`%c[API][${service}] ${endpoint} (${status}) - ${duration}ms`, `color: ${color}`);
    }
};

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format bytes to human readable string
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format duration (minutes to h m)
function formatDuration(minutes) {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
