import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';

const AssetCorrelationSection = () => {
    const [tickers, setTickers] = useState(['SPY', 'QQQ', 'IWM']);
    const [months, setMonths] = useState(12);
    const [correlationData, setCorrelationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newTicker, setNewTicker] = useState('');

    const fetchData = async (currentTickers, currentMonths) => {
        setLoading(true);
        try {
            const tickerString = currentTickers.join(',');
            const response = await fetch(`/api/analyze/correlation?tickers=${tickerString}&months=${currentMonths}`);
            const data = await response.json();
            setCorrelationData(data);
        } catch (error) {
            console.error("Error fetching correlation data", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce fetch to avoid spamming API
    const debouncedFetch = useCallback(debounce((t, m) => fetchData(t, m), 500), []);

    useEffect(() => {
        fetchData(tickers, months);
    }, []);

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value);
        setMonths(val);
        debouncedFetch(tickers, val);
    };

    const handleAddTicker = (e) => {
        e.preventDefault();
        if (newTicker && !tickers.includes(newTicker.toUpperCase())) {
            const updatedTickers = [...tickers, newTicker.toUpperCase()];
            setTickers(updatedTickers);
            setNewTicker('');
            debouncedFetch(updatedTickers, months);
        }
    };

    const handleRemoveTicker = (tickerToRemove) => {
        const updatedTickers = tickers.filter(t => t !== tickerToRemove);
        setTickers(updatedTickers);
        debouncedFetch(updatedTickers, months);
    };

    const getCorrelationColor = (value) => {
        if (value === 1) return 'text-slate-500'; // Identity
        if (value > 0.7) return 'text-green-400';
        if (value > 0.3) return 'text-green-200';
        if (value > -0.3) return 'text-slate-300';
        if (value > -0.7) return 'text-red-200';
        return 'text-red-400';
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-100">Asset Correlation Matrix</h2>

                <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
                    <div className="flex items-center space-x-4 bg-slate-800 p-3 rounded-lg">
                        <span className="text-slate-400 text-sm whitespace-nowrap">Timeframe: <span className="text-white font-bold">{months} Months</span></span>
                        <input
                            type="range"
                            min="3"
                            max="24"
                            value={months}
                            onChange={handleSliderChange}
                            className="w-32 md:w-48 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
                {/* Ticker Management */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {tickers.map(ticker => (
                        <div key={ticker} className="flex items-center bg-slate-700 text-white px-3 py-1 rounded-full text-sm">
                            <span className="font-bold mr-2">{ticker}</span>
                            <button
                                onClick={() => handleRemoveTicker(ticker)}
                                className="text-slate-400 hover:text-red-400 focus:outline-none"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                    <form onSubmit={handleAddTicker} className="flex items-center">
                        <input
                            type="text"
                            value={newTicker}
                            onChange={(e) => setNewTicker(e.target.value)}
                            placeholder="+ Add Ticker"
                            className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm w-24 focus:w-32 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                        />
                    </form>
                </div>

                {/* Correlation Matrix */}
                {loading && !correlationData ? (
                    <div className="text-center py-12 text-slate-400">
                        Calculating Correlations...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 border-b border-slate-700"></th>
                                    {correlationData?.tickers.map(ticker => (
                                        <th key={ticker} className="p-3 border-b border-slate-700 text-slate-300 font-semibold text-center">{ticker}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {correlationData?.matrix.map((row, i) => (
                                    <tr key={correlationData.tickers[i]} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 border-b border-slate-700 text-slate-300 font-semibold">{correlationData.tickers[i]}</td>
                                        {row.map((val, j) => (
                                            <td key={j} className="p-3 border-b border-slate-700 text-center">
                                                <span className={`font-mono font-bold ${getCorrelationColor(val)}`}>
                                                    {val.toFixed(2)}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="text-xs text-slate-500 text-center mt-4">
                            Based on {correlationData?.dataPoints} common trading days over last {months} months
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetCorrelationSection;
