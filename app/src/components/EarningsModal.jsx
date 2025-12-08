import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ROW_CONFIG = {
    income: [
        { group: 'Revenue & Profit', keys: ['revenues', 'costOfRevenue', 'grossProfit'] },
        { group: 'Operating', keys: ['operatingExpenses', 'operatingIncomeLoss'] },
        { group: 'Net Income', keys: ['incomeTaxExpenseBenefit', 'netIncomeLoss', 'basicEarningsPerShare'] }
    ],
    balance: [
        { group: 'Assets', keys: ['assets', 'currentAssets', 'cashAndCashEquivalents', 'inventory'] },
        { group: 'Liabilities', keys: ['liabilities', 'currentLiabilities', 'debt'] },
        { group: 'Equity', keys: ['equity'] }
    ],
    cashflow: [
        { group: 'Cash Flow', keys: ['netCashFlow', 'netCashFlowFromOperatingActivities', 'netCashFlowFromInvestingActivities', 'netCashFlowFromFinancingActivities'] }
    ]
};

const LABEL_MAP = {
    revenues: "Revenue",
    costOfRevenue: "Cost of Revenue",
    grossProfit: "Gross Profit",
    operatingExpenses: "Operating Expenses",
    operatingIncomeLoss: "Operating Income",
    incomeTaxExpenseBenefit: "Tax Expense",
    netIncomeLoss: "Net Income",
    basicEarningsPerShare: "EPS",
    assets: "Total Assets",
    currentAssets: "Current Assets",
    liabilities: "Total Liabilities",
    currentLiabilities: "Current Liabilities",
    equity: "Shareholders Equity",
    cashAndCashEquivalents: "Cash & Equivalents",
    inventory: "Inventory",
    debt: "Total Debt",
    netCashFlow: "Net Cash Flow",
    netCashFlowFromOperatingActivities: "Operating Cash Flow",
    netCashFlowFromInvestingActivities: "Investing Cash Flow",
    netCashFlowFromFinancingActivities: "Financing Cash Flow"
};

const EarningsModal = ({ isOpen, onClose, symbol }) => {
    const [activeTab, setActiveTab] = useState('income');
    const [viewType, setViewType] = useState('annual'); // 'annual' | 'quarterly'
    const [data, setData] = useState({ annual: null, quarterly: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [historyCount, setHistoryCount] = useState(5);

    useEffect(() => {
        if (isOpen && symbol) {
            fetchFinancials();
        }
    }, [isOpen, symbol]);

    const fetchFinancials = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/earnings/${symbol}/financials`);
            setData(response.data);
        } catch (err) {
            console.error("Error fetching financials:", err);
            setError("Failed to fetch financial statements.");
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '-';
        if (typeof num !== 'number') return num;

        if (Math.abs(num) >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + 'B';
        if (Math.abs(num) >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + 'M';
        if (Math.abs(num) >= 1.0e+3) return (num / 1.0e+3).toFixed(2) + 'K';
        return num.toLocaleString();
    };

    const getChartData = (items) => {
        if (!items || items.length === 0) return null;

        // Slice items based on historyCount BEFORE sorting for chart
        const slicedItems = items.slice(0, historyCount);

        // Sort items by date ascending for the chart (oldest to newest)
        const sortedItems = [...slicedItems].sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedItems.map(item => new Date(item.date).getFullYear());

        let datasets = [];

        if (activeTab === 'income') {
            datasets = [
                {
                    label: 'Revenue',
                    data: sortedItems.map(item => item.revenues || item.totalRevenue || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue
                },
                {
                    label: 'Net Income',
                    data: sortedItems.map(item => item.netIncomeLoss || item.netIncome || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)', // Green
                }
            ];
        } else if (activeTab === 'balance') {
            datasets = [
                {
                    label: 'Total Assets',
                    data: sortedItems.map(item => item.assets || item.totalAssets || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                },
                {
                    label: 'Total Liabilities',
                    data: sortedItems.map(item => item.liabilities || item.totalLiabilities || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
                }
            ];
        } else if (activeTab === 'cashflow') {
            datasets = [
                {
                    label: 'Operating Cash Flow',
                    data: sortedItems.map(item => item.netCashFlowFromOperatingActivities || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                },
                {
                    label: 'Net Cash Flow',
                    data: sortedItems.map(item => item.netCashFlow || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                }
            ];
        }

        return {
            labels,
            datasets,
        };
    };

    const renderChart = (items) => {
        const chartData = getChartData(items);
        if (!chartData) return null;

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#cbd5e1' } // slate-300
                },
                title: {
                    display: false,
                },
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' }, // slate-400
                    grid: { color: '#334155' } // slate-700
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            return formatNumber(value);
                        }
                    },
                    grid: { color: '#334155' }
                }
            }
        };

        return (
            <div className="h-64 mb-6 w-full">
                <Bar options={options} data={chartData} />
            </div>
        );
    };

    const renderTable = (items) => {
        const fullItems = Array.isArray(items) ? items.filter(item => item !== null && item !== undefined) : [];
        if (fullItems.length === 0) return <div className="text-slate-400 p-4">No data available</div>;

        // Slice by history count
        const validItems = fullItems.slice(0, historyCount);

        // Get config for current tab
        const groups = ROW_CONFIG[activeTab] || [];

        return (
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-300 border-collapse">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 bg-slate-800 shadow-sm w-48">Metric</th>
                            {validItems.map((period, i) => (
                                <th key={i} className="px-4 py-3 bg-slate-800 shadow-sm whitespace-nowrap min-w-[100px]">
                                    {new Date(period.date).toLocaleDateString()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                {/* Group Header */}
                                <tr className="bg-slate-800/50 border-y border-slate-700">
                                    <td colSpan={validItems.length + 1} className="px-4 py-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                                        {group.group}
                                    </td>
                                </tr>
                                {/* Rows */}
                                {group.keys.map(key => {
                                    return (
                                        <tr key={key} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-2 font-medium text-slate-200">
                                                {LABEL_MAP[key] || key}
                                            </td>
                                            {validItems.map((period, i) => {
                                                const val = period[key];
                                                const isNegative = typeof val === 'number' && val < 0;
                                                return (
                                                    <td key={i} className={`px-4 py-2 whitespace-nowrap ${isNegative ? 'text-red-400' : ''}`}>
                                                        {formatNumber(val)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const getCurrentData = () => {
        const dataset = viewType === 'annual' ? data.annual : data.quarterly;
        if (!dataset) return [];

        switch (activeTab) {
            case 'income': return dataset.incomeStatementHistory;
            case 'balance': return dataset.balanceSheetHistory;
            case 'cashflow': return dataset.cashflowStatementHistory;
            default: return [];
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'income', label: 'Income Statement' },
        { id: 'balance', label: 'Balance Sheet' },
        { id: 'cashflow', label: 'Cash Flow' }
    ];

    const currentData = getCurrentData();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-800 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Financials <span className="text-slate-500">|</span> <span className="text-blue-400">{symbol}</span>
                    </h2>

                    <div className="flex items-center gap-6">
                        {/* History Slider */}
                        <div className="flex flex-col gap-1 w-48">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>History</span>
                                <span className="text-blue-400 font-mono">{historyCount} Periods</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={historyCount}
                                onChange={(e) => setHistoryCount(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-slate-700"></div>

                        {/* Toggle */}
                        <div className="flex bg-slate-700/50 rounded-lg p-1 border border-slate-600">
                            <button
                                onClick={() => setViewType('annual')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewType === 'annual'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Annual
                            </button>
                            <button
                                onClick={() => setViewType('quarterly')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewType === 'quarterly'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Quarterly
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 text-sm font-semibold transition-all relative ${activeTab === tab.id
                                ? 'text-blue-400'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_-2px_6px_rgba(59,130,246,0.5)]"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 bg-slate-900/50 flex flex-col">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-red-400 bg-red-900/20 px-6 py-4 rounded-lg border border-red-900/50">
                                <p className="font-semibold">Unable to load data</p>
                                <p className="text-sm opacity-80 mt-1">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {renderChart(currentData)}
                            <div className="flex-1 overflow-auto border border-slate-700/50 rounded-lg bg-slate-800/30">
                                {renderTable(currentData)}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EarningsModal;
