import axios from 'axios';
const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'MISSING';
const BASE_URL = 'https://api.polygon.io';

interface StockData {
    symbol: string;
    history: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
    close?: number; // Added for convenience in insights
    isMock?: boolean;
}

export async function fetchStockData(symbol: string = '^GSPC', interval: '1d' | '1wk' | '1mo' = '1mo', range: string = '2y'): Promise<StockData> {
    try {
        if (POLYGON_API_KEY === 'MISSING') {
            console.warn("POLYGON_API_KEY is missing. Trying Yahoo Fallback...");
            return fetchYahooStockData(symbol, interval, range);
        }

        // Map symbol for SPX/GSPC
        let ticker = symbol;
        if (symbol === '^GSPC' || symbol === 'SP500') ticker = 'I:SPX';
        if (symbol === 'SPY') ticker = 'SPY';

        // Map interval to Polygon timespan
        let timespan: 'day' | 'week' | 'month' = 'month';
        let multiplier = 1;
        if (interval === '1d') timespan = 'day';
        if (interval === '1wk') timespan = 'week';
        if (interval === '1mo') timespan = 'month';

        // Calculate start date based on range
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        if (range.endsWith('y')) {
            const years = parseInt(range);
            startDate.setFullYear(startDate.getFullYear() - years);
        } else if (range === 'max') {
            startDate.setFullYear(startDate.getFullYear() - 20); // 20 years cap for now
        } else {
            startDate.setFullYear(startDate.getFullYear() - 2); // Default
        }
        const startDateStr = startDate.toISOString().split('T')[0];

        // console.log(`[SP500] Fetching Polygon aggs for ${ticker}, ${timespan}, from ${startDateStr} to ${endDate}`);

        // API Endpoint: /v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}
        const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${startDateStr}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;

        try {
            const response = await axios.get(url);
            const results = response.data.results;

            if (!results || results.length === 0) {
                console.warn(`[SP500] No data returned from Polygon for ${ticker}. Trying Yahoo...`);
                return fetchYahooStockData(symbol, interval, range);
            }

            const history = results.map((bar: any) => ({
                date: new Date(bar.t).toISOString().split('T')[0],
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v
            }));

            // Sort ascending
            history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {
                symbol: symbol === '^GSPC' ? "S&P 500" : symbol.toUpperCase(),
                history: history,
                close: history.length > 0 ? history[history.length - 1].close : 0, // Latest close
                isMock: false
            };
        } catch (polyError: any) {
            console.warn(`[SP500] Polygon API failed for ${ticker}: ${polyError.message}. Trying Yahoo...`);
            return fetchYahooStockData(symbol, interval, range);
        }

    } catch (error: any) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        return getMockSP500Data(symbol);
    }
}

async function fetchYahooStockData(symbol: string, interval: '1d' | '1wk' | '1mo', range: string): Promise<StockData> {
    try {
        console.log(`[SP500] Fetching from Yahoo Finance for ${symbol}...`);

        // Map Range to Date
        const startDate = new Date();
        if (range.endsWith('y')) {
            startDate.setFullYear(startDate.getFullYear() - parseInt(range));
        } else if (range === 'max') {
            startDate.setFullYear(1900);
        } else {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const queryOptions = {
            period1: startDate,
            period2: new Date(), // End date is now
            interval: interval
        };

        const result = await yahooFinance.chart(symbol, queryOptions);

        // Chart returns { meta, quotes, ... } or simple array depending on version/method signature.
        // Usually yahooFinance.chart returns { quotes: [...] }
        const quotes = result.quotes || [];

        const history = quotes.map((quote: any) => ({
            date: quote.date.toISOString().split('T')[0],
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume
        }));

        return {
            symbol: symbol === '^GSPC' ? "S&P 500" : symbol.toUpperCase(),
            history: history,
            close: history.length > 0 ? history[history.length - 1].close : 0,
            isMock: false
        };

    } catch (error: any) {
        console.error(`[SP500] Yahoo Fallback failed for ${symbol}:`, error.message);
        return getMockSP500Data(symbol);
    }
}

function getMockSP500Data(symbol: string = "S&P 500"): StockData {
    // Generate mock monthly data for 2 years
    const history: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
    let price = 5800;
    const date = new Date();

    for (let i = 0; i < 24; i++) {
        const open = price;
        const close = price * (1 - (Math.random() * 0.05 - 0.02)); // +/- 2%
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);

        history.push({
            date: date.toISOString().split('T')[0],
            open,
            high,
            low,
            close,
            volume: 1000000 + Math.random() * 500000
        });

        price = close;
        // Go back 1 month
        date.setMonth(date.getMonth() - 1);
        // Random price change
        price = price * (1 - (Math.random() * 0.05 - 0.02)); // +/- 2%
    }

    // Sort ascending by date
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        symbol: symbol,
        history: history,
        close: history[0].close,
        isMock: true
    };
}

export async function fetchCurrentPrice(symbol: string = '^GSPC'): Promise<number | null> {
    try {
        if (POLYGON_API_KEY !== 'MISSING') {
            let ticker = symbol;
            if (symbol === '^GSPC' || symbol === 'SP500') ticker = 'I:SPX';
            if (symbol === 'SPY') ticker = 'SPY';

            // Endpoint: /v2/aggs/ticker/{stocksTicker}/prev
            const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;

            try {
                const response = await axios.get(url);
                const results = response.data.results;
                if (results && results.length > 0) {
                    return results[0].c;
                }
            } catch (e: any) {
                console.warn(`[SP500] Polygon current price failed for ${ticker}.`);
            }
        }

        // Fallback to Yahoo
        console.log(`[SP500] Fetching current price from Yahoo for ${symbol}...`);
        const quote: any = await yahooFinance.quote(symbol);
        return quote.regularMarketPrice || null;

    } catch (error: any) {
        console.error(`Error fetching current price for ${symbol}:`, error.message);
        // Fallback to a mock price if it fails, or throw
        if (symbol === '^GSPC') return 5800;
        return null;
    }
}
