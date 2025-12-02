import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const OptionsSection = ({ ticker }) => {
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOptions = async (tickerToFetch) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/options?ticker=${encodeURIComponent(tickerToFetch)}`);
            const data = response.data;

            if (data.error) {
                alert('Error fetching options data: ' + data.error);
                return;
            }

            setAllData(data);

            const uniqueDates = [...new Set(data.map(d => d.details.expiration_date))].sort();
            setDates(uniqueDates);

            if (uniqueDates.length > 0) {
                setSelectedDate(uniqueDates[0]);
            } else {
                setFilteredData([]);
            }

        } catch (error) {
            console.error('Error fetching options data:', error);
            alert('Failed to fetch options data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ticker) {
            fetchOptions(ticker);
        }
    }, [ticker]);

    useEffect(() => {
        if (selectedDate && allData.length > 0) {
            const filtered = allData.filter(d => d.details.expiration_date === selectedDate);
            setFilteredData(filtered);
        }
    }, [selectedDate, allData]);

    // Process Data for Charts
    const { chartData, ratioChartData, tableData } = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return { chartData: null, ratioChartData: null, tableData: [] };

        const calls = filteredData.filter(d => d.details.contract_type === 'call');
        const puts = filteredData.filter(d => d.details.contract_type === 'put');

        const strikeMap = new Map();

        calls.forEach(d => {
            const strike = d.details.strike_price;
            if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
            strikeMap.get(strike).call += d.open_interest;
        });

        puts.forEach(d => {
            const strike = d.details.strike_price;
            if (!strikeMap.has(strike)) strikeMap.set(strike, { call: 0, put: 0 });
            strikeMap.get(strike).put += d.open_interest;
        });

        const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);

        // Filter significant strikes
        const significantStrikes = sortedStrikes.filter(strike => {
            const oi = strikeMap.get(strike);
            return (oi.call + oi.put) > 100;
        });

        const labels = significantStrikes;
        const callData = significantStrikes.map(s => strikeMap.get(s).call);
        const putData = significantStrikes.map(s => strikeMap.get(s).put);
        const ratioData = significantStrikes.map(s => {
            const oi = strikeMap.get(s);
            if (oi.put === 0) return null;
            return oi.call / oi.put;
        });

        const tData = significantStrikes.map(strike => {
            const oi = strikeMap.get(strike);
            let ratioVal = 0;
            if (oi.put !== 0) ratioVal = oi.call / oi.put;
            return {
                strike,
                ratio: ratioVal,
                totalOI: oi.call + oi.put,
                hasPut: oi.put !== 0
            };
        });

        return {
            chartData: {
                labels,
                datasets: [
                    {
                        label: 'Calls Open Interest',
                        data: callData,
                        backgroundColor: 'rgba(74, 222, 128, 0.6)',
                        borderColor: 'rgba(74, 222, 128, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Puts Open Interest',
                        data: putData,
                        backgroundColor: 'rgba(248, 113, 113, 0.6)',
                        borderColor: 'rgba(248, 113, 113, 1)',
                        borderWidth: 1
                    }
                ]
            },
            ratioChartData: {
                labels,
                datasets: [{
                    label: 'Call/Put OI Ratio',
                    data: ratioData,
                    borderColor: 'rgb(250, 204, 21)',
                    backgroundColor: 'rgba(250, 204, 21, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            tableData: tData
        };
    }, [filteredData]);

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { stacked: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Strike Price', color: '#64748b' } },
            y: { stacked: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Open Interest', color: '#64748b' } }
        },
        plugins: {
            legend: { labels: { color: '#e2e8f0' } },
            title: { display: true, text: `Options Open Interest for ${ticker}`, color: '#e2e8f0' }
        }
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Strike Price', color: '#64748b' } },
            y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Ratio (Call / Put)', color: '#64748b' } }
        },
        plugins: {
            legend: { labels: { color: '#e2e8f0' } },
            title: { display: true, text: `Call/Put OI Ratio for ${ticker}`, color: '#e2e8f0' }
        }
    };

    return (
        <>
            {/* Options Open Interest Section */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-200">Options Open Interest</h2>
                    <div className="flex gap-2">
                        <select
                            className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-auto p-2.5"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {dates.length === 0 ? <option disabled>No dates found</option> : dates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
                <div className="h-96">
                    {chartData && <Bar data={chartData} options={barOptions} />}
                </div>
            </div>

            {/* Options Call/Put Ratio Section */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 bg-card-bg rounded-xl p-6 shadow-lg border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-200">Call/Put Open Interest Ratio by Strike</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700 sticky top-0 bg-card-bg">
                                    <th className="p-3">Strike Price</th>
                                    <th className="p-3">Call/Put Ratio</th>
                                    <th className="p-3">Total OI</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {tableData.map((row, idx) => {
                                    let colorClass = "text-yellow-400";
                                    if (row.hasPut) {
                                        if (row.ratio >= 1.5) colorClass = "text-green-400";
                                        else if (row.ratio <= 0.6) colorClass = "text-red-400";
                                    }
                                    return (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3 font-medium text-slate-200">{row.strike}</td>
                                            <td className={`p-3 ${colorClass} font-bold`}>{row.hasPut ? row.ratio.toFixed(2) : '∞'}</td>
                                            <td className="p-3 text-slate-400">{row.totalOI.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="h-96">
                        {ratioChartData && <Line data={ratioChartData} options={lineOptions} />}
                    </div>
                </div>
            </div>
        </>
    );
};

export default OptionsSection;
