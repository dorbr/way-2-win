import React from 'react';
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

const MacroHistorySection = ({ title, data, valueLabel, color }) => {
    if (!data || !data.history) return null;

    const history = data.history;
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sortedHistory.map(item => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const chartDataValues = sortedHistory.map(item => item.value);

    // Convert tailwind color name to RGB/RGBA if possible, or just use hardcoded values based on prop
    // Mapping for simplicity based on expected props: 'teal', 'cyan', 'pink'
    let borderColor = 'rgb(203, 213, 225)'; // default slate-300
    let backgroundColor = 'rgba(203, 213, 225, 0.1)';

    if (color === 'teal') {
        borderColor = 'rgb(45, 212, 191)';
        backgroundColor = 'rgba(45, 212, 191, 0.1)';
    } else if (color === 'cyan') {
        borderColor = 'rgb(34, 211, 238)';
        backgroundColor = 'rgba(34, 211, 238, 0.1)';
    } else if (color === 'pink') {
        borderColor = 'rgb(244, 114, 182)';
        backgroundColor = 'rgba(244, 114, 182, 0.1)';
    }

    const chartData = {
        labels,
        datasets: [
            {
                label: valueLabel,
                data: chartDataValues,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                grid: { display: false, color: '#334155' },
                ticks: { color: '#94a3b8' },
            },
            y: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700 sticky top-0 bg-card-bg">
                                <th className="p-3">Date</th>
                                <th className="p-3">{valueLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {history.length === 0 ? (
                                <tr><td colSpan="2" className="p-4 text-center text-slate-500">No historical data available</td></tr>
                            ) : (
                                history.map((row, index) => (
                                    <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-medium text-slate-200">
                                            {new Date(row.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="p-3">{row.value.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="h-80">
                    <Line data={chartData} options={options} />
                </div>
            </div>
        </div>
    );
};

export default MacroHistorySection;
