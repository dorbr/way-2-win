const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

interface StockFundamentals {
    symbol: string;
    marketCap: number;
    enterpriseValue: number;
    netIncomeToCommon: number;
    totalRevenue: number;
    fullTimeEmployees: number;
    ipoDate: string;
    // Column 2
    trailingPE: number;
    forwardPE: number;
    pegRatio: number;
    trailingEps: number;
    forwardEps: number;
    earningsQuarterlyGrowth: number;
    revenueGrowth: number;
    earningsDate: string;
    epsSurprisePercent: number;
    salesSurprise: number;
    // Column 3
    insidersPercentHeld: number;
    institutionsPercentHeld: number;
    grossMargins: number;
    operatingMargins: number;
    profitMargins: number;
    fiftyDayAverage: number;
    twoHundredDayAverage: number;
    // Column 4
    sharesOutstanding: number;
    floatShares: number;
    shortPercentOfFloat: number;
    shortRatio: number;
    sharesShort: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    atr14: number;
    rsi14: number;
    beta: number;
    relVolume: number;
    averageVolume: number;
    volume: number;
    // Column 5
    regularMarketPreviousClose: number;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    // New Fields
    index: string;
    insiderTrans: number;
    instTrans: number;
    sma20: number;
    sma150: number;
    sma20Distance: number;
    sma50Distance: number;
    sma150Distance: number;
    sma200Distance: number;
    isMock?: boolean;
}

function calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 0;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth over the rest
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 0;

    let trSum = 0;
    // First TR is just High - Low
    trSum += highs[0] - lows[0];

    const trs = [];
    for (let i = 1; i < highs.length; i++) {
        const hl = highs[i] - lows[i];
        const hc = Math.abs(highs[i] - closes[i - 1]);
        const lc = Math.abs(lows[i] - closes[i - 1]);
        trs.push(Math.max(hl, hc, lc));
    }

    // Initial ATR
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Smooth
    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
    }

    return atr;
}

export async function fetchStockFundamentals(symbol: string): Promise<StockFundamentals> {
    try {
        const period1 = new Date();
        period1.setMonth(period1.getMonth() - 10); // 10 months ago to cover SMA150 + buffer

        const [quoteResult, historicalResult] = await Promise.all([
            yahooFinance.quoteSummary(symbol, {
                modules: [
                    'defaultKeyStatistics',
                    'assetProfile',
                    'financialData',
                    'summaryDetail',
                    'calendarEvents',
                    'earnings',
                    'earningsHistory',
                    'majorHoldersBreakdown',
                    'price',
                    'netSharePurchaseActivity',
                    'quoteType',
                    'earningsTrend',
                    'insiderTransactions'
                ]
            }),
            yahooFinance.chart(symbol, {
                period1: period1.toISOString().split('T')[0],
                interval: '1d'
            })
        ]) as any;

        if (!quoteResult) {
            throw new Error('No data found');
        }

        const defaultKeyStatistics = quoteResult.defaultKeyStatistics || {};
        const assetProfile = quoteResult.assetProfile || {};
        const financialData = quoteResult.financialData || {};
        const summaryDetail = quoteResult.summaryDetail || {};
        const calendarEvents = quoteResult.calendarEvents || {};
        const earningsHistory = quoteResult.earningsHistory || {};
        const majorHoldersBreakdown = quoteResult.majorHoldersBreakdown || {};
        const price = quoteResult.price || {};
        const netSharePurchaseActivity = quoteResult.netSharePurchaseActivity || {};
        const quoteType = quoteResult.quoteType || {};
        const earningsTrend = quoteResult.earningsTrend || {};

        // Helper to safely get earnings date
        let earningsDate = 'N/A';
        if (calendarEvents.earnings && calendarEvents.earnings.earningsDate && calendarEvents.earnings.earningsDate.length > 0) {
            earningsDate = new Date(calendarEvents.earnings.earningsDate[0]).toISOString().split('T')[0];
        }

        // Helper to safely get surprise percent
        let epsSurprisePercent = 0;
        if (earningsHistory.history && earningsHistory.history.length > 0) {
            // Sort by quarter date descending to get the latest
            const sortedHistory = earningsHistory.history.sort((a: any, b: any) => new Date(b.quarter).getTime() - new Date(a.quarter).getTime());
            epsSurprisePercent = sortedHistory[0].surprisePercent || 0;
        }

        // Calculate Technicals
        let rsi14 = 0;
        let atr14 = 0;
        let sma20 = 0;
        let sma150 = 0;
        let sma20Distance = 0;
        let sma50Distance = 0;
        let sma150Distance = 0;
        let sma200Distance = 0;

        if (historicalResult && historicalResult.quotes && historicalResult.quotes.length > 20) {
            const quotes = historicalResult.quotes;
            const closes = quotes.map((q: any) => q.close);
            const highs = quotes.map((q: any) => q.high);
            const lows = quotes.map((q: any) => q.low);

            rsi14 = calculateRSI(closes, 14);
            atr14 = calculateATR(highs, lows, closes, 14);
            sma20 = calculateSMA(closes, 20);
            sma150 = calculateSMA(closes, 150);

            const currentPrice = price.regularMarketPrice || closes[closes.length - 1];

            if (sma20 > 0) sma20Distance = (currentPrice - sma20) / sma20;
            if (sma150 > 0) sma150Distance = (currentPrice - sma150) / sma150;

            // Calculate other SMAs for distance if available in summaryDetail, otherwise calculate manually if enough data
            const sma50 = summaryDetail.fiftyDayAverage || calculateSMA(closes, 50);
            if (sma50 > 0) sma50Distance = (currentPrice - sma50) / sma50;

            const sma200 = summaryDetail.twoHundredDayAverage || calculateSMA(closes, 200);
            if (sma200 > 0) sma200Distance = (currentPrice - sma200) / sma200;
        }

        const avgVolume = summaryDetail.averageVolume || 0;
        const vol = summaryDetail.volume || price.regularMarketVolume || 0;

        let relVolume = 0;
        if (avgVolume > 0) {
            // Calculate Relative Volume with Intraday Projection
            const now = new Date();
            const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
            const nyTime = new Date(nyTimeStr);

            const marketOpen = new Date(nyTime);
            marketOpen.setHours(9, 30, 0, 0);

            const marketClose = new Date(nyTime);
            marketClose.setHours(16, 0, 0, 0);

            // Check if currently trading (Mon-Fri, 9:30-16:00 ET)
            const isWeekday = nyTime.getDay() >= 1 && nyTime.getDay() <= 5;
            const isTradingHours = nyTime >= marketOpen && nyTime < marketClose;

            if (isWeekday && isTradingHours) {
                const minutesElapsed = (nyTime.getTime() - marketOpen.getTime()) / 60000;
                const totalMinutes = 390; // 6.5 hours * 60

                if (minutesElapsed > 10) { // Avoid extreme projection in first 10 mins
                    const projectedVolume = (vol / minutesElapsed) * totalMinutes;
                    relVolume = projectedVolume / avgVolume;
                } else {
                    // Fallback to simple calculation in first 10 mins or if projection unsafe
                    relVolume = vol / avgVolume;
                }
            } else {
                // Market closed or pre-market, use standard calculation
                relVolume = vol / avgVolume;
            }
        }

        // Calculate PEG
        let pegRatio = defaultKeyStatistics.pegRatio || 0;
        if (!pegRatio && earningsTrend.trend && earningsTrend.trend.length > 0) {
            const trend = earningsTrend.trend;
            const fiveYearTrend = trend.find((t: any) => t.period === '+5y');
            const nextYearTrend = trend.find((t: any) => t.period === '+1y');

            const growthTrend = fiveYearTrend || nextYearTrend;
            if (growthTrend && growthTrend.growth && summaryDetail.trailingPE) {
                const growthRate = growthTrend.growth * 100;
                if (growthRate > 0) {
                    pegRatio = summaryDetail.trailingPE / growthRate;
                }
            }
        }

        // Calculate Insider Transactions manually to match Finviz (Open Market Buys/Sells only)
        let calculatedInsiderTrans = 0;
        const insiderTransactions = quoteResult.insiderTransactions || {};
        const totalInsiderShares = netSharePurchaseActivity.totalInsiderShares || 0;

        if (insiderTransactions.transactions && insiderTransactions.transactions.length > 0 && totalInsiderShares > 0) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            let netShares = 0;

            insiderTransactions.transactions.forEach((t: any) => {
                const transDate = new Date(t.startDate);
                if (transDate >= sixMonthsAgo) {
                    // Filter for meaningful transactions (Sale or Purchase)
                    // Exclude: Grant, Gift, Option Exercise, etc.
                    const text = (t.transactionText || '').toLowerCase();
                    if (text.includes('sale') || text.includes('purchase') || text.includes('buy') || text.includes('sold') || text.includes('bought')) {
                        // Double check it's not an option exercise if "purchase" is used loosely, usually "Option Exercise" is distinct
                        if (!text.includes('exercise') && !text.includes('gift') && !text.includes('grant')) {
                            if (text.includes('sale') || text.includes('sold')) {
                                netShares -= t.shares?.raw || t.shares || 0;
                            } else {
                                netShares += t.shares?.raw || t.shares || 0;
                            }
                        }
                    }
                }
            });

            calculatedInsiderTrans = netShares / totalInsiderShares;
        } else {
            // Fallback to Yahoo's pre-calculated value if manual fails or no data
            calculatedInsiderTrans = netSharePurchaseActivity.netPercentInsiderShares || 0;
        }

        return {
            symbol: symbol.toUpperCase(),
            marketCap: summaryDetail.marketCap || 0,
            enterpriseValue: defaultKeyStatistics.enterpriseValue || 0,
            netIncomeToCommon: defaultKeyStatistics.netIncomeToCommon || 0,
            totalRevenue: financialData.totalRevenue || 0,
            fullTimeEmployees: assetProfile.fullTimeEmployees || 0,
            ipoDate: quoteType.firstTradeDateEpochUtc ? new Date(quoteType.firstTradeDateEpochUtc).toISOString().split('T')[0] : 'N/A',
            // Column 2
            trailingPE: summaryDetail.trailingPE || 0,
            forwardPE: (price.regularMarketPrice && defaultKeyStatistics.forwardEps) ? (price.regularMarketPrice / defaultKeyStatistics.forwardEps) : (summaryDetail.forwardPE || 0),
            pegRatio: pegRatio,
            trailingEps: defaultKeyStatistics.trailingEps || 0,
            forwardEps: defaultKeyStatistics.forwardEps || 0,
            earningsQuarterlyGrowth: defaultKeyStatistics.earningsQuarterlyGrowth || 0,
            revenueGrowth: financialData.revenueGrowth || 0,
            earningsDate: earningsDate,
            epsSurprisePercent: epsSurprisePercent,
            salesSurprise: 0, // Not available in API
            // Column 3
            insidersPercentHeld: majorHoldersBreakdown.insidersPercentHeld || 0,
            institutionsPercentHeld: majorHoldersBreakdown.institutionsPercentHeld || 0,
            grossMargins: financialData.grossMargins || 0,
            operatingMargins: financialData.operatingMargins || 0,
            profitMargins: financialData.profitMargins || 0,
            fiftyDayAverage: summaryDetail.fiftyDayAverage || 0,
            twoHundredDayAverage: summaryDetail.twoHundredDayAverage || 0,
            // Column 4
            sharesOutstanding: defaultKeyStatistics.sharesOutstanding || 0,
            floatShares: defaultKeyStatistics.floatShares || 0,
            shortPercentOfFloat: defaultKeyStatistics.shortPercentOfFloat || 0,
            shortRatio: defaultKeyStatistics.shortRatio || 0,
            sharesShort: defaultKeyStatistics.sharesShort || 0,
            fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow || 0,
            atr14: atr14,
            rsi14: rsi14,
            beta: defaultKeyStatistics.beta || 0,
            relVolume: relVolume,
            averageVolume: avgVolume,
            volume: vol,
            // Column 5
            regularMarketPreviousClose: price.regularMarketPreviousClose || 0,
            regularMarketPrice: price.regularMarketPrice || 0,
            regularMarketChange: price.regularMarketChange || 0,
            regularMarketChangePercent: price.regularMarketChangePercent || 0,
            // New Fields
            index: quoteType.exchange || 'N/A',
            insiderTrans: calculatedInsiderTrans,
            instTrans: 0, // Not readily available
            sma20: sma20,
            sma150: sma150,
            sma20Distance: sma20Distance,
            sma50Distance: sma50Distance,
            sma150Distance: sma150Distance,
            sma200Distance: sma200Distance,
            isMock: false
        };

    } catch (error: any) {
        console.error(`Error fetching fundamentals for ${symbol}:`, error.message);
        return getMockFundamentals(symbol);
    }
}

function getMockFundamentals(symbol: string): StockFundamentals {
    // Simple hash function to generate consistent pseudo-random numbers from symbol
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }

    const rand = (min: number, max: number) => {
        const x = Math.sin(hash++) * 10000;
        return min + (x - Math.floor(x)) * (max - min);
    };

    const marketCap = rand(1000000000, 3000000000000); // 1B to 3T
    const revenue = marketCap * rand(0.05, 0.2); // Revenue is 5-20% of Market Cap
    const income = revenue * rand(0.05, 0.25); // Income is 5-25% of Revenue
    const pe = rand(10, 50);

    return {
        symbol: symbol.toUpperCase(),
        marketCap: marketCap,
        enterpriseValue: marketCap * rand(0.9, 1.2),
        netIncomeToCommon: income,
        totalRevenue: revenue,
        fullTimeEmployees: Math.floor(rand(1000, 2000000)),
        ipoDate: 'N/A',
        // Column 2
        trailingPE: pe,
        forwardPE: pe * rand(0.8, 1.2),
        pegRatio: rand(0.5, 3.0),
        trailingEps: rand(1, 10),
        forwardEps: rand(1.5, 12),
        earningsQuarterlyGrowth: rand(-0.2, 0.5),
        revenueGrowth: rand(-0.1, 0.3),
        earningsDate: new Date(Date.now() + rand(0, 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        epsSurprisePercent: rand(-0.1, 0.2),
        salesSurprise: rand(-0.05, 0.1),
        // Column 3
        insidersPercentHeld: rand(0.01, 0.3),
        institutionsPercentHeld: rand(0.3, 0.9),
        grossMargins: rand(0.2, 0.8),
        operatingMargins: rand(0.1, 0.4),
        profitMargins: rand(0.05, 0.3),
        fiftyDayAverage: rand(100, 300),
        twoHundredDayAverage: rand(100, 300),
        // Column 4
        sharesOutstanding: rand(100000000, 10000000000),
        floatShares: rand(100000000, 10000000000),
        shortPercentOfFloat: rand(0.01, 0.2),
        shortRatio: rand(1, 10),
        sharesShort: rand(1000000, 100000000),
        fiftyTwoWeekHigh: rand(150, 350),
        fiftyTwoWeekLow: rand(100, 200),
        atr14: rand(2, 10),
        rsi14: rand(30, 70),
        beta: rand(0.5, 2.0),
        relVolume: rand(0.5, 3.0),
        averageVolume: rand(1000000, 100000000),
        volume: rand(1000000, 100000000),
        // Column 5
        regularMarketPreviousClose: rand(100, 300),
        regularMarketPrice: rand(100, 300),
        regularMarketChange: rand(-5, 5),
        regularMarketChangePercent: rand(-0.05, 0.05),
        // New Fields
        index: 'MOCK',
        insiderTrans: rand(-0.1, 0.1),
        instTrans: rand(-0.1, 0.1),
        sma20: rand(100, 300),
        sma150: rand(100, 300),
        sma20Distance: rand(-0.1, 0.1),
        sma50Distance: rand(-0.1, 0.1),
        sma150Distance: rand(-0.1, 0.1),
        sma200Distance: rand(-0.1, 0.1),
        isMock: true
    };
}
