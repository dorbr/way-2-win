import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from './Header';
import FedWatchCard from './FedWatchCard';
import VixCard from './VixCard';
import FearGreedCard from './FearGreedCard';
import MacroSummaryCard from './MacroSummaryCard';
import HistoryTable from './HistoryTable';
import MacroHistorySection from './MacroHistorySection';
import MacroComparisonChart from './MacroComparisonChart';
import OptionsTabContent from './OptionsTabContent';
import AIInsight from './AIInsight';
import MacroBetaSection from './MacroBetaSection';
import AssetCorrelationSection from './AssetCorrelationSection';
import StockVolumeChart from './StockVolumeChart';
import StocksTabContent from './StocksTabContent';
import EarningsTabContent from './EarningsTabContent';
import InsidersTabContent from './InsidersTabContent';
import Tabs from './Tabs';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [insight, setInsight] = useState(null);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get('/api/dashboard');
            if (response.data.error) {
                console.error(response.data.error);
                return;
            }
            setData(response.data);
            setInsight(response.data.insight);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleUpdateStock = async (symbol) => {
        if (!data) return;

        // Optimistic UI or loading state could be added here
        try {
            const response = await axios.get(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
            const newStockData = response.data;

            if (newStockData.error) {
                alert('Error fetching stock data: ' + newStockData.error);
                return;
            }

            // Update local state
            const newData = { ...data, sp500: newStockData };
            setData(newData);

            // Trigger AI Analysis
            setInsight("Analyzing relationship...");
            const analysisResponse = await axios.post('/api/analyze', {
                symbol: symbol,
                macroData: {
                    cpi: newData.cpi,
                    ppi: newData.ppi,
                    joblessClaims: newData.joblessClaims
                }
            });
            setInsight(analysisResponse.data.insight);

        } catch (error) {
            console.error('Error updating stock data:', error);
            alert('Failed to update stock data.');
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;
    }

    if (!data) {
        return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Error loading data.</div>;
    }

    return (
        <div className="bg-slate-900 text-white font-sans min-h-screen p-6">
            <Header lastUpdated={data.generatedAtUtc} />

            <Tabs tabs={[
                {
                    label: "Macro Overview",
                    content: (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FedWatchCard data={data.fedWatch} />
                            <VixCard data={data.vix} />
                            <FearGreedCard data={data.fearGreed} />

                            <MacroSummaryCard title="CPI (Inflation)" tag="Consumer" data={data.cpi} type="cpi" color="teal" />
                            <MacroSummaryCard title="PPI (Producer)" tag="Wholesale" data={data.ppi} type="ppi" color="cyan" />
                            <MacroSummaryCard title="Jobless Claims" tag="Labor" data={data.joblessClaims} type="claims" color="pink" />

                            <HistoryTable history={data.history} />

                            <MacroHistorySection title="CPI History (YoY)" data={data.cpi} valueLabel="Value (%)" color="teal" />
                            <MacroHistorySection title="PPI History (YoY)" data={data.ppi} valueLabel="Value (%)" color="cyan" />
                            <MacroHistorySection title="Jobless Claims History" data={data.joblessClaims} valueLabel="Initial Claims" color="pink" />

                            <MacroComparisonChart
                                cpiData={data.cpi}
                                ppiData={data.ppi}
                                claimsData={data.joblessClaims}
                                sp500Data={data.sp500}
                                onUpdateStock={handleUpdateStock}
                            />

                            <AIInsight insight={insight} />
                        </div>
                    )
                },
                {
                    label: "Analysis",
                    content: (
                        <div className="space-y-6">
                            <MacroBetaSection />
                            <AssetCorrelationSection />
                            <StockVolumeChart />
                        </div>
                    )
                },
                {
                    label: "Stocks",
                    content: <StocksTabContent />
                },
                {
                    label: "Options",
                    content: <OptionsTabContent />
                },
                {
                    label: "Earnings",
                    content: <EarningsTabContent />
                },
                {
                    label: "Insiders & Institutionals",
                    content: <InsidersTabContent />
                }
            ]} />
        </div>
    );
};

export default Dashboard;
