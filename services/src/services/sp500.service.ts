import axios from 'axios';

interface StockData {
    symbol: string;
    history: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
    close?: number; // Added for convenience in insights
    isMock?: boolean;
}

export async function fetchStockData(symbol: string = '^GSPC', interval: '1d' | '1wk' | '1mo' = '1mo', range: string = '2y'): Promise<StockData> {
    try {
        // Yahoo Finance API
        // interval defaults to 1mo, but can be 1d or 1wk
        // range defaults to 2y
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const result = response.data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        let history: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
        if (timestamps && quotes && quotes.close) {
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        open: quotes.open ? quotes.open[i] : quotes.close[i],
                        high: quotes.high ? quotes.high[i] : quotes.close[i],
                        low: quotes.low ? quotes.low[i] : quotes.close[i],
                        close: quotes.close[i],
                        volume: quotes.volume ? quotes.volume[i] : 0
                    });
                }
            }
        }

        // Sort ascending by date (required for charts)
        history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            symbol: symbol === '^GSPC' ? "S&P 500" : symbol.toUpperCase(),
            history: history,
            close: history.length > 0 ? history[0].close : 0,
            isMock: false
        };

    } catch (error: any) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        // Fallback to mock data for any symbol if API fails (e.g. DNS issues)
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
        // Fetch 1-minute interval data for the last day to get the very latest price
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const result = response.data.chart.result[0];
        const meta = result.meta;
        const price = meta.regularMarketPrice;

        return price;
    } catch (error: any) {
        console.error(`Error fetching current price for ${symbol}:`, error.message);
        // Fallback to a mock price if it fails, or throw
        if (symbol === '^GSPC') return 5800;
        return null;
    }
}
