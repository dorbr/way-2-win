import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EarningsTabContent = () => {
    const [earnings, setEarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                const response = await axios.get('/api/earnings');
                setEarnings(response.data);
            } catch (err) {
                console.error("Error fetching earnings data:", err);
                setError("Failed to fetch earnings data.");
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, []);

    const formatNumber = (num) => {
        if (!num) return '-';
        if (num >= 1.0e+12) return '$' + (num / 1.0e+12).toFixed(2) + 'T';
        if (num >= 1.0e+9) return '$' + (num / 1.0e+9).toFixed(2) + 'B';
        if (num >= 1.0e+6) return '$' + (num / 1.0e+6).toFixed(2) + 'M';
        if (num >= 1.0e+3) return '$' + (num / 1.0e+3).toFixed(2) + 'K';
        return '$' + num.toString();
    };

    // Group earnings by date
    const groupedEarnings = earnings.reduce((acc, item) => {
        const date = item.earningsDate ? new Date(item.earningsDate).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown Date';

        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(groupedEarnings).sort((a, b) => {
        if (a === 'Unknown Date') return 1;
        if (b === 'Unknown Date') return -1;
        return new Date(a) - new Date(b);
    });

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-500">
                Loading upcoming earnings...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <div className="p-4 text-white space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Upcoming Earnings Calendar</h2>
            </div>

            <div className="space-y-6">
                {sortedDates.length > 0 ? (
                    sortedDates.map((date) => (
                        <div key={date} className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
                            <div className="bg-slate-700/50 px-6 py-3 border-b border-slate-700">
                                <h3 className="font-semibold text-blue-400">{date}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                                        <tr>
                                            <th className="px-6 py-3 w-1/4">Symbol</th>
                                            <th className="px-6 py-3 w-1/4">EPS Estimate</th>
                                            <th className="px-6 py-3 w-1/4">Revenue Estimate</th>
                                            <th className="px-6 py-3 w-1/4">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedEarnings[date].map((item, index) => (
                                            <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors last:border-0">
                                                <td className="px-6 py-4 font-bold text-white text-lg">{item.symbol}</td>
                                                <td className="px-6 py-4 font-medium">
                                                    {item.epsEstimate != null ? `$${item.epsEstimate.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-medium">
                                                    {formatNumber(item.revenueEstimate)}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {item.quoteType}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-500">
                        No upcoming earnings found for your tickers.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EarningsTabContent;
