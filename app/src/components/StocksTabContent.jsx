import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CandlestickChart from './CandlestickChart';
import ShillerHistoryTable from './ShillerHistoryTable';
import EarningsModal from './EarningsModal';

const StocksTabContent = () => {
    const [symbol, setSymbol] = useState('AAPL');
    const [stockData, setStockData] = useState(null);
    const [fundamentals, setFundamentals] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEarningsModalOpen, setIsEarningsModalOpen] = useState(false);

    const fetchStockData = async (ticker) => {
        setLoading(true);
        setError(null);
        setFundamentals(null);
        try {
            const response = await axios.get(`/api/stock?symbol=${ticker}&range=2y&interval=1d`);
            if (response.data.error) {
                setError(response.data.error);
                setStockData(null);
            } else {
                setStockData(response.data);
            }

            // Fetch fundamentals
            const fundResponse = await axios.get(`/api/stock/fundamentals?symbol=${ticker}`);
            if (!fundResponse.data.error) {
                setFundamentals(fundResponse.data);
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Stocks Analysis</h2>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        placeholder="Enter Symbol (e.g., AAPL)"
                        className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-blue-500 w-full sm:w-64"
                    />
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors flex-1 sm:flex-none justify-center"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Search'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEarningsModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors ml-0 sm:ml-2 flex-1 sm:flex-none justify-center"
                            disabled={loading}
                        >
                            Show Earnings
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* Chart Section */}
                <div className="bg-slate-900 rounded-lg shadow-lg mb-4">
                    {stockData && stockData.history && stockData.history.length > 0 ? (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold">{stockData.symbol}</h3>
                                    <p className="text-slate-400 text-sm">Daily Chart</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">${(stockData.close || stockData.history[stockData.history.length - 1].close).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="min-h-[450px] h-[450px] sm:h-[500px]">
                                <CandlestickChart data={stockData.history} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-[450px] sm:h-[500px] flex items-center justify-center text-slate-500">
                            {loading ? 'Loading chart...' : 'No data available'}
                        </div>
                    )}
                </div>

                {/* Data Table Placeholder */}
                {/* Data Table */}
                <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden mt-4">
                    <div className="p-4 border-b border-slate-700">
                        <h3 className="text-lg font-semibold">Fundamentals</h3>
                    </div>
                    {fundamentals ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm p-4">
                            {/* Column 1 */}
                            <div className="space-y-0.5">
                                <MetricRow label="Index" value={fundamentals.index} />
                                <MetricRow label="Market Cap" value={formatNumber(fundamentals.marketCap)} valueColor="text-blue-400" />
                                <MetricRow label="Enterprise Value" value={formatNumber(fundamentals.enterpriseValue)} />
                                <MetricRow label="Income" value={formatNumber(fundamentals.netIncomeToCommon)} valueColor="text-green-400" />
                                <MetricRow label="Sales" value={formatNumber(fundamentals.totalRevenue)} />
                                <MetricRow label="Employees" value={fundamentals.fullTimeEmployees?.toLocaleString()} />
                                <MetricRow label="IPO" value={fundamentals.ipoDate} />
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-0.5">
                                <MetricRow label="P/E" value={fundamentals.trailingPE?.toFixed(2)} />
                                <MetricRow label="Forward P/E" value={fundamentals.forwardPE?.toFixed(2)} />
                                <MetricRow label="PEG" value={fundamentals.pegRatio?.toFixed(2)} />
                                <MetricRow label="EPS (ttm)" value={fundamentals.trailingEps?.toFixed(2)} />
                                <MetricRow label="EPS Next Y" value={fundamentals.forwardEps?.toFixed(2)} />
                                <MetricRow label="EPS Q/Q" value={(fundamentals.earningsQuarterlyGrowth * 100).toFixed(2) + '%'} valueColor="text-green-400" />
                                <MetricRow label="Sales Q/Q" value={(fundamentals.revenueGrowth * 100).toFixed(2) + '%'} valueColor="text-green-400" />
                                <MetricRow label="Earnings" value={fundamentals.earningsDate} />
                                <MetricRow
                                    label="EPS Surp"
                                    value={(fundamentals.epsSurprisePercent * 100).toFixed(2) + '%'}
                                    valueColor={fundamentals.epsSurprisePercent > 0 ? 'text-green-400' : fundamentals.epsSurprisePercent < 0 ? 'text-red-400' : ''}
                                />
                                <MetricRow
                                    label="Sales Surp"
                                    value={fundamentals.salesSurprise ? (fundamentals.salesSurprise * 100).toFixed(2) + '%' : '-'}
                                    valueColor={fundamentals.salesSurprise > 0 ? 'text-green-400' : fundamentals.salesSurprise < 0 ? 'text-red-400' : ''}
                                />
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-0.5">
                                <MetricRow label="Insider Own" value={(fundamentals.insidersPercentHeld * 100).toFixed(2) + '%'} />
                                <MetricRow
                                    label="Insider Trans"
                                    value={(fundamentals.insiderTrans * 100).toFixed(2) + '%'}
                                    valueColor={fundamentals.insiderTrans > 0 ? 'text-green-400' : fundamentals.insiderTrans < 0 ? 'text-red-400' : ''}
                                />
                                <MetricRow label="Inst Own" value={(fundamentals.institutionsPercentHeld * 100).toFixed(2) + '%'} />
                                <MetricRow label="Inst Trans" value={fundamentals.instTrans ? (fundamentals.instTrans * 100).toFixed(2) + '%' : '-'} />
                                <MetricRow label="Gross Margin" value={(fundamentals.grossMargins * 100).toFixed(2) + '%'} />
                                <MetricRow label="Oper. Margin" value={(fundamentals.operatingMargins * 100).toFixed(2) + '%'} />
                                <MetricRow label="Profit Margin" value={(fundamentals.profitMargins * 100).toFixed(2) + '%'} />
                                <MetricRow
                                    label="SMA20"
                                    value={fundamentals.sma20?.toFixed(2)}
                                    subValue={`(${(fundamentals.sma20Distance * 100).toFixed(2)}%)`}
                                    subValueColor={fundamentals.sma20Distance > 0 ? 'text-green-400' : fundamentals.sma20Distance < 0 ? 'text-red-400' : 'text-slate-400'}
                                />
                                <MetricRow
                                    label="SMA50"
                                    value={fundamentals.fiftyDayAverage?.toFixed(2)}
                                    subValue={`(${(fundamentals.sma50Distance * 100).toFixed(2)}%)`}
                                    subValueColor={fundamentals.sma50Distance > 0 ? 'text-green-400' : fundamentals.sma50Distance < 0 ? 'text-red-400' : 'text-slate-400'}
                                />
                                <MetricRow
                                    label="SMA150"
                                    value={fundamentals.sma150?.toFixed(2)}
                                    subValue={`(${(fundamentals.sma150Distance * 100).toFixed(2)}%)`}
                                    subValueColor={fundamentals.sma150Distance > 0 ? 'text-green-400' : fundamentals.sma150Distance < 0 ? 'text-red-400' : 'text-slate-400'}
                                />
                                <MetricRow
                                    label="SMA200"
                                    value={fundamentals.twoHundredDayAverage?.toFixed(2)}
                                    subValue={`(${(fundamentals.sma200Distance * 100).toFixed(2)}%)`}
                                    subValueColor={fundamentals.sma200Distance > 0 ? 'text-green-400' : fundamentals.sma200Distance < 0 ? 'text-red-400' : 'text-slate-400'}
                                />
                            </div>

                            {/* Column 4 */}
                            <div className="space-y-0.5">
                                <MetricRow label="Shs Outstand" value={formatNumber(fundamentals.sharesOutstanding)} />
                                <MetricRow label="Shs Float" value={formatNumber(fundamentals.floatShares)} />
                                <MetricRow label="Short Float" value={(fundamentals.shortPercentOfFloat * 100).toFixed(2) + '%'} />
                                <MetricRow label="Short Ratio" value={fundamentals.shortRatio?.toFixed(2)} />
                                <MetricRow label="Short Interest" value={formatNumber(fundamentals.sharesShort)} />
                                <MetricRow label="52W High" value={fundamentals.fiftyTwoWeekHigh?.toFixed(2)} valueColor="text-green-400" />
                                <MetricRow label="52W Low" value={fundamentals.fiftyTwoWeekLow?.toFixed(2)} valueColor="text-red-400" />
                                <MetricRow label="ATR (14)" value={fundamentals.atr14?.toFixed(2)} />
                                <MetricRow label="RSI (14)" value={fundamentals.rsi14?.toFixed(2)} />
                                <MetricRow label="Beta" value={fundamentals.beta?.toFixed(2)} />
                                <MetricRow label="Rel Volume" value={fundamentals.relVolume?.toFixed(2)} />
                                <MetricRow label="Avg Volume" value={formatNumber(fundamentals.averageVolume)} />
                                <MetricRow label="Volume" value={formatNumber(fundamentals.volume)} />
                            </div>

                            {/* Column 5 */}
                            <div className="space-y-0.5">
                                <MetricRow label="Prev Close" value={fundamentals.regularMarketPreviousClose?.toFixed(2)} />
                                <MetricRow label="Price" value={fundamentals.regularMarketPrice?.toFixed(2)} />
                                <MetricRow
                                    label="Change"
                                    value={fundamentals.regularMarketChange?.toFixed(2)}
                                    subValue={`(${(fundamentals.regularMarketChangePercent * 100).toFixed(2)}%)`}
                                    valueColor={fundamentals.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'}
                                    subValueColor={fundamentals.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-500">
                            {loading ? 'Loading fundamentals...' : 'No data available'}
                        </div>
                    )}
                </div>
            </div>

            {/* Market Context Section */}
            <div className="grid grid-cols-1 gap-6">
                <ShillerHistoryTable symbol={symbol} />
            </div>

            <EarningsModal
                isOpen={isEarningsModalOpen}
                onClose={() => setIsEarningsModalOpen(false)}
                symbol={symbol}
            />
        </div>


    );
};

const MetricRow = ({ label, value, valueColor, subValue, subValueColor }) => (
    <div className="flex justify-between items-center border-b border-slate-700/50 px-2 py-1 hover:bg-slate-700/30 transition-colors rounded-sm">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className={`font-medium text-sm ${valueColor || 'text-white'}`}>
            {value || '-'}
            {subValue && (
                <span className={`ml-1 text-xs ${subValueColor || 'text-slate-400'}`}>
                    {subValue}
                </span>
            )}
        </span>
    </div>
);

const formatNumber = (num) => {
    if (!num) return '-';
    if (num >= 1.0e+12) return (num / 1.0e+12).toFixed(2) + 'T';
    if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + 'B';
    if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + 'M';
    if (num >= 1.0e+3) return (num / 1.0e+3).toFixed(2) + 'K';
    return num.toString();
};

export default StocksTabContent;
