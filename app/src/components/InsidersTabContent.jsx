import React, { useState } from 'react';
import axios from 'axios';

const InsidersTabContent = () => {
    const [ticker, setTicker] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ticker) return;

        setLoading(true);
        setError(null);
        setData(null);

        try {
            const response = await axios.get(`/api/insiders/${ticker}`);
            if (response.data.error) {
                setError(response.data.error);
            } else {
                setData(response.data);
                setCurrentPage(1); // Reset to first page on new search
            }
        } catch (err) {
            setError('Failed to fetch data. Please check the ticker symbol.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Search Insiders & Institutions</h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="Enter Ticker Symbol (e.g., AAPL)"
                        className="flex-1 p-3 rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold transition disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Search'}
                    </button>
                </form>
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>

            {/* Results Section */}
            {data && (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <h3 className="text-2xl font-bold text-blue-400">{data.ticker} Data</h3>
                        <span className="text-xs text-slate-400">CIK: {data.cik}</span>
                    </div>

                    {/* Insider Transactions Table */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Latest Insider Transactions (Form 4)</h3>
                            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Source: SEC EDGAR</span>
                        </div>
                        <table className="w-full text-left border-collapse mb-4">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Insider</th>
                                    <th className="p-3">Title</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3 text-right">Shares</th>
                                    <th className="p-3 text-right">Price</th>
                                    <th className="p-3 text-right">Value</th>
                                    <th className="p-3 text-center">Filing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.insiderTrades.length > 0 ? (
                                    data.insiderTrades
                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                        .map((trade, idx) => (
                                            <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                <td className="p-3">{trade.transactionDate}</td>
                                                <td className="p-3 font-medium">{trade.reportingName}</td>
                                                <td className="p-3 text-sm text-slate-300">{trade.title}</td>
                                                <td className={`p-3 font-bold ${trade.transactionCode === 'P' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {trade.transactionCode === 'P' ? 'Buy' : 'Sell'}
                                                </td>
                                                <td className="p-3 text-right">{trade.shares.toLocaleString()}</td>
                                                <td className="p-3 text-right">${trade.price.toFixed(2)}</td>
                                                <td className="p-3 text-right text-slate-300">${trade.value.toLocaleString()}</td>
                                                <td className="p-3 text-center">
                                                    <a href={trade.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
                                                        View
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="p-4 text-center text-slate-500">No recent open market transactions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {data.insiderTrades.length > itemsPerPage && (
                            <div className="flex justify-between items-center text-sm text-slate-400 mt-4 border-t border-slate-700 pt-4">
                                <div>
                                    Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, data.insiderTrades.length)}</span> of <span className="text-white font-medium">{data.insiderTrades.length}</span> entries
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    {[...Array(Math.ceil(data.insiderTrades.length / itemsPerPage))].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-1 rounded transition-colors ${currentPage === i + 1
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 hover:bg-slate-600'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(data.insiderTrades.length / itemsPerPage)))}
                                        disabled={currentPage === Math.ceil(data.insiderTrades.length / itemsPerPage)}
                                        className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Institutional Holdings Table */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Top Institutional Holders</h3>
                            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Source: Yahoo Finance & SEC</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-3">Holder</th>
                                    <th className="p-3 text-right">Shares</th>
                                    <th className="p-3 text-right">Value</th>
                                    <th className="p-3 text-right">% Held</th>
                                    <th className="p-3 text-right">Date Reported</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.institutionalHoldings.length > 0 ? (
                                    data.institutionalHoldings.map((inst, idx) => (
                                        <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                                            <td className="p-3 font-medium">{inst.holder}</td>
                                            <td className="p-3 text-right">{inst.shares.toLocaleString()}</td>
                                            <td className="p-3 text-right text-green-400">${inst.value.toLocaleString()}</td>
                                            <td className="p-3 text-right">{(inst.pctHeld * 100).toFixed(2)}%</td>
                                            <td className="p-3 text-right text-slate-400">{inst.dateReported}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-4 text-center text-slate-500">No institutional data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsidersTabContent;
