/**
 * stats.js - Statistics and Charts (Tauri)
 */

const Stats = {
    generateStats: (historyData) => {
        const stats = {
            activity: {},
            indexers: {},
            kpi: { success: 0, failed: 0 }
        };

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        historyData.forEach(item => {
            const date = new Date(item.date);
            if (date >= sevenDaysAgo) {
                const dateStr = date.toLocaleDateString();
                stats.activity[dateStr] = (stats.activity[dateStr] || 0) + 1;

                if (item.eventType === 'grabbed') {
                    const indexer = item.data?.indexer || 'Unknown';
                    stats.indexers[indexer] = (stats.indexers[indexer] || 0) + 1;
                }

                if (item.eventType === 'downloadFolderImported') stats.kpi.success++;
                if (item.eventType === 'downloadFailed') stats.kpi.failed++;
            }
        });

        return stats;
    },

    renderCharts: (stats) => {
        const ctxActivity = document.getElementById('activity-chart');
        if (ctxActivity && typeof Chart !== 'undefined') {
            if (ctxActivity.chart) ctxActivity.chart.destroy();

            const labels = Object.keys(stats.activity).reverse();
            const data = Object.values(stats.activity).reverse();

            ctxActivity.chart = new Chart(ctxActivity, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Telechargements',
                        data: data,
                        borderColor: '#ccff00',
                        backgroundColor: 'rgba(204, 255, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
                        x: { grid: { display: false }, ticks: { color: '#888' } }
                    }
                }
            });
        }

        const ctxIndexer = document.getElementById('indexer-chart');
        if (ctxIndexer && typeof Chart !== 'undefined') {
            if (ctxIndexer.chart) ctxIndexer.chart.destroy();

            const sortedIndexers = Object.entries(stats.indexers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            ctxIndexer.chart = new Chart(ctxIndexer, {
                type: 'bar',
                data: {
                    labels: sortedIndexers.map(i => i[0]),
                    datasets: [{
                        label: 'Grabs',
                        data: sortedIndexers.map(i => i[1]),
                        backgroundColor: '#00d2ff',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
                        x: { grid: { display: false }, ticks: { color: '#888' } }
                    }
                }
            });
        }
    }
};
