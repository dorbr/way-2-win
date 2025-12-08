import axios from 'axios';
const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'MISSING';
const BASE_URL = 'https://api.polygon.io';

interface VIXData {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    history: { date: string; value: number }[];
    isMock?: boolean;
}

export async function fetchVIXData(): Promise<VIXData> {
    try {
        if (POLYGON_API_KEY === 'MISSING') {
            return fetchYahooVIXData();
        }

        const ticker = 'I:VIX';
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 2); // Get 2 months to be safe
        const startDateStr = monthAgo.toISOString().split('T')[0];

        // 1. Fetch Aggregates from Polygon
        const aggsUrl = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${startDateStr}/${today}?adjusted=true&sort=asc&limit=100&apiKey=${POLYGON_API_KEY}`;

        // 2. Fetch Previous Close for change calculation
        const prevUrl = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;

        try {
            const [aggsRes, prevRes] = await Promise.all([
                axios.get(aggsUrl),
                axios.get(prevUrl)
            ]);

            const bars = aggsRes.data.results || [];

            if (bars.length === 0) {
                console.warn("[VIX] No bars returned from Polygon. Trying Yahoo...");
                return fetchYahooVIXData();
            }

            const history = bars.map((b: any) => ({
                date: new Date(b.t).toISOString().split('T')[0],
                value: b.c
            }));

            // Current price is the last bar close
            const current = history[history.length - 1].value;

            // Previous close is from the prev API, or 2nd last bar
            const previous = prevRes.data.results?.[0]?.c || history[history.length - 2]?.value || current;

            const change = current - previous;
            const changePercent = (change / previous) * 100;

            return {
                current,
                previous,
                change,
                changePercent,
                history,
                isMock: false
            };

        } catch (polyError: any) {
            console.warn(`[VIX] Polygon API failed: ${polyError.message}. Trying Yahoo...`);
            return fetchYahooVIXData();
        }

    } catch (error: any) {
        console.error('Error fetching VIX data:', error.message);
        return getMockVIXData();
    }
}

async function fetchYahooVIXData(): Promise<VIXData> {
    try {
        console.log("[VIX] Fetching from Yahoo Finance ^VIX...");
        const symbol = '^VIX';

        const [quote, chartResult] = await Promise.all([
            yahooFinance.quote(symbol),
            yahooFinance.chart(symbol, {
                period1: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                period2: new Date(),
                interval: '1d'
            })
        ]);

        // Fix TS Types
        const q: any = quote;
        const c: any = chartResult;
        const quotes = c.quotes || [];

        const history = quotes.map((bar: any) => ({
            date: bar.date.toISOString().split('T')[0],
            value: bar.close
        }));

        const current = q.regularMarketPrice || history[history.length - 1]?.value || 0;
        const previous = q.regularMarketPreviousClose || history[history.length - 2]?.value || 0;
        const change = q.regularMarketChange || (current - previous);
        const changePercent = q.regularMarketChangePercent || ((change / previous) * 100);

        return {
            current,
            previous,
            change,
            changePercent,
            history,
            isMock: false
        };

    } catch (e: any) {
        console.error(`[VIX] Yahoo Fallback failed: ${e.message}`);
        return getMockVIXData();
    }
}

function getMockVIXData(): VIXData {
    const history: { date: string; value: number }[] = [];
    let value = 15;
    const date = new Date();

    for (let i = 0; i < 30; i++) {
        history.push({
            date: date.toISOString().split('T')[0],
            value: value
        });
        date.setDate(date.getDate() - 1);
        value = value * (1 + (Math.random() * 0.1 - 0.05));
    }
    history.reverse();
    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;

    return {
        current,
        previous,
        change: current - previous,
        changePercent: ((current - previous) / previous) * 100,
        history,
        isMock: true
    };
}
