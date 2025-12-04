import { prisma } from '../config/db';
const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

export interface EarningsData {
    symbol: string;
    earningsDate: string | null;
    epsEstimate: number | null;
    revenueEstimate: number | null;
    quoteType: string;
}

export const getEarningsData = async (tickers: string[]): Promise<EarningsData[]> => {
    const results: EarningsData[] = [];

    // Process in chunks to avoid rate limiting
    const chunkSize = 5;
    for (let i = 0; i < tickers.length; i += chunkSize) {
        const chunk = tickers.slice(i, i + chunkSize);
        const promises = chunk.map(async (symbol) => {
            try {
                const quoteSummary = await yahooFinance.quoteSummary(symbol, {
                    modules: ['calendarEvents', 'quoteType']
                });

                const calendarEvents = quoteSummary.calendarEvents || {};
                const quoteType = quoteSummary.quoteType?.quoteType || 'EQUITY';

                let earningsDate: string | null = null;
                let epsEstimate: number | null = null;
                let revenueEstimate: number | null = null;

                if (calendarEvents.earnings) {
                    if (calendarEvents.earnings.earningsDate && calendarEvents.earnings.earningsDate.length > 0) {
                        earningsDate = new Date(calendarEvents.earnings.earningsDate[0]).toISOString();
                    }
                    epsEstimate = calendarEvents.earnings.earningsAverage || null;
                    revenueEstimate = calendarEvents.earnings.revenueAverage || null;
                }

                // Filter out past earnings (allow for today)
                if (earningsDate) {
                    const date = new Date(earningsDate);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (date < yesterday) {
                        earningsDate = null; // It's in the past, so we don't know the next one yet or API hasn't updated
                    }
                }

                return {
                    symbol,
                    earningsDate,
                    epsEstimate,
                    revenueEstimate,
                    quoteType
                };
            } catch (error) {
                console.error(`Error fetching earnings for ${symbol}:`, error);
                return {
                    symbol,
                    earningsDate: null,
                    epsEstimate: null,
                    revenueEstimate: null,
                    quoteType: 'UNKNOWN'
                };
            }
        });

        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);
    }

    return results.filter(r => r.earningsDate !== null);
};
