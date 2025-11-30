let currentDashboardData = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const currentDateEl = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    fetchDashboardData();

    document.getElementById('update-stock-btn').addEventListener('click', async () => {
        const symbol = document.getElementById('stock-symbol').value;
        if (symbol) {
            await updateStockData(symbol);
        }
    });

    document.getElementById('fetch-options-btn').addEventListener('click', async () => {
        const ticker = document.getElementById('options-ticker').value;
        if (ticker) {
            await fetchOptionsData(ticker);
        }
    });

    document.getElementById('update-history-btn').addEventListener('click', async () => {
        const ticker = document.getElementById('history-ticker').value;
        if (ticker) {
            await updateOptionsRatioHistory(ticker);
        }
    });

    fetchOptionsRatioHistory('AAPL');

    // Initial fetch for Options Open Interest (SPY)
    fetchOptionsData('SPY');

    // Debounce function
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

    // Auto-fetch options on ticker input
    const optionsTickerInput = document.getElementById('options-ticker');
    optionsTickerInput.addEventListener('input', debounce(async (e) => {
        const ticker = e.target.value.toUpperCase();
        if (ticker && ticker.length >= 1) {
            await fetchOptionsData(ticker);
        }
    }, 1000)); // 1 second debounce
});

async function fetchDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        currentDashboardData = data;

        if (data.error) {
            console.error(data.error);
            return;
        }

        updateLastUpdated(data.generatedAtUtc);
        renderFedWatch(data.fedWatch);
        renderVix(data.vix);
        renderFearGreed(data.fearGreed);
        renderCPI(data.cpi);
        renderPPI(data.ppi);
        renderClaims(data.joblessClaims);
        renderHistoryTable(data.history);
        renderCombinedMacroChart(data.cpi, data.ppi, data.joblessClaims, data.sp500);
        renderInsight(data.insight);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}


async function updateStockData(symbol) {
    const btn = document.getElementById('update-stock-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
        const newStockData = await response.json();

        if (newStockData.error) {
            alert('Error fetching stock data: ' + newStockData.error);
            return;
        }

        // Update global data
        if (currentDashboardData) {
            currentDashboardData.sp500 = newStockData;
            renderCombinedMacroChart(
                currentDashboardData.cpi,
                currentDashboardData.ppi,
                currentDashboardData.joblessClaims,
                currentDashboardData.sp500
            );

            // Trigger AI Analysis
            renderInsight("Analyzing relationship...");
            const analysisResponse = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol,
                    macroData: {
                        cpi: currentDashboardData.cpi,
                        ppi: currentDashboardData.ppi,
                        joblessClaims: currentDashboardData.joblessClaims
                    }
                })
            });
            const analysisResult = await analysisResponse.json();
            renderInsight(analysisResult.insight);
        }

    } catch (error) {
        console.error('Error updating stock data:', error);
        alert('Failed to update stock data.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function updateLastUpdated(isoString) {
    const el = document.getElementById('last-updated');
    if (isoString) {
        el.textContent = new Date(isoString).toLocaleTimeString();
    }
}

function renderFedWatch(data) {
    if (!data) return;
    document.getElementById('fed-date').textContent = data.meetingDate;
    document.getElementById('fed-target').textContent = data.currentTargetRange;

    const cutPct = (data.cutProbability * 100).toFixed(1);
    const holdPct = (data.noChangeProbability * 100).toFixed(1);

    document.getElementById('fed-cut').textContent = `${cutPct}%`;
    document.getElementById('fed-cut-bar').style.width = `${cutPct}%`;

    document.getElementById('fed-hold').textContent = `${holdPct}%`;
    document.getElementById('fed-hold-bar').style.width = `${holdPct}%`;
}

function renderVix(data) {
    if (!data) return;
    document.getElementById('vix-open').textContent = data.todayOpen.toFixed(2);
    document.getElementById('vix-close').textContent = data.todayClose.toFixed(2);
    document.getElementById('vix-prev').textContent = data.previousClose.toFixed(2);
}

function renderFearGreed(data) {
    if (!data) return;
    const elValue = document.getElementById('fg-value');
    const elLabel = document.getElementById('fg-label');
    const elBar = document.getElementById('fg-bar');

    elValue.textContent = data.value;
    elLabel.textContent = data.label;
    elBar.style.width = `${data.value}%`;

    // Color coding based on value
    if (data.value < 25) elValue.className = "text-5xl font-bold text-red-600 mb-2";
    else if (data.value < 45) elValue.className = "text-5xl font-bold text-red-400 mb-2";
    else if (data.value < 55) elValue.className = "text-5xl font-bold text-yellow-400 mb-2";
    else if (data.value < 75) elValue.className = "text-5xl font-bold text-green-400 mb-2";
    else elValue.className = "text-5xl font-bold text-green-600 mb-2";
}

function renderCPI(data) {
    if (!data) return;
    document.getElementById('cpi-yoy').textContent = `${data.headlineYoY}%`;
    document.getElementById('cpi-mom').textContent = `${data.headlineMoM}%`;
    document.getElementById('cpi-date').textContent = data.releaseDate;

    renderHistoryTableGeneric('cpi-table-body', data.history, 'Value (%)');
    renderChart('cpi-chart', data.history, 'CPI YoY', 'rgb(45, 212, 191)');
}

function renderPPI(data) {
    if (!data) return;
    document.getElementById('ppi-yoy').textContent = `${data.headlineYoY}%`;
    document.getElementById('ppi-mom').textContent = `${data.headlineMoM}%`;
    document.getElementById('ppi-date').textContent = data.releaseDate;

    renderHistoryTableGeneric('ppi-table-body', data.history, 'Value (%)');
    renderChart('ppi-chart', data.history, 'PPI YoY', 'rgb(34, 211, 238)');
}

function renderClaims(data) {
    if (!data) return;
    document.getElementById('claims-initial').textContent = data.initialClaims.toLocaleString();
    document.getElementById('claims-avg').textContent = data.fourWeekAvg.toLocaleString();
    document.getElementById('claims-date').textContent = data.referenceWeekEndDate;

    renderHistoryTableGeneric('claims-table-body', data.history, 'Initial Claims');
    renderChart('claims-chart', data.history, 'Initial Claims', 'rgb(244, 114, 182)');
}

function renderHistoryTableGeneric(elementId, history, valueLabel) {
    const tbody = document.getElementById(elementId);
    tbody.innerHTML = '';

    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-500">No historical data available</td></tr>';
        return;
    }

    history.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800 hover:bg-slate-800/50 transition-colors";

        const dateStr = new Date(row.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        const value = row.value.toLocaleString();

        tr.innerHTML = `
            <td class="p-3 font-medium text-slate-200">${dateStr}</td>
            <td class="p-3">${value}</td>
        `;
        tbody.appendChild(tr);
    });
}

let charts = {}; // Store chart instances to destroy them before re-rendering

function renderChart(canvasId, history, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    if (!history || history.length === 0) return;

    // Sort by date ascending for chart
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedHistory.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const data = sortedHistory.map(item => item.value);

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155',
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function renderHistoryTable(history) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">No historical data available</td></tr>';
        return;
    }

    history.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800 hover:bg-slate-800/50 transition-colors";

        const dateStr = new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const vixOpen = row.vixOpen ? row.vixOpen.toFixed(2) : '-';
        const vixClose = row.vixClose ? row.vixClose.toFixed(2) : '-';

        // Helper for F&G Color
        const getFgClass = (val) => {
            if (val < 25) return "text-red-500";
            if (val < 45) return "text-red-400";
            if (val < 55) return "text-yellow-400";
            if (val < 75) return "text-green-400";
            return "text-green-500";
        };

        const fgOpenDisplay = row.fgOpen ? `<span class="${getFgClass(row.fgOpen)} font-bold">${row.fgOpen}</span>` : '-';
        const fgCloseDisplay = row.fgClose ? `<span class="${getFgClass(row.fgClose)} font-bold">${row.fgClose}</span>` : '-';

        const fedOpen = row.fedOpen ? `${(row.fedOpen * 100).toFixed(1)}%` : '-';
        const fedClose = row.fedClose ? `${(row.fedClose * 100).toFixed(1)}%` : '-';

        tr.innerHTML = `
            <td class="p-3 font-medium text-slate-200">${dateStr}</td>
            <td class="p-3">${vixOpen}</td>
            <td class="p-3">${vixClose}</td>
            <td class="p-3">${fgOpenDisplay}</td>
            <td class="p-3">${fgCloseDisplay}</td>
            <td class="p-3">${fedOpen}</td>
            <td class="p-3">${fedClose}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCombinedMacroChart(cpiData, ppiData, claimsData, sp500Data) {
    if (!cpiData || !ppiData || !claimsData || !sp500Data) return;

    const ctx = document.getElementById('macro-comparison-chart').getContext('2d');
    if (charts['macro-comparison-chart']) {
        charts['macro-comparison-chart'].destroy();
    }

    // 1. Process Data & Align to Monthly
    const getMonthKey = (d) => d.substring(0, 7); // "2025-10"

    const cpiMap = new Map(cpiData.history.map(item => [getMonthKey(item.date), item.value]));
    const ppiMap = new Map(ppiData.history.map(item => [getMonthKey(item.date), item.value]));

    const claimsByMonth = new Map();
    claimsData.history.forEach(item => {
        const key = getMonthKey(item.date);
        if (!claimsByMonth.has(key)) {
            claimsByMonth.set(key, []);
        }
        claimsByMonth.get(key).push(item.value);
    });

    const claimsMonthlyAvg = new Map();
    const sortedMonths = Array.from(claimsByMonth.keys()).sort();

    sortedMonths.forEach(month => {
        const values = claimsByMonth.get(month);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        claimsMonthlyAvg.set(month, avg);
    });

    const claimsPctChangeMap = new Map();
    for (let i = 1; i < sortedMonths.length; i++) {
        const currMonth = sortedMonths[i];
        const prevMonth = sortedMonths[i - 1];
        const currAvg = claimsMonthlyAvg.get(currMonth);
        const prevAvg = claimsMonthlyAvg.get(prevMonth);
        const pctChange = ((currAvg - prevAvg) / prevAvg) * 100;
        claimsPctChangeMap.set(currMonth, pctChange);
    }

    // S&P 500 MoM Calculation
    const sp500Map = new Map();
    // Sort ascending for calculation
    const sp500Sorted = [...sp500Data.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    sp500Sorted.forEach((item, index) => {
        // We need data from previous month to calculate MoM
        if (index > 0) {
            const prevItem = sp500Sorted[index - 1];
            // Calculate MoM
            const mom = ((item.close - prevItem.close) / prevItem.close) * 100;
            sp500Map.set(getMonthKey(item.date), mom);
        }
    });

    // 2. Create Unified Monthly Timeline
    const allMonths = new Set([
        ...cpiMap.keys(),
        ...ppiMap.keys(),
        ...claimsPctChangeMap.keys(),
        ...sp500Map.keys()
    ]);

    const timeline = Array.from(allMonths).sort();

    // 3. Map Data to Timeline
    const cpiSeries = timeline.map(m => cpiMap.get(m) || null);
    const ppiSeries = timeline.map(m => ppiMap.get(m) || null);
    const claimsSeries = timeline.map(m => claimsPctChangeMap.get(m) || null);
    const sp500Series = timeline.map(m => sp500Map.get(m) || null);

    const labels = timeline.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    });

    // Custom Tooltip Handler
    const getOrCreateTooltip = (chart) => {
        let tooltipEl = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.classList.add('chartjs-tooltip');
            tooltipEl.style.background = 'rgba(30, 41, 59, 0.95)';
            tooltipEl.style.borderRadius = '8px';
            tooltipEl.style.color = 'white';
            tooltipEl.style.opacity = 1;
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.transform = 'translate(-50%, 0)';
            tooltipEl.style.transition = 'all .1s ease';
            tooltipEl.style.border = '1px solid rgba(51, 65, 85, 1)';
            tooltipEl.style.padding = '10px';
            tooltipEl.style.zIndex = '100';
            tooltipEl.style.fontFamily = 'Inter, sans-serif';
            tooltipEl.style.fontSize = '13px';
            tooltipEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

            const table = document.createElement('table');
            table.style.margin = '0px';

            tooltipEl.appendChild(table);
            chart.canvas.parentNode.appendChild(tooltipEl);
        }

        return tooltipEl;
    };

    const externalTooltipHandler = (context) => {
        // Tooltip Element
        const { chart, tooltip } = context;
        const tooltipEl = getOrCreateTooltip(chart);

        // Hide if no tooltip
        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        // Set Text
        if (tooltip.body) {
            const titleLines = tooltip.title || [];
            const bodyLines = tooltip.body.map(b => b.lines);

            const tableHead = document.createElement('thead');

            titleLines.forEach(title => {
                const tr = document.createElement('tr');
                tr.style.borderWidth = 0;
                const th = document.createElement('th');
                th.style.borderWidth = 0;
                th.style.textAlign = 'left';
                th.style.paddingBottom = '8px';
                th.style.color = '#94a3b8';
                th.style.fontWeight = '600';
                th.innerText = title;
                tr.appendChild(th);
                tableHead.appendChild(tr);
            });

            const tableBody = document.createElement('tbody');
            bodyLines.forEach((body, i) => {
                const colors = tooltip.labelColors[i];
                const dataPoint = context.tooltip.dataPoints[i];
                const datasetIndex = dataPoint.datasetIndex;
                const index = dataPoint.dataIndex;
                const dataset = chart.data.datasets[datasetIndex];

                // Get current and previous values
                const currentValue = dataset.data[index];
                const prevValue = index > 0 ? dataset.data[index - 1] : null;

                let arrow = '';
                let valueColor = '#e2e8f0'; // Default slate-200

                if (prevValue !== null && currentValue !== null) {
                    if (currentValue > prevValue) {
                        arrow = '▲';
                        valueColor = '#4ade80'; // green-400
                    } else if (currentValue < prevValue) {
                        arrow = '▼';
                        valueColor = '#f87171'; // red-400
                    }
                }

                const span = document.createElement('span');
                span.style.background = colors.backgroundColor;
                span.style.borderColor = colors.borderColor;
                span.style.borderWidth = '2px';
                span.style.marginRight = '8px';
                span.style.height = '10px';
                span.style.width = '10px';
                span.style.display = 'inline-block';
                span.style.borderRadius = '2px';

                const tr = document.createElement('tr');
                tr.style.backgroundColor = 'inherit';
                tr.style.borderWidth = 0;

                const td = document.createElement('td');
                td.style.borderWidth = 0;
                td.style.padding = '4px 0';
                td.style.display = 'flex';
                td.style.alignItems = 'center';

                const textContainer = document.createElement('div');
                textContainer.style.display = 'flex';
                textContainer.style.justifyContent = 'space-between';
                textContainer.style.width = '100%';
                textContainer.style.gap = '12px';

                const labelText = document.createElement('span');
                labelText.innerText = dataset.label.split('(')[0].trim(); // Clean up label
                labelText.style.color = '#cbd5e1';

                const valueText = document.createElement('span');
                valueText.style.color = valueColor;
                valueText.style.fontWeight = '600';
                valueText.innerHTML = `${currentValue.toFixed(2)}% <span style="margin-left: 4px; font-size: 10px;">${arrow}</span>`;

                td.appendChild(span);
                textContainer.appendChild(labelText);
                textContainer.appendChild(valueText);
                td.appendChild(textContainer);
                tr.appendChild(td);
                tableBody.appendChild(tr);
            });

            const tableRoot = tooltipEl.querySelector('table');

            // Remove old children
            while (tableRoot.firstChild) {
                tableRoot.firstChild.remove();
            }

            // Add new children
            tableRoot.appendChild(tableHead);
            tableRoot.appendChild(tableBody);
        }

        const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

        // Display, position, and set styles for font
        tooltipEl.style.opacity = 1;
        tooltipEl.style.left = positionX + tooltip.caretX + 'px';
        tooltipEl.style.top = positionY + tooltip.caretY + 'px';
        tooltipEl.style.font = tooltip.options.bodyFont.string;
        tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
    };

    charts['macro-comparison-chart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'CPI YoY (%)',
                    data: cpiSeries,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: 'PPI YoY (%)',
                    data: ppiSeries,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: 'Jobless Claims (MoM % Change)',
                    data: claimsSeries,
                    borderColor: 'rgb(255, 255, 255)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: `${sp500Data.symbol} MoM (%)`,
                    data: sp500Series,
                    borderColor: 'rgb(168, 85, 247)', // Purple-500
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e2e8f0'
                    }
                },
                tooltip: {
                    enabled: false, // Disable default tooltip
                    position: 'nearest',
                    external: externalTooltipHandler
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155',
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    title: {
                        display: true,
                        text: 'Percentage / % Change',
                        color: '#64748b'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            }
        }
    });

    // Ensure the tooltip table exists in the DOM structure created by getOrCreateTooltip
    // We need to initialize the innerHTML of the tooltip element once to contain the table
    const chartCanvas = document.getElementById('macro-comparison-chart');
    const tooltipEl = chartCanvas.parentNode.querySelector('div.chartjs-tooltip');
    if (!tooltipEl) {
        // It will be created on first hover, but we need to ensure the table structure is there
        // The external handler does this:
        // const tableRoot = tooltipEl.querySelector('table');
        // So we should add the table when creating the element.
        // I'll update getOrCreateTooltip to add the table if it's new.
    }
}

function renderInsight(insightText) {
    const el = document.getElementById('ai-insight-text');
    if (insightText) {
        el.textContent = insightText;
    } else {
        el.textContent = "Insight unavailable.";
    }
}

let currentOptionsData = [];

document.getElementById('options-date').addEventListener('change', () => {
    const selectedDate = document.getElementById('options-date').value;
    if (selectedDate && currentOptionsData.length > 0) {
        const filteredData = currentOptionsData.filter(d => d.details.expiration_date === selectedDate);
        renderOptionsChart(filteredData, document.getElementById('options-ticker').value);
        renderOptionsRatioChart(filteredData, document.getElementById('options-ticker').value);
    }
});

async function fetchOptionsData(ticker) {
    const btn = document.getElementById('fetch-options-btn');
    const dateSelect = document.getElementById('options-date');

    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;

    try {
        // Always fetch ALL data to get available dates
        let url = `/api/options?ticker=${encodeURIComponent(ticker)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            alert('Error fetching options data: ' + data.error);
            return;
        }

        currentOptionsData = data;

        // Extract unique expiration dates
        const dates = [...new Set(data.map(d => d.details.expiration_date))].sort();

        // Populate dropdown
        dateSelect.innerHTML = '';
        if (dates.length === 0) {
            const option = document.createElement('option');
            option.text = "No dates found";
            dateSelect.add(option);
            return; // No data to render
        }

        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.text = date;
            dateSelect.add(option);
        });

        // Select nearest date (first one)
        dateSelect.selectedIndex = 0;
        const nearestDate = dates[0];

        // Filter data for nearest date
        const filteredData = data.filter(d => d.details.expiration_date === nearestDate);

        renderOptionsChart(filteredData, ticker);
        renderOptionsRatioChart(filteredData, ticker);

    } catch (error) {
        console.error('Error fetching options data:', error);
        alert('Failed to fetch options data.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function renderOptionsChart(data, ticker) {
    const ctx = document.getElementById('options-chart').getContext('2d');
    if (charts['options-chart']) {
        charts['options-chart'].destroy();
    }

    if (!data || data.length === 0) {
        // Handle empty data
        return;
    }

    // Process data: Group by strike price and sum open interest
    // Or just show top open interest strikes?
    // Let's group by strike and separate calls and puts

    // Simple aggregation for now: Open Interest by Strike
    // We need to distinguish Calls and Puts

    const calls = data.filter(d => d.details.contract_type === 'call');
    const puts = data.filter(d => d.details.contract_type === 'put');

    // Create a map of strike -> { callOI, putOI }
    const strikeMap = new Map();

    calls.forEach(d => {
        const strike = d.details.strike_price;
        if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
        strikeMap.get(strike).call += d.open_interest;
    });

    puts.forEach(d => {
        const strike = d.details.strike_price;
        if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
        strikeMap.get(strike).put += d.open_interest;
    });

    // Sort by strike price
    const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);

    // Filter to a reasonable range around current price? 
    // Since we don't have current price easily here without another call, let's just show top OI strikes or a range.
    // For now, let's show all, but maybe limit if too many.

    // Let's filter to strikes with significant OI to reduce noise
    const significantStrikes = sortedStrikes.filter(strike => {
        const oi = strikeMap.get(strike);
        return (oi.call + oi.put) > 100; // Arbitrary threshold
    });

    const labels = significantStrikes;
    const callData = significantStrikes.map(s => strikeMap.get(s).call);
    const putData = significantStrikes.map(s => strikeMap.get(s).put);

    charts['options-chart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Calls Open Interest',
                    data: callData,
                    backgroundColor: 'rgba(74, 222, 128, 0.6)', // Green
                    borderColor: 'rgba(74, 222, 128, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Puts Open Interest',
                    data: putData,
                    backgroundColor: 'rgba(248, 113, 113, 0.6)', // Red
                    borderColor: 'rgba(248, 113, 113, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Strike Price', color: '#64748b' }
                },
                y: {
                    stacked: true,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Open Interest', color: '#64748b' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                title: {
                    display: true,
                    text: `Options Open Interest for ${ticker}`,
                    color: '#e2e8f0'
                }
            }
        }
    });
}

function renderOptionsRatioChart(data, ticker) {
    const ctx = document.getElementById('options-ratio-chart').getContext('2d');
    if (charts['options-ratio-chart']) {
        charts['options-ratio-chart'].destroy();
    }

    if (!data || data.length === 0) return;

    const calls = data.filter(d => d.details.contract_type === 'call');
    const puts = data.filter(d => d.details.contract_type === 'put');

    const strikeMap = new Map();

    calls.forEach(d => {
        const strike = d.details.strike_price;
        if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
        strikeMap.get(strike).call += d.open_interest;
    });

    puts.forEach(d => {
        const strike = d.details.strike_price;
        if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
        strikeMap.get(strike).put += d.open_interest;
    });

    const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);

    // Filter significant strikes same as above to keep X-axis consistent or just filter for ratio relevance
    // Let's use the same significant strikes logic to keep it clean
    const significantStrikes = sortedStrikes.filter(strike => {
        const oi = strikeMap.get(strike);
        return (oi.call + oi.put) > 100;
    });

    const labels = significantStrikes;
    const ratioData = significantStrikes.map(s => {
        const oi = strikeMap.get(s);
        if (oi.put === 0) return null; // Avoid division by zero
        return oi.call / oi.put;
    });

    charts['options-ratio-chart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Call/Put OI Ratio',
                data: ratioData,
                borderColor: 'rgb(250, 204, 21)', // Yellow-400
                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Strike Price', color: '#64748b' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Ratio (Call / Put)', color: '#64748b' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1
                },
                title: {
                    display: true,
                    text: `Call/Put OI Ratio for ${ticker}`,
                    color: '#e2e8f0'
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    // Render Table
    const tbody = document.getElementById('options-ratio-table-body');
    if (tbody) {
        tbody.innerHTML = '';

        significantStrikes.forEach(strike => {
            const oi = strikeMap.get(strike);
            let ratioVal = 0;
            let ratioDisplay = '∞';

            if (oi.put !== 0) {
                ratioVal = oi.call / oi.put;
                ratioDisplay = ratioVal.toFixed(2);
            }

            const totalOI = (oi.call + oi.put).toLocaleString();

            let colorClass = "text-yellow-400"; // Default
            if (oi.put !== 0) {
                if (ratioVal >= 1.5) colorClass = "text-green-400";
                else if (ratioVal <= 0.6) colorClass = "text-red-400";
            }

            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-800 hover:bg-slate-800/50 transition-colors";
            tr.innerHTML = `
                <td class="p-3 font-medium text-slate-200">${strike}</td>
                <td class="p-3 ${colorClass} font-bold">${ratioDisplay}</td>
                <td class="p-3 text-slate-400">${totalOI}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function fetchOptionsRatioHistory(ticker = 'AAPL') {
    try {
        const response = await fetch(`/api/options/ratio-history?ticker=${encodeURIComponent(ticker)}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error fetching options ratio history:', data.error);
            return;
        }

        renderOptionsRatioHistoryChart(data, ticker);

    } catch (error) {
        console.error('Error fetching options ratio history:', error);
    }
}

async function updateOptionsRatioHistory(ticker) {
    const btn = document.getElementById('update-history-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Updating...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/options/ratio-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker })
        });
        const data = await response.json();

        if (data.error) {
            alert('Error updating options ratio history: ' + data.error);
            return;
        }

        renderOptionsRatioHistoryChart(data, ticker);

    } catch (error) {
        console.error('Error updating options ratio history:', error);
        alert('Failed to update options ratio history.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function renderOptionsRatioHistoryChart(history, ticker) {
    const ctx = document.getElementById('options-ratio-history-chart').getContext('2d');
    if (charts['options-ratio-history-chart']) {
        charts['options-ratio-history-chart'].destroy();
    }

    if (!history || history.length === 0) {
        // If no history, maybe clear chart or show empty message?
        // For now just return, but clearing chart is better UX if switching to empty ticker
        return;
    }

    // Sort by timestamp
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = sortedHistory.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    });

    const data = sortedHistory.map(item => item.ratio);

    charts['options-ratio-history-chart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Call/Put Ratio',
                data: data,
                borderColor: 'rgb(236, 72, 153)', // Pink-500
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Time', color: '#64748b' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Ratio', color: '#64748b' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1
                },
                title: {
                    display: true,
                    text: `Call/Put OI Ratio History (${ticker})`,
                    color: '#e2e8f0'
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}
