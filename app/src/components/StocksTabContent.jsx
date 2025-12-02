import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CandlestickChart from './CandlestickChart';

const StocksTabContent = () => {
    const [symbol, setSymbol] = useState('AAPL');
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStockData = async (ticker) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/stock?symbol=${ticker}&range=2y&interval=1d`);
            if (response.data.error) {
                setError(response.data.error);
                setStockData(null);
            } else {
                setStockData(response.data);
            }
        } catch (err) {
            console.error("Error fetching stock data:", err);
            setError("Failed to fetch stock data.");
            setStockData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockData(symbol);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchStockData(symbol);
    };

    return (
        <div className="p-4 text-white space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Stocks Analysis</h2>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        placeholder="Enter Symbol (e.g., AAPL)"
                        className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Search'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* Chart Section */}
                <div className="bg-slate-900 rounded-lg shadow-lg">
                    {stockData && stockData.history && stockData.history.length > 0 ? (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold">{stockData.symbol}</h3>
                                    <p className="text-slate-400 text-sm">Daily Chart</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">${stockData.history[0].close.toFixed(2)}</p>
                                </div>
                            </div>
                            <CandlestickChart data={stockData.history} />
                        </div>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center text-slate-500">
                            {loading ? 'Loading chart...' : 'No data available'}
                        </div>
                    )}
                </div>

                {/* Data Table Placeholder */}
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 h-64 flex items-center justify-center">
                    <span className="text-slate-400">Data Table Placeholder (Finviz Style)</span>
                </div>
            </div>
        </div>
    );
};

export default StocksTabContent;
