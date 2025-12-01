import { fetchStockData } from './sp500.service';

interface CorrelationResult {
    tickers: string[];
    matrix: number[][];
    period: string;
    dataPoints: number;
}

function calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

export async function getAssetCorrelation(tickers: string[], months: number = 12): Promise<CorrelationResult> {
    // 1. Fetch data for all tickers
    const stockDataPromises = tickers.map(ticker => fetchStockData(ticker, '1d')); // Use daily data for better granularity
    const results = await Promise.all(stockDataPromises);

    // 2. Process history to get daily returns
    // We need to align dates across all tickers.
    // Strategy: Find the intersection of dates where all tickers have data.

    // Map ticker -> Map<date, closePrice>
    const priceMaps: Map<string, Map<string, number>> = new Map();

    results.forEach(res => {
        const map = new Map<string, number>();
        res.history.forEach(item => {
            map.set(item.date, item.close);
        });
        priceMaps.set(res.symbol, map);
    });

    // Find common dates
    // Start with dates from the first ticker
    if (results.length === 0) {
        return { tickers, matrix: [], period: `${months}m`, dataPoints: 0 };
    }

    let commonDates = results[0].history.map(h => h.date);

    // Filter by months cutoff
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    commonDates = commonDates.filter(d => new Date(d) >= cutoffDate);

    // Intersect with other tickers
    for (let i = 1; i < results.length; i++) {
        const symbol = results[i].symbol;
        const map = priceMaps.get(symbol);
        if (map) {
            commonDates = commonDates.filter(date => map.has(date));
        }
    }

    // Sort dates ascending
    commonDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (commonDates.length < 2) {
        return { tickers, matrix: [], period: `${months}m`, dataPoints: 0 };
    }

    // 3. Calculate returns for each ticker on common dates
    // Returns[tickerIndex][dateIndex]
    const returns: number[][] = tickers.map(() => []);

    for (let i = 0; i < commonDates.length - 1; i++) {
        const date = commonDates[i];
        const nextDate = commonDates[i + 1]; // Actually we want returns from T to T+1? 
        // Or just daily change: (Price[i] - Price[i-1]) / Price[i-1]
        // Let's do: for each date from 1 to N, return = (Price[i] - Price[i-1]) / Price[i-1]
    }

    // Re-loop correctly for returns
    for (let t = 0; t < tickers.length; t++) {
        const symbol = results[t].symbol;
        const map = priceMaps.get(symbol)!;

        for (let i = 1; i < commonDates.length; i++) {
            const currDate = commonDates[i];
            const prevDate = commonDates[i - 1];

            const currPrice = map.get(currDate)!;
            const prevPrice = map.get(prevDate)!;

            const ret = (currPrice - prevPrice) / prevPrice;
            returns[t].push(ret);
        }
    }

    // 4. Calculate Correlation Matrix
    const matrix: number[][] = [];
    for (let i = 0; i < tickers.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < tickers.length; j++) {
            if (i === j) {
                row.push(1);
            } else {
                const corr = calculateCorrelation(returns[i], returns[j]);
                row.push(corr);
            }
        }
        matrix.push(row);
    }

    return {
        tickers: results.map(r => r.symbol), // Use returned symbols to ensure correct casing/names
        matrix,
        period: `${months}m`,
        dataPoints: commonDates.length
    };
}
