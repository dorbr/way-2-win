
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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

const ShillerHistoryTable = ({ symbol }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'table'

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/shiller/history?symbol=${symbol || '^GSPC'}`);
                setData(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching Shiller PE:', err);
                setError('Failed to load data');
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol]);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        // Sort data by date ascending for the chart
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = sortedData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        });

        const values = sortedData.map(item => item.value);

        return {
            labels,
            datasets: [
                {
                    label: 'Shiller PE',
                    data: values,
                    borderColor: 'rgb(59, 130, 246)', // Blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }
            ]
        };
    }, [data]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                titleColor: '#cbd5e1',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(51, 65, 85, 1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: (context) => `Shiller PE: ${context.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: '#334155',
                    display: false
                },
                ticks: {
                    color: '#94a3b8',
                    maxTicksLimit: 12
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
                    text: 'Ratio',
                    color: '#64748b'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (loading) return <div className="text-slate-400 text-sm">Loading Shiller PE...</div>;
    if (error) return <div className="text-red-400 text-sm">{error}</div>;

    const title = !symbol || symbol === '^GSPC' || symbol === 'SPY' ? 'S&P 500 Shiller PE Ratio' : `${symbol} Shiller PE Ratio`;
    const source = !symbol || symbol === '^GSPC' || symbol === 'SPY' ? 'Source: multpl.com' : 'Source: Yahoo Finance (Calc)';

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <span className="text-xs text-slate-400 block">{source}</span>
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('graph')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'graph' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Graph
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Table
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative min-h-[400px]">
                {viewMode === 'graph' ? (
                    <div className="absolute inset-0 p-4">
                        {chartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                No data available for graph
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 overflow-y-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(data) && data.length > 0 ? (
                                    data.map((item, index) => (
                                        <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                                            <td className="px-6 py-3 font-medium">{item.date}</td>
                                            <td className={`px-6 py-3 text-right font-bold ${item.value > 25 ? 'text-red-400' : item.value < 15 ? 'text-green-400' : 'text-blue-400'}`}>
                                                {item.value.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="px-6 py-4 text-center text-slate-500">
                                            No Shiller PE data available for this symbol.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShillerHistoryTable;
