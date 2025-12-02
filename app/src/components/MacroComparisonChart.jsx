import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const MacroComparisonChart = ({ cpiData, ppiData, claimsData, sp500Data, onUpdateStock }) => {
    const [stockSymbol, setStockSymbol] = useState(sp500Data?.symbol || '^GSPC');
    const isMock = cpiData?.isMock || ppiData?.isMock || claimsData?.isMock || sp500Data?.isMock;

    const chartData = useMemo(() => {
        if (!cpiData || !ppiData || !claimsData || !sp500Data) return null;

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
        const sp500Sorted = [...sp500Data.history].sort((a, b) => new Date(a.date) - new Date(b.date));

        sp500Sorted.forEach((item, index) => {
            if (index > 0) {
                const prevItem = sp500Sorted[index - 1];
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

        return {
            labels,
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
        };
    }, [cpiData, ppiData, claimsData, sp500Data]);

    const handleUpdate = () => {
        if (stockSymbol) {
            onUpdateStock(stockSymbol);
        }
    };

    // Custom Tooltip Logic (Ported from app.js)
    const externalTooltipHandler = (context) => {
        // Tooltip Element
        const { chart, tooltip } = context;
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
                labelText.innerText = dataset.label.split('(')[0].trim();
                labelText.style.color = '#cbd5e1';

                const valueText = document.createElement('span');
                valueText.style.color = valueColor;
                valueText.style.fontWeight = '600';
                valueText.innerHTML = `${currentValue ? currentValue.toFixed(2) : 'N/A'}% <span style="margin-left: 4px; font-size: 10px;">${arrow}</span>`;

                td.appendChild(span);
                textContainer.appendChild(labelText);
                textContainer.appendChild(valueText);
                td.appendChild(textContainer);
                tr.appendChild(td);
                tableBody.appendChild(tr);
            });

            const tableRoot = tooltipEl.querySelector('table');
            while (tableRoot.firstChild) {
                tableRoot.firstChild.remove();
            }
            tableRoot.appendChild(tableHead);
            tableRoot.appendChild(tableBody);
        }

        const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

        tooltipEl.style.opacity = 1;
        tooltipEl.style.left = positionX + tooltip.caretX + 'px';
        tooltipEl.style.top = positionY + tooltip.caretY + 'px';
        tooltipEl.style.font = tooltip.options.bodyFont.string;
        tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#e2e8f0' }
            },
            tooltip: {
                enabled: false,
                position: 'nearest',
                external: externalTooltipHandler
            }
        },
        scales: {
            x: {
                grid: { color: '#334155', display: false },
                ticks: { color: '#94a3b8' }
            },
            y: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' },
                title: { display: true, text: 'Percentage / % Change', color: '#64748b' }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        }
    };

    if (!chartData) return null;

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-200">Economic Indicators Comparison (YoY % Change)</h2>
                <div className="flex gap-2 items-center">
                    {isMock && <span className="bg-yellow-900 text-yellow-200 text-xs px-2 py-1 rounded">Mock Data</span>}
                    <input
                        type="text"
                        placeholder="Symbol (e.g. AAPL)"
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5"
                        value={stockSymbol}
                        onChange={(e) => setStockSymbol(e.target.value)}
                    />
                    <button
                        onClick={handleUpdate}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none"
                    >
                        Update
                    </button>
                </div>
            </div>
            <div className="h-96 relative">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default MacroComparisonChart;
