import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

const OptionsHistorySection = () => {
    const [ticker, setTicker] = useState('AAPL');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = async (tickerToFetch) => {
        try {
            const response = await axios.get(`/api/options/ratio-history?ticker=${encodeURIComponent(tickerToFetch)}`);
            if (response.data.error) {
                console.error(response.data.error);
                return;
            }
            setHistory(response.data);
        } catch (error) {
            console.error('Error fetching options ratio history:', error);
        }
    };

    const updateHistory = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/options/ratio-history', { ticker });
            if (response.data.error) {
                alert('Error updating options ratio history: ' + response.data.error);
                return;
            }
            setHistory(response.data);
        } catch (error) {
            console.error('Error updating options ratio history:', error);
            alert('Failed to update options ratio history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory('AAPL');
    }, []);

    const chartData = {
        labels: history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(item =>
            new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        ),
        datasets: [{
            label: 'Avg Call/Put Ratio',
            data: history.map(item => item.ratio),
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Time', color: '#64748b' } },
            y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Ratio', color: '#64748b' } }
        },
        plugins: {
            legend: { labels: { color: '#e2e8f0' } },
            title: { display: true, text: `Call/Put OI Ratio History (${ticker})`, color: '#e2e8f0' }
        }
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-200">Call/Put OI Ratio History (Avg of +/- 5 Strikes)</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ticker (e.g. AAPL)"
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    />
                    <button
                        onClick={updateHistory}
                        disabled={loading}
                        className="text-white bg-pink-600 hover:bg-pink-700 focus:ring-4 focus:ring-pink-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
            <div className="h-96">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

export default OptionsHistorySection;
