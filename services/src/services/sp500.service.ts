import axios from 'axios';

interface StockData {
    symbol: string;
    history: { date: string; close: number; volume: number }[];
    close?: number; // Added for convenience in insights
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

        let history: { date: string; close: number; volume: number }[] = [];
        if (timestamps && quotes && quotes.close) {
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        close: quotes.close[i],
                        volume: quotes.volume ? quotes.volume[i] : 0
                    });
                }
            }
        }

        // Sort descending by date
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            symbol: symbol === '^GSPC' ? "S&P 500" : symbol.toUpperCase(),
            history: history,
            close: history.length > 0 ? history[0].close : 0
        };

    } catch (error: any) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        // Only return mock data for S&P 500 fallback, otherwise throw or return empty
        if (symbol === '^GSPC') {
            return getMockSP500Data();
        }
        throw error;
    }
}

function getMockSP500Data(): StockData {
    // Generate mock monthly data for 2 years
    const history: { date: string; close: number; volume: number }[] = [];
    let price = 5800;
    const date = new Date();

    for (let i = 0; i < 24; i++) {
        history.push({
            date: date.toISOString().split('T')[0],
            close: price,
            volume: 1000000 + Math.random() * 500000
        });
        // Go back 1 month
        date.setMonth(date.getMonth() - 1);
        // Random price change
        price = price * (1 - (Math.random() * 0.05 - 0.02)); // +/- 2%
    }

    return {
        symbol: "S&P 500",
        history: history,
        close: history[0].close
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
