import React, { useEffect, useState, useCallback } from 'react';
import debounce from 'lodash.debounce';

const MacroBetaSection = () => {
    const [cpiBeta, setCpiBeta] = useState(null);
    const [joblessBeta, setJoblessBeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState(24);
    const [symbol, setSymbol] = useState('SPY');

    const fetchData = async (selectedMonths, selectedSymbol) => {
        setLoading(true);
        try {
            const [cpiRes, joblessRes] = await Promise.all([
                fetch(`/api/macro/beta/CPI?months=${selectedMonths}&symbol=${selectedSymbol}`),
                fetch(`/api/macro/beta/JOBLESS?months=${selectedMonths}&symbol=${selectedSymbol}`)
            ]);
            const cpiData = await cpiRes.json();
            const joblessData = await joblessRes.json();
            setCpiBeta(cpiData);
            setJoblessBeta(joblessData);
        } catch (error) {
            console.error("Error fetching beta data", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce the fetch to avoid too many requests
    const debouncedFetch = useCallback(debounce((m, s) => fetchData(m, s), 500), []);

    useEffect(() => {
        fetchData(months, symbol);
    }, []);

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value);
        setMonths(val);
        debouncedFetch(val, symbol);
    };

    const handleSymbolChange = (e) => {
        const val = e.target.value.toUpperCase();
        setSymbol(val);
        if (val.length >= 1) {
            debouncedFetch(months, val);
        }
    };

    const renderCard = (title, data, color) => {
        if (!data) return null;
        const correlation = data.correlation ? data.correlation.toFixed(2) : "0.00";
        const isPositive = data.correlation > 0;

        return (
            <div className={`bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700 hover:border-${color}-500 transition-colors flex flex-col justify-between h-full`}>
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
                        <span className={`bg-${color}-900 text-${color}-200 text-xs px-2 py-1 rounded`}>
                            {months} Month Correlation
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6">
                        <span className={`text-5xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {correlation}
                        </span>
                        <span className="text-slate-400 text-sm mt-2">Correlation (Returns)</span>
                    </div>
                </div>
                <div className="text-xs text-slate-500 text-center mt-4 border-t border-slate-700 pt-3">
                    Based on {data.dataPoints ? data.dataPoints.length : 0} data points over last {months} months
                </div>
            </div>
        );
    };

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex gap-2 items-center">
                    <h2 className="text-xl font-bold text-slate-100">Macro Sensitivity (Beta)</h2>
                    {(cpiBeta?.isMock || joblessBeta?.isMock) && <span className="bg-yellow-900 text-yellow-200 text-xs px-2 py-1 rounded">Mock Data</span>}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
                    <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg">
                        <span className="text-slate-400 text-sm">Ticker:</span>
                        <input
                            type="text"
                            value={symbol}
                            onChange={handleSymbolChange}
                            className="bg-slate-700 text-white px-2 py-1 rounded w-20 text-center font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

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

            {loading && !cpiBeta ? (
                <div className="text-center py-12 text-slate-400 bg-card-bg rounded-xl border border-slate-700">
                    Loading Beta Analysis...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderCard(`CPI vs ${symbol}`, cpiBeta, "blue")}
                    {renderCard(`Jobless Claims vs ${symbol}`, joblessBeta, "purple")}
                </div>
            )}
        </div>
    );
};

export default MacroBetaSection;
