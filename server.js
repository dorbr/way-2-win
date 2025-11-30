require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchCMEData } = require('./fetchers/cme');
const { fetchVIXData } = require('./fetchers/vix');
const { fetchFearGreedData } = require('./fetchers/fearGreed');
const { fetchMacroData } = require('./fetchers/macro');
const { fetchStockData } = require('./fetchers/sp500');
const { generateMarketInsight } = require('./fetchers/insights');
const { fetchOptionsOpenInterest, calculateAndSaveOptionsRatio, getOptionsRatioHistory } = require('./fetchers/options');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json()); // Enable JSON body parsing for POST requests

// Main Dashboard Endpoint
app.get('/api/dashboard', async (req, res) => {
    try {
        console.log("Fetching dashboard data...");

        const [fedWatch, vix, fearGreed, macro, sp500] = await Promise.all([
            fetchCMEData(),
            fetchVIXData(),
            fetchFearGreedData(),
            fetchMacroData(),
            fetchStockData()
        ]);

        // Generate insight (can be done in parallel or after, let's do after to have macro data)
        // Note: This adds latency. For production, maybe cache or run in background.
        // For now, we await it.
        const insight = await generateMarketInsight(macro, sp500);

        const response = {
            fedWatch,
            vix,
            fearGreed,
            cpi: macro.cpi,
            ppi: macro.ppi,
            joblessClaims: macro.joblessClaims,
            sp500: sp500,
            insight: insight,
            generatedAtUtc: new Date().toISOString(),
            history: aggregateHistory(vix.history, fearGreed.history, fedWatch.history)
        };

        res.json(response);
    } catch (error) {
        console.error('Error generating dashboard data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Stock Data Endpoint
app.get('/api/stock', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }
        console.log(`Fetching data for stock: ${symbol}`);
        const data = await fetchStockData(symbol);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching stock data for ${req.query.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Options Data Endpoint
app.get('/api/options', async (req, res) => {
    try {
        const ticker = req.query.ticker;
        const expirationDate = req.query.expirationDate;

        if (!ticker) {
            return res.status(400).json({ error: 'Ticker is required' });
        }
        console.log(`Fetching options data for: ${ticker} (Exp: ${expirationDate || 'All'})`);
        const data = await fetchOptionsOpenInterest(ticker, expirationDate);
        console.log(`[Server] Sending ${data.length} options records for ${ticker}`);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching options data for ${req.query.ticker}:`, error);
        res.status(500).json({ error: 'Failed to fetch options data' });
    }
});

// Options Ratio History Endpoint
app.get('/api/options/ratio-history', async (req, res) => {
    try {
        const ticker = req.query.ticker;
        let history = getOptionsRatioHistory();

        if (ticker) {
            history = history.filter(item => item.ticker === ticker.toUpperCase());
        }

        res.json(history);
    } catch (error) {
        console.error('Error fetching options ratio history:', error);
        res.status(500).json({ error: 'Failed to fetch options ratio history' });
    }
});

// Trigger Calculation for a Ticker
app.post('/api/options/ratio-history', async (req, res) => {
    try {
        const { ticker } = req.body;
        if (!ticker) {
            return res.status(400).json({ error: 'Ticker is required' });
        }

        console.log(`[Manual] Calculating options ratio for ${ticker}...`);
        // Calculate but DO NOT save to file (pass false as 3rd arg)
        const currentRecord = await calculateAndSaveOptionsRatio(ticker, null, false);

        // Return updated history for this ticker (history from file + current record)
        let history = getOptionsRatioHistory();
        history = history.filter(item => item.ticker === ticker.toUpperCase());

        if (currentRecord) {
            history.push(currentRecord);
        }

        res.json(history);
    } catch (error) {
        console.error('Error calculating options ratio:', error);
        res.status(500).json({ error: 'Failed to calculate options ratio' });
    }
});

// Scheduled Task: Calculate and Save Options Ratio daily at 9:45 AM ET (15 mins after market open)
let lastRunDate = '';
const TICKERS = [
    'AAPL', 'ABNB', 'AMAT', 'AMD', 'AMZN', 'ANET', 'ASML', 'ASTS', 'AVGO', 'BABA',
    'BKNG', 'CCL', 'CLS', 'COF', 'COST', 'DELL', 'EBAY', 'GLD', 'GOOGL', 'GS',
    'HLT', 'HOOD', 'IBIT', 'IBKR', 'IBM', 'JPM', 'KKR', 'KO', 'LRCX', 'MAR',
    'MCD', 'MO', 'MPWR', 'MSFT', 'MU', 'NBIS', 'NLR', 'NVDA', 'NVMI', 'NVO',
    'OKLO', 'PANW', 'QCOM', 'QQQ', 'RCL', 'SMH', 'SMR', 'SOXL', 'SOXX', 'SPOT',
    'SPY', 'TGT', 'TOL', 'TSLA', 'TSM', 'TXN', 'UAL', 'VGT', 'VST', 'WMT', 'XYZ'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for scheduling logic (exported for testing)
function shouldRunTask(etTime, etDate, lastRunDate, etWeekday) {
    // Run at 09:45 AM ET
    if (etTime !== "09:45") return false;

    // Run only once per day
    if (lastRunDate === etDate) return false;

    // Skip weekends
    if (etWeekday === 'Sat' || etWeekday === 'Sun') return false;

    return true;
}

setInterval(async () => {
    const now = new Date();
    const etTime = now.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: '2-digit', minute: '2-digit' });
    const etDate = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });
    const etWeekday = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: 'short' });

    if (shouldRunTask(etTime, etDate, lastRunDate, etWeekday)) {
        lastRunDate = etDate;
        console.log(`[Scheduler] Starting daily options ratio calculation for ${etDate} (${etWeekday}) at ${etTime} ET...`);

        for (const ticker of TICKERS) {
            try {
                console.log(`[Scheduler] Processing ${ticker}...`);
                await calculateAndSaveOptionsRatio(ticker);
                // Paid plan: minimal delay to be safe, but much faster than free tier.
                await sleep(200);
            } catch (error) {
                console.error(`[Scheduler] Error calculating options ratio for ${ticker}:`, error.message);
            }
        }
        console.log('[Scheduler] Daily options ratio calculation completed.');
    }
}, 60000); // Check every minute

// Run once on startup for testing/demo purposes (optional)
// Just run for the first ticker to show it works without spamming
// DISABLED to prevent polluting history file with non-market-open data
/*
setTimeout(() => {
    console.log('[Scheduler] Initial startup calculation (demo for first ticker)...');
    calculateAndSaveOptionsRatio(TICKERS[0]).catch(e => console.error(e));
}, 5000);
*/

function aggregateHistory(vixHist, fgHist, fedHist) {
    // Create a map by date to merge data
    const historyMap = new Map();

    // Helper to add/update map
    const updateMap = (arr, key, valFn) => {
        if (!arr) return;
        arr.forEach(item => {
            const date = item.date;
            if (!historyMap.has(date)) {
                historyMap.set(date, { date });
            }
            const entry = historyMap.get(date);
            Object.assign(entry, valFn(item));
        });
    };

    updateMap(vixHist, 'vix', item => ({ vixOpen: item.open, vixClose: item.close }));
    updateMap(fgHist, 'fg', item => ({ fgValue: item.value, fgLabel: item.label }));
    updateMap(fedHist, 'fed', item => ({ fedCutProb: item.cutProbability }));

    // Convert map to array and sort by date ASCENDING first to calculate opens
    const sortedHistory = Array.from(historyMap.values())
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate "Open" values based on previous day's "Close" (Value)
    // For the very first item, we might not have an open, so we default to close or null.
    for (let i = 0; i < sortedHistory.length; i++) {
        const current = sortedHistory[i];
        const prev = i > 0 ? sortedHistory[i - 1] : null;

        // Fear & Greed Open/Close
        // Current 'fgValue' is treated as Close. Open is Prev Close.
        current.fgClose = current.fgValue;
        current.fgOpen = prev ? prev.fgValue : current.fgValue; // Fallback to current if no prev

        // Fed Cut Prob Open/Close
        // Current 'fedCutProb' is treated as Close. Open is Prev Close.
        current.fedClose = current.fedCutProb;
        current.fedOpen = prev ? prev.fedCutProb : current.fedCutProb; // Fallback to current if no prev
    }

    // Return descending for display (newest first), last 5 days
    return sortedHistory.reverse().slice(0, 5);
}

app.post('/api/analyze', async (req, res) => {
    try {
        const { symbol, macroData } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        console.log(`Generating insight for ${symbol}...`);

        // Fetch fresh stock data if needed, or use what's passed (but better to fetch fresh to be safe/consistent)
        const stockData = await fetchStockData(symbol);

        // If macroData is not passed, we might need to fetch it. 
        // For efficiency, let's assume the client passes it or we fetch it.
        // Fetching it ensures we have the latest.
        const macro = macroData || await fetchMacroData();

        const insight = await generateMarketInsight(macro, stockData);

        res.json({ insight });
    } catch (error) {
        console.error('Error generating analysis:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = { shouldRunTask };
