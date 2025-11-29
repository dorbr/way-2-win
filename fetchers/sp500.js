const axios = require('axios');

async function fetchStockData(symbol = '^GSPC') {
    try {
        // Yahoo Finance API
        // interval=1mo to get monthly data
        // range=2y to ensure we have enough history for YoY calculations (need at least 13 months)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=2y`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const result = response.data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        let history = [];
        if (timestamps && quotes && quotes.close) {
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        close: quotes.close[i]
                    });
                }
            }
        }

        // Sort descending by date
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            symbol: symbol === '^GSPC' ? "S&P 500" : symbol.toUpperCase(),
            history: history
        };

    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        // Only return mock data for S&P 500 fallback, otherwise throw or return empty
        if (symbol === '^GSPC') {
            return getMockSP500Data();
        }
        throw error;
    }
}

function getMockSP500Data() {
    // Generate mock monthly data for 2 years
    const history = [];
    let price = 5800;
    const date = new Date();

    for (let i = 0; i < 24; i++) {
        history.push({
            date: date.toISOString().split('T')[0],
            close: price
        });
        // Go back 1 month
        date.setMonth(date.getMonth() - 1);
        // Random price change
        price = price * (1 - (Math.random() * 0.05 - 0.02)); // +/- 2%
    }

    return {
        symbol: "S&P 500",
        history: history
    };
}

module.exports = { fetchStockData, fetchCurrentPrice };

async function fetchCurrentPrice(symbol = '^GSPC') {
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
    } catch (error) {
        console.error(`Error fetching current price for ${symbol}:`, error.message);
        // Fallback to a mock price if it fails, or throw
        if (symbol === '^GSPC') return 5800;
        return null;
    }
}
