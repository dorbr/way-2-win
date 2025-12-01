import React, { useState, useEffect, useMemo } from 'react';
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

const StockVolumeChart = () => {
    const [symbol, setSymbol] = useState('SPY');
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [inputSymbol, setInputSymbol] = useState('SPY');
    const [period, setPeriod] = useState(20);

    const fetchData = async (ticker) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch 2 years of daily data to ensure we have enough for larger MAs (like 150)
            const response = await fetch(`/api/stock?symbol=${ticker}&interval=1d&range=2y`);
            if (!response.ok) {
                throw new Error('Failed to fetch stock data');
            }
            const data = await response.json();
            setStockData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(symbol);
    }, [symbol]);

    const handleUpdate = () => {
        if (inputSymbol) {
            setSymbol(inputSymbol.toUpperCase());
        }
    };

    const chartData = useMemo(() => {
        if (!stockData || !stockData.history) return null;

        // Sort by date ascending for the chart
        const sortedHistory = [...stockData.history].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Moving Average of Volume based on selected period
        const volumeMA = [];

        for (let i = 0; i < sortedHistory.length; i++) {
            if (i < period - 1) {
                volumeMA.push(null); // Not enough data
                continue;
            }

            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += sortedHistory[i - j].volume;
            }
            volumeMA.push(sum / period);
        }

        // Calculate Relative Volume
        const rVol = sortedHistory.map((item, index) => {
            const avgVol = volumeMA[index];
            if (!avgVol) return null;
            return item.volume / avgVol;
        });

        // Filter out nulls at the beginning to show a clean chart
        // We want to show the last 1 year of data effectively, or whatever is available after the MA period
        // Let's just slice off the first 'period' elements to ensure valid RVol
        const startIndex = period;

        // Ensure we don't slice out of bounds or show too little data
        // If we have 2 years (approx 500 days), and period is 150, we have ~350 days to show.

        const labels = sortedHistory.slice(startIndex).map(item => item.date);
        const prices = sortedHistory.slice(startIndex).map(item => item.close);
        const rVolData = rVol.slice(startIndex);

        return {
            labels,
            datasets: [
                {
                    label: 'Price',
                    data: prices,
                    borderColor: 'rgb(59, 130, 246)', // Blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Relative Volume',
                    data: rVolData,
                    borderColor: 'rgb(168, 85, 247)', // Purple-500
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    yAxisID: 'y1',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        };
    }, [stockData, period]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#e2e8f0' }
            },
            title: {
                display: false,
                text: `${symbol} Price vs Relative Volume`,
                color: '#e2e8f0'
            }
        },
        scales: {
            x: {
                grid: { color: '#334155', display: false },
                ticks: { color: '#94a3b8' }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' },
                title: { display: true, text: 'Price ($)', color: '#64748b' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: { color: '#94a3b8' },
                title: { display: true, text: 'Relative Volume', color: '#64748b' },
            },
        },
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-200">Price vs Relative Volume</h2>
                <div className="flex gap-2 items-center">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value={20}>20-Day SMA</option>
                        <option value={90}>90-Day SMA</option>
                        <option value={150}>150-Day SMA</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Symbol"
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-24 p-2.5"
                        value={inputSymbol}
                        onChange={(e) => setInputSymbol(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                    />
                    <button
                        onClick={handleUpdate}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none"
                    >
                        Update
                    </button>
                </div>
            </div>

            {loading && <div className="text-slate-400 text-center py-10">Loading data...</div>}
            {error && <div className="text-red-400 text-center py-10">Error: {error}</div>}

            {!loading && !error && chartData && (
                <div className="h-96 relative">
                    <Line data={chartData} options={options} />
                </div>
            )}
        </div>
    );
};

export default StockVolumeChart;
