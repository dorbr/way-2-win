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
    // Polygon doesn't provide upcoming earnings in the free tier easily.
    // Switching to Yahoo Finance 'calendarEvents' module.

    const chunk = 5;
    const results: EarningsData[] = [];

    // Lazy load yahoo-finance2 to avoid top-level await/initialization issues if any
    const pkg = require('yahoo-finance2');
    const yahooFinance = new pkg.default();

    // Helper to sleep
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < tickers.length; i += chunk) {
        const batch = tickers.slice(i, i + chunk);
        const promises = batch.map(async (symbol) => {
            try {
                // Add a small random jitter to avoid hitting exact same millisecond
                await sleep(Math.floor(Math.random() * 500));

                const quoteSummary = await yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] });
                const earnings = quoteSummary.calendarEvents?.earnings;

                if (!earnings) {
                    return null; // Will be filtered out
                }

                // Yahoo returns earningsDate as an array of dates (range) or single date
                // We'll take the first one.
                let dateStr = null;
                if (earnings.earningsDate && earnings.earningsDate.length > 0) {
                    const d = new Date(earnings.earningsDate[0]);
                    // Check if date is in the future (or at least today)
                    if (d >= new Date()) {
                        dateStr = d.toISOString();
                    }
                }

                if (!dateStr) return null; // Filter out if no future date

                return {
                    symbol,
                    earningsDate: dateStr,
                    epsEstimate: earnings.earningsAverage || null,
                    revenueEstimate: earnings.revenueAverage || null,
                    quoteType: 'EQUITY' // Yahoo doesn't explicitly give type here easily, default to Equity
                };
            } catch (e: any) {
                // Suppress "No fundamentals data found" which is common for ETFs/Funds
                if (e.message && !e.message.includes('No fundamentals data found')) {
                    console.error(`Error fetching earnings for ${symbol} from Yahoo:`, e.message);
                }
                return null;
            }
        });

        const batchResults = await Promise.all(promises);
        results.push(...(batchResults.filter(r => r !== null) as EarningsData[]));

        // Wait between chunks to be polite to Yahoo
        if (i + chunk < tickers.length) {
            await sleep(2000);
        }
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
