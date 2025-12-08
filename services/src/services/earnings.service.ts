import axios from 'axios';
import { prisma } from '../config/db';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'MISSING';
const BASE_URL = 'https://api.polygon.io';

export interface EarningsData {
    symbol: string;
    earningsDate: string | null;
    epsEstimate: number | null;
    revenueEstimate: number | null;
    quoteType: string;
}

export const getEarningsData = async (tickers: string[]): Promise<EarningsData[]> => {
    // Polygon doesn't have a bulk "upcoming earnings" endpoint that includes estimates easily accessible 
    // without paid higher tiers or complex filtering.
    // For now, we will return basic info. "Next Earnings Date" is not always available in basic Ticker Details.
    // We will do a best effort with Ticker Details if possible, but often it's missing.
    // Let's return the basic structure. The Frontend sorts by date, so if null, it goes to bottom.

    // If we want real dates, we'd need to query the 'Reference -> Tickers' endpoint or 'Financials'.
    // Let's just map the tickers to a basic structure for now to stop errors, 
    // and maybe fetch `ticker details` parallely.

    const chunk = 5;
    const results: EarningsData[] = [];

    for (let i = 0; i < tickers.length; i += chunk) {
        const batch = tickers.slice(i, i + chunk);
        const promises = batch.map(async (symbol) => {
            try {
                // We can try to get the next earnings date from Ticker Details if available, 
                // but usually it's not there for free tier relying on external calendars.
                // We will return N/A for now to be safe, or implement a specific "events" endpoint later if available.
                return {
                    symbol,
                    earningsDate: null,
                    epsEstimate: null,
                    revenueEstimate: null,
                    quoteType: 'EQUITY'
                };
            } catch (e) {
                return {
                    symbol,
                    earningsDate: null,
                    epsEstimate: null,
                    revenueEstimate: null,
                    quoteType: 'UNKNOWN'
                };
            }
        });
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }
    return results;
};

export const getFinancialStatements = async (symbol: string) => {
    try {
        if (POLYGON_API_KEY === 'MISSING') {
            console.warn('Polygon API Key missing for financials');
            return {
                annual: { incomeStatementHistory: [], balanceSheetHistory: [], cashflowStatementHistory: [] },
                quarterly: { incomeStatementHistory: [], balanceSheetHistory: [], cashflowStatementHistory: [] }
            };
        }

        // Fetch Financials - Parallel calls for Annual and Quarterly
        const [annualRes, quarterlyRes] = await Promise.all([
            axios.get(`${BASE_URL}/vX/reference/financials?ticker=${symbol.toUpperCase()}&limit=10&timeframe=annual&apiKey=${POLYGON_API_KEY}`),
            axios.get(`${BASE_URL}/vX/reference/financials?ticker=${symbol.toUpperCase()}&limit=40&timeframe=quarterly&apiKey=${POLYGON_API_KEY}`)
        ]);

        const processResults = (results: any[]) => {
            // Sort by end_date descending
            results.sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

            // strict re-map
            const incomeHistory: any[] = [];
            const balanceHistory: any[] = [];
            const cashflowHistory: any[] = [];

            results.forEach((item: any) => {
                const f = item.financials;
                const date = item.end_date;

                if (f.income_statement) {
                    const obj: any = { date };
                    Object.keys(f.income_statement).forEach(k => {
                        obj[k.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = f.income_statement[k].value;
                    });
                    incomeHistory.push(obj);
                }

                if (f.balance_sheet) {
                    const obj: any = { date };
                    Object.keys(f.balance_sheet).forEach(k => {
                        obj[k.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = f.balance_sheet[k].value;
                    });
                    balanceHistory.push(obj);
                }

                if (f.cash_flow_statement) {
                    const obj: any = { date };
                    Object.keys(f.cash_flow_statement).forEach(k => {
                        obj[k.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = f.cash_flow_statement[k].value;
                    });
                    cashflowHistory.push(obj);
                }
            });

            return {
                incomeStatementHistory: incomeHistory,
                balanceSheetHistory: balanceHistory,
                cashflowStatementHistory: cashflowHistory
            };
        };

        return {
            annual: processResults(annualRes.data.results || []),
            quarterly: processResults(quarterlyRes.data.results || [])
        };

    } catch (error: any) {
        console.error(`Error fetching financial statements for ${symbol}:`, error.message);
        throw error;
    }
};
