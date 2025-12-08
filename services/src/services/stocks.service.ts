import axios from 'axios';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'MISSING';
const BASE_URL = 'https://api.polygon.io';

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
    const capsSymbol = symbol.toUpperCase();
    try {
        if (POLYGON_API_KEY === 'MISSING') {
            return getMockFundamentals(symbol);
        }

        // Parallel Fetching
        // 1. Ticker Details: /v3/reference/tickers/{ticker}
        // 2. Snapshot: /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}
        // 3. Financials: /vX/reference/financials
        // 4. Aggregates: /v2/aggs/...

        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        const [detailsRes, snapshotRes, financialsRes, aggsRes] = await Promise.all([
            axios.get(`${BASE_URL}/v3/reference/tickers/${capsSymbol}?apiKey=${POLYGON_API_KEY}`),
            axios.get(`${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${capsSymbol}?apiKey=${POLYGON_API_KEY}`),
            axios.get(`${BASE_URL}/vX/reference/financials?ticker=${capsSymbol}&limit=10&apiKey=${POLYGON_API_KEY}`),
            axios.get(`${BASE_URL}/v2/aggs/ticker/${capsSymbol}/range/1/day/${yearAgo}/${today}?adjusted=true&limit=500&apiKey=${POLYGON_API_KEY}`)
        ]);

        const details = detailsRes.data.results || {};
        const snapshot = snapshotRes.data.ticker ? snapshotRes.data.ticker : (snapshotRes.data.results ? snapshotRes.data.results[0] : {}); // Corrected assignment
        // Snapshot /v2/snapshot returns 'ticker' object for single, or 'results' array
        // For /tickers/{ticker}, it returns `ticker` object? No, it returns top level object matching TickerSnapshot interface.
        // Let's assume snapshotRes.data contains `ticker` property.

        const financials = financialsRes.data.results || [];
        const bars = aggsRes.data.results || [];

        // --- Metric Extractions ---

        const marketCap = details.market_cap || (details.weighted_shares_outstanding * snapshot.day?.c) || 0;
        const sharesOutstanding = details.weighted_shares_outstanding || 0;

        // --- Calculate TTM EPS & Revenue & Other Financials ---

        // Sort by end_date descending
        financials.sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

        let trailingEps = 0;
        let totalRevenue = 0;
        let netIncomeToCommon = 0; // For Profit Margin
        let grossProfit = 0; // For Gross Margin
        let operatingIncome = 0; // For Operating Margin
        let totalDebt = 0; // For EV
        let cashAndEquivalents = 0; // For EV

        let revenueGrowth = 0; // YoY
        let earningsGrowth = 0; // YoY Quarterly

        // 1. Try to find TTM record directly
        const ttm = financials.find((f: any) => f.fiscal_period === 'TTM');

        // Helper to safely get value
        const getVal = (obj: any, path: string[]) => {
            let current = obj;
            for (const key of path) {
                if (!current) return 0;
                current = current[key];
            }
            return current?.value || 0;
        };

        if (ttm) {
            trailingEps = getVal(ttm, ['financials', 'income_statement', 'basic_earnings_per_share']);
            totalRevenue = getVal(ttm, ['financials', 'income_statement', 'revenues']);
            netIncomeToCommon = getVal(ttm, ['financials', 'income_statement', 'net_income_loss']);
            grossProfit = getVal(ttm, ['financials', 'income_statement', 'gross_profit']);
            operatingIncome = getVal(ttm, ['financials', 'income_statement', 'operating_income_loss']);

            // Balance Sheet Items (Usually from latest available report, TTM might merge them or use latest)
            // If TTM has BS data use it, otherwise use latest period
            totalDebt = getVal(ttm, ['financials', 'balance_sheet', 'debt']) || (getVal(ttm, ['financials', 'balance_sheet', 'long_term_debt']) + getVal(ttm, ['financials', 'balance_sheet', 'short_term_debt'])); // Polygon sometimes has 'debt' summary or separate parts
            cashAndEquivalents = getVal(ttm, ['financials', 'balance_sheet', 'cash_and_cash_equivalents']);

        } else {
            // 2. Sum last 4 quarters for Income Statement
            const quarters = financials.filter((f: any) => ['Q1', 'Q2', 'Q3', 'Q4'].includes(f.fiscal_period));

            if (quarters.length >= 4) {
                const recent4 = quarters.slice(0, 4);
                trailingEps = recent4.reduce((acc: number, q: any) => acc + getVal(q, ['financials', 'income_statement', 'basic_earnings_per_share']), 0);
                totalRevenue = recent4.reduce((acc: number, q: any) => acc + getVal(q, ['financials', 'income_statement', 'revenues']), 0);
                netIncomeToCommon = recent4.reduce((acc: number, q: any) => acc + getVal(q, ['financials', 'income_statement', 'net_income_loss']), 0);
                grossProfit = recent4.reduce((acc: number, q: any) => acc + getVal(q, ['financials', 'income_statement', 'gross_profit']), 0);
                operatingIncome = recent4.reduce((acc: number, q: any) => acc + getVal(q, ['financials', 'income_statement', 'operating_income_loss']), 0);

                // For Balance Sheet, take the LATEST quarter's snapshot
                const latestQ = recent4[0];
                // Try generic 'debt' field or sum parts
                totalDebt = getVal(latestQ, ['financials', 'balance_sheet', 'debt']) || (getVal(latestQ, ['financials', 'balance_sheet', 'long_term_debt']) + getVal(latestQ, ['financials', 'balance_sheet', 'short_term_debt'])); // Fallback attempt
                cashAndEquivalents = getVal(latestQ, ['financials', 'balance_sheet', 'cash_and_cash_equivalents']);

                // Calculate Approximated Growth (Latest Q vs Same Q Last Year)
                const lastYearQ = quarters.find((f: any) => f.fiscal_period === latestQ.fiscal_period && f.fiscal_year === (latestQ.fiscal_year - 1));

                if (lastYearQ) {
                    const currentRev = getVal(latestQ, ['financials', 'income_statement', 'revenues']);
                    const oldRev = getVal(lastYearQ, ['financials', 'income_statement', 'revenues']);
                    if (oldRev !== 0) revenueGrowth = (currentRev - oldRev) / oldRev;

                    const currentEps = getVal(latestQ, ['financials', 'income_statement', 'basic_earnings_per_share']);
                    const oldEps = getVal(lastYearQ, ['financials', 'income_statement', 'basic_earnings_per_share']);
                    if (oldEps !== 0) earningsGrowth = (currentEps - oldEps) / oldEps;
                }

            } else {
                // 3. Fallback to latest FY (Annual)
                const annual = financials.find((f: any) => f.fiscal_period === 'FY');
                if (annual) {
                    trailingEps = getVal(annual, ['financials', 'income_statement', 'basic_earnings_per_share']);
                    totalRevenue = getVal(annual, ['financials', 'income_statement', 'revenues']);
                    netIncomeToCommon = getVal(annual, ['financials', 'income_statement', 'net_income_loss']);
                    grossProfit = getVal(annual, ['financials', 'income_statement', 'gross_profit']);
                    operatingIncome = getVal(annual, ['financials', 'income_statement', 'operating_income_loss']);

                    totalDebt = getVal(annual, ['financials', 'balance_sheet', 'debt']);
                    cashAndEquivalents = getVal(annual, ['financials', 'balance_sheet', 'cash_and_cash_equivalents']);
                }
            }
        }

        const price = snapshot.day?.c || snapshot.last?.price || 0;
        const trailingPE = (trailingEps && trailingEps !== 0) ? (price / trailingEps) : 0;

        // Margins
        const profitMargins = (totalRevenue && totalRevenue !== 0) ? (netIncomeToCommon / totalRevenue) : 0;
        const grossMargins = (totalRevenue && totalRevenue !== 0) ? (grossProfit / totalRevenue) : 0;
        const operatingMargins = (totalRevenue && totalRevenue !== 0) ? (operatingIncome / totalRevenue) : 0;

        // Enterprise Value = Market Cap + Total Debt - Cash
        const enterpriseValue = marketCap + totalDebt - cashAndEquivalents;

        // --- Technicals ---
        let rsi14 = 0;
        let atr14 = 0;
        let sma20 = 0;
        let sma50 = 0;
        let sma150 = 0;
        let sma200 = 0;
        let beta = 1; // Default
        let fiftyTwoWeekHigh = 0;
        let fiftyTwoWeekLow = 0;

        if (bars.length > 0) {
            // Find 52 week high/low from bars (aggs are already yearAgo -> today)
            let maxH = -Infinity;
            let minL = Infinity;
            for (const b of bars) {
                if (b.h > maxH) maxH = b.h;
                if (b.l < minL) minL = b.l;
            }
            fiftyTwoWeekHigh = maxH === -Infinity ? 0 : maxH;
            fiftyTwoWeekLow = minL === Infinity ? 0 : minL;
        }

        if (bars.length > 200) {
            const closes = bars.map((b: any) => b.c);
            const highs = bars.map((b: any) => b.h);
            const lows = bars.map((b: any) => b.l);

            rsi14 = calculateRSI(closes, 14);
            atr14 = calculateATR(highs, lows, closes, 14);
            sma20 = calculateSMA(closes, 20);
            sma50 = calculateSMA(closes, 50);
            sma150 = calculateSMA(closes, 150);
            sma200 = calculateSMA(closes, 200);
        }

        // --- Distances ---
        const sma20Distance = sma20 ? (price - sma20) / sma20 : 0;
        const sma50Distance = sma50 ? (price - sma50) / sma50 : 0;
        const sma150Distance = sma150 ? (price - sma150) / sma150 : 0;
        const sma200Distance = sma200 ? (price - sma200) / sma200 : 0;

        // ... existing Polygon logic ...

        let finalResult = {
            symbol: capsSymbol,
            marketCap,
            enterpriseValue,
            netIncomeToCommon,
            totalRevenue,
            fullTimeEmployees: details.total_employees || 0,
            ipoDate: details.list_date || 'N/A',
            // Column 2
            trailingPE,
            forwardPE: 0, // Estimates not avail
            pegRatio: 0,
            trailingEps,
            forwardEps: 0,
            earningsQuarterlyGrowth: earningsGrowth,
            revenueGrowth,
            earningsDate: 'N/A',
            epsSurprisePercent: 0,
            salesSurprise: 0,
            // Column 3
            insidersPercentHeld: 0,
            institutionsPercentHeld: 0,
            grossMargins,
            operatingMargins,
            profitMargins,
            fiftyDayAverage: sma50,
            twoHundredDayAverage: sma200,
            // Column 4
            sharesOutstanding,
            floatShares: details.weighted_shares_outstanding || 0, // Approx
            shortPercentOfFloat: 0,
            shortRatio: 0,
            sharesShort: 0,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,
            atr14,
            rsi14,
            beta,
            relVolume: (snapshot.day?.v && sma20) ? (snapshot.day.v / (bars[bars.length - 1]?.v || 1)) : 1, // Rough approx
            averageVolume: bars.length > 0 ? bars.reduce((s: number, b: any) => s + b.v, 0) / bars.length : 0,
            volume: snapshot.day?.v || 0,
            // Column 5
            regularMarketPreviousClose: snapshot.prevDay?.c || 0,
            regularMarketPrice: price,
            regularMarketChange: snapshot.todaysChange || 0,
            regularMarketChangePercent: snapshot.todaysChangePerc || 0,
            // New Fields
            index: details.primary_exchange || 'N/A',
            insiderTrans: 0,
            instTrans: 0,
            sma20,
            sma150,
            sma20Distance,
            sma50Distance,
            sma150Distance,
            sma200Distance,
            isMock: false
        };

        // --- Yahoo Enrichment Strategy ---
        // If critical fields are missing (0), fetch from Yahoo
        if (finalResult.forwardPE === 0 || finalResult.beta === 1 || finalResult.shortRatio === 0) {
            try {
                // Import locally to avoid top-level issues if any
                const pkg = require('yahoo-finance2');
                const yahooFinance = new pkg.default();
                console.log(`[Stocks] Enriching ${capsSymbol} with Yahoo Finance data...`);

                const quoteSummary = await yahooFinance.quoteSummary(capsSymbol, { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] });
                const sd = quoteSummary.summaryDetail || {};
                const ks = quoteSummary.defaultKeyStatistics || {};
                const fd = quoteSummary.financialData || {};

                // Enrich fields
                if (finalResult.forwardPE === 0) finalResult.forwardPE = sd.forwardPE || 0;
                if (finalResult.pegRatio === 0) finalResult.pegRatio = ks.pegRatio || 0;
                if (finalResult.beta === 1 && sd.beta) finalResult.beta = sd.beta;

                // Shorts
                if (finalResult.shortRatio === 0) finalResult.shortRatio = sd.shortRatio || ks.shortRatio || 0;
                if (finalResult.shortPercentOfFloat === 0) finalResult.shortPercentOfFloat = ks.shortPercentOfFloat || 0;
                if (finalResult.sharesShort === 0) finalResult.sharesShort = ks.sharesShort || 0;

                // Ownership
                if (finalResult.insidersPercentHeld === 0) finalResult.insidersPercentHeld = ks.heldPercentInsiders || 0;
                if (finalResult.institutionsPercentHeld === 0) finalResult.institutionsPercentHeld = ks.heldPercentInstitutions || 0;

                // Estimates
                if (finalResult.forwardEps === 0) finalResult.forwardEps = ks.forwardEps || 0;

                // Verify/Override Enterprise Value if 0 (sometimes calc fails)
                if (finalResult.enterpriseValue === 0) finalResult.enterpriseValue = ks.enterpriseValue || 0;

                // Margins (if Polygon missed)
                if (finalResult.profitMargins === 0) finalResult.profitMargins = fd.profitMargins || 0;
                if (finalResult.grossMargins === 0) finalResult.grossMargins = fd.grossMargins || 0;
                if (finalResult.operatingMargins === 0) finalResult.operatingMargins = fd.operatingMargins || 0;

                // Growth (if missed)
                if (finalResult.revenueGrowth === 0) finalResult.revenueGrowth = fd.revenueGrowth || 0;
                if (finalResult.earningsQuarterlyGrowth === 0) finalResult.earningsQuarterlyGrowth = ks.earningsQuarterlyGrowth || 0;

            } catch (yErr: any) {
                console.warn(`[Stocks] Yahoo enrichment failed for ${capsSymbol}: ${yErr.message}`);
            }
        }

        return finalResult;


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
