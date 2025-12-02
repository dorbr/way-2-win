import axios from 'axios';

interface VIXData {
    symbol: string;
    previousClose: number;
    todayOpen: number;
    todayClose: number;
    lastUpdatedUtc: string;
    history: any[];
    isMock?: boolean;
}

export async function fetchVIXData(): Promise<VIXData> {
    try {
        // Yahoo Finance API for VIX (Symbol: ^VIX)
        // We use range=1mo to ensure we get enough daily data points to filter for the last 5 trading days
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1mo';

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0' // Yahoo often requires a UA
            }
        });

        const result = response.data.chart.result[0];
        const meta = result.meta;
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        // Combine timestamps and quotes
        let history: any[] = [];
        if (timestamps && quotes && quotes.close) {
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        open: quotes.open[i],
                        close: quotes.close[i]
                    });
                }
            }
        }

        // Sort descending by date to easily get the latest
        history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Get today's data (latest)
        const latest = history[0];

        // Get last 5 trading days for history
        const last5Days = history.slice(0, 5);

        return {
            symbol: "VIX",
            previousClose: meta.chartPreviousClose,
            todayOpen: latest ? latest.open : meta.regularMarketPrice, // Fallback if history is delayed
            todayClose: latest ? latest.close : meta.regularMarketPrice,
            lastUpdatedUtc: new Date().toISOString(),
            history: last5Days,
            isMock: false
        };

    } catch (error: any) {
        console.error("Error fetching VIX data:", error.message);
        return getMockVIXData();
    }
}

function getMockVIXData(): VIXData {
    return {
        symbol: "VIX",
        previousClose: 14.23,
        todayOpen: 14.10,
        todayClose: 15.02,
        lastUpdatedUtc: new Date().toISOString(),
        history: [
            { date: "2025-11-28", open: 14.10, close: 15.02 },
            { date: "2025-11-27", open: 13.80, close: 14.23 },
            { date: "2025-11-26", open: 13.50, close: 13.90 },
            { date: "2025-11-25", open: 13.20, close: 13.60 },
            { date: "2025-11-24", open: 13.00, close: 13.30 },
            { date: "2025-11-24", open: 13.00, close: 13.30 }
        ],
        isMock: true
    };
}
