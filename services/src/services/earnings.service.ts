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
    // 1. Check Cache
    const CACHE_duration_minutes = 24 * 60; // 24 hours
    const now = new Date();
    const cacheCutoff = new Date(now.getTime() - CACHE_duration_minutes * 60 * 1000);

    // Fetch valid cache entries
    const cachedData = await prisma.earningsCache.findMany({
        where: {
            symbol: { in: tickers },
            lastUpdated: { gt: cacheCutoff }
        }
    });

    // Filter out cached items that are "valid" but physically in the past (e.g. yesterday's earnings)
    // We want to re-fetch these to get the *next* date.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const validCachedData = cachedData.filter(c => {
        // If it's a "no data" record (null date), it's valid (subject to 24h TTL only)
        if (!c.earningsDate) return true;
        // If it has a date, it must be today or future
        return new Date(c.earningsDate) >= startOfToday;
    });

    const cachedSymbols = new Set(validCachedData.map(c => c.symbol));
    const symbolsToFetch = tickers.filter(t => !cachedSymbols.has(t));

    // If all cached and valid, we still fall through to ensure consistent return format and filtering

    // 2. Fetch missing/stale data from Yahoo Finance
    const chunk = 5;
    const fetchedResults: EarningsData[] = [];

    // Lazy load yahoo-finance2
    const pkg = require('yahoo-finance2');
    const yahooFinance = new pkg.default();
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < symbolsToFetch.length; i += chunk) {
        const batch = symbolsToFetch.slice(i, i + chunk);
        const promises = batch.map(async (symbol) => {
            try {
                await sleep(Math.floor(Math.random() * 500));

                let quoteSummary;
                try {
                    quoteSummary = await yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] });
                } catch (e: any) {
                    // If specific "No fundamentals" error, we cache as empty.
                    // Otherwise (network, etc) we return null without caching so it retries next time.
                    if (e.message && e.message.includes('No fundamentals data found')) {
                        // Cache as empty
                        await prisma.earningsCache.upsert({
                            where: { symbol },
                            update: { earningsDate: null, epsEstimate: null, revenueEstimate: null, quoteType: 'N/A', lastUpdated: new Date() },
                            create: { symbol, earningsDate: null, epsEstimate: null, revenueEstimate: null, quoteType: 'N/A', lastUpdated: new Date() }
                        }).catch(err => console.error(`Failed to cache empty earnings for ${symbol}`, err));
                        return null;
                    }
                    throw e; // Rethrow to outer catch
                }

                const earnings = quoteSummary.calendarEvents?.earnings;
                let dateStr: string | null = null;
                let dateObj: Date | null = null;

                if (earnings && earnings.earningsDate && earnings.earningsDate.length > 0) {
                    const d = new Date(earnings.earningsDate[0]);
                    if (d >= new Date()) {
                        dateStr = d.toISOString();
                        dateObj = d;
                    }
                }

                // If no valid future date found, cache as empty
                if (!dateStr) {
                    await prisma.earningsCache.upsert({
                        where: { symbol },
                        update: { earningsDate: null, epsEstimate: null, revenueEstimate: null, quoteType: 'EQUITY', lastUpdated: new Date() },
                        create: { symbol, earningsDate: null, epsEstimate: null, revenueEstimate: null, quoteType: 'EQUITY', lastUpdated: new Date() }
                    }).catch(err => console.error(`Failed to cache empty earnings for ${symbol}`, err));
                    return null;
                }

                const data: EarningsData = {
                    symbol,
                    earningsDate: dateStr,
                    epsEstimate: earnings?.earningsAverage || null,
                    revenueEstimate: earnings?.revenueAverage || null,
                    quoteType: 'EQUITY'
                };

                // Upsert valid data into Cache
                await prisma.earningsCache.upsert({
                    where: { symbol },
                    update: {
                        earningsDate: dateObj,
                        epsEstimate: data.epsEstimate,
                        revenueEstimate: data.revenueEstimate,
                        quoteType: data.quoteType,
                        lastUpdated: new Date()
                    },
                    create: {
                        symbol,
                        earningsDate: dateObj,
                        epsEstimate: data.epsEstimate,
                        revenueEstimate: data.revenueEstimate,
                        quoteType: data.quoteType,
                        lastUpdated: new Date()
                    }
                }).catch(err => console.error(`Failed to cache earnings for ${symbol}`, err));

                return data;

            } catch (e: any) {
                if (e.message && !e.message.includes('No fundamentals data found')) {
                    // Real error, log it and return null (don't cache so we retry)
                    console.error(`Error fetching earnings for ${symbol} from Yahoo:`, e.message);
                }
                return null;
            }
        });

        const batchResults = await Promise.all(promises);
        fetchedResults.push(...(batchResults.filter(r => r !== null) as EarningsData[]));

        if (i + chunk < symbolsToFetch.length) {
            await sleep(2000);
        }
    }

    // Combine cached and freshly fetched data
    const finalResults: EarningsData[] = [
        ...validCachedData.map(c => ({
            symbol: c.symbol,
            earningsDate: c.earningsDate ? c.earningsDate.toISOString() : null,
            epsEstimate: c.epsEstimate,
            revenueEstimate: c.revenueEstimate,
            quoteType: c.quoteType
        })),
        ...fetchedResults
    ];

    // Filter out items with no earnings date (cached misses)
    return finalResults.filter(item => item.earningsDate !== null);
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
