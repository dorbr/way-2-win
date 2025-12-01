import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TickerManager = ({ isOpen, onClose }) => {
    const [tickers, setTickers] = useState([]);
    const [newTicker, setNewTicker] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTickers();
        }
    }, [isOpen]);

    const fetchTickers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/tickers');
            setTickers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to load tickers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTicker = async (e) => {
        e.preventDefault();
        if (!newTicker.trim()) return;

        try {
            const response = await axios.post('/api/tickers', { symbol: newTicker.trim() });
            setTickers([...tickers, response.data].sort((a, b) => a.symbol.localeCompare(b.symbol)));
            setNewTicker('');
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add ticker');
        }
    };

    const handleDeleteTicker = async (symbol) => {
        if (!window.confirm(`Are you sure you want to delete ${symbol}?`)) return;

        try {
            await axios.delete(`/api/tickers/${symbol}`);
            setTickers(tickers.filter(t => t.symbol !== symbol));
            setError('');
        } catch (err) {
            setError('Failed to delete ticker');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Manage Tickers</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        ✕
                    </button>
                </div>

                {error && <div className="bg-red-500/10 text-red-400 p-2 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleAddTicker} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newTicker}
                        onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                        placeholder="Enter ticker symbol (e.g. AAPL)"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newTicker.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                </form>

                <div className="flex-1 overflow-y-auto min-h-0 border border-slate-700 rounded bg-slate-900/50">
                    {loading ? (
                        <div className="p-4 text-center text-slate-400">Loading...</div>
                    ) : (
                        <ul className="divide-y divide-slate-700">
                            {tickers.map((ticker) => (
                                <li key={ticker.id} className="flex justify-between items-center p-3 hover:bg-slate-800/50">
                                    <span className="text-white font-medium">{ticker.symbol}</span>
                                    <button
                                        onClick={() => handleDeleteTicker(ticker.symbol)}
                                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                            {tickers.length === 0 && (
                                <li className="p-4 text-center text-slate-500">No tickers found</li>
                            )}
                        </ul>
                    )}
                </div>

                <div className="mt-4 text-xs text-slate-500 text-center">
                    Changes will take effect on the next scheduled run.
                </div>
            </div>
        </div>
    );
};

export default TickerManager;
