/**
 * stats.js
 * Statistics and Charts
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

            // Activity (Last 7 days)
            if (date >= sevenDaysAgo) {
                const dateStr = date.toLocaleDateString();
                stats.activity[dateStr] = (stats.activity[dateStr] || 0) + 1;

                if (item.eventType === 'grabbed') {
                    // Indexer stats
                    const indexer = item.data?.indexer || 'Unknown';
                    stats.indexers[indexer] = (stats.indexers[indexer] || 0) + 1;
                }

                // KPIs
                if (item.eventType === 'downloadFolderImported') stats.kpi.success++;
                if (item.eventType === 'downloadFailed') stats.kpi.failed++;
            }
        });

        return stats;
    },

    renderCharts: (stats) => {
        // Activity Chart
        const ctxActivity = document.getElementById('activity-chart');
        if (ctxActivity) {
            // Destroy existing if any (store instance on canvas element)
            if (ctxActivity.chart) ctxActivity.chart.destroy();

            const labels = Object.keys(stats.activity).reverse(); // Oldest first
            const data = Object.values(stats.activity).reverse();

            ctxActivity.chart = new Chart(ctxActivity, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Téléchargements',
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
                        y: { beginAtZero: true, grid: { color: '#333' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Indexer Chart
        const ctxIndexer = document.getElementById('indexer-chart');
        if (ctxIndexer) {
            if (ctxIndexer.chart) ctxIndexer.chart.destroy();

            // Sort indexers by count
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
                        y: { beginAtZero: true, grid: { color: '#333' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }
};
