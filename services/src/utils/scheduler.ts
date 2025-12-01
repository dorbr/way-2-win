import { calculateAndSaveOptionsRatio } from '../services/options.service';
import { prisma } from '../config/db';

const DEFAULT_TICKERS = [
    'AAPL', 'ABNB', 'AMAT', 'AMD', 'AMZN', 'ANET', 'ASML', 'ASTS', 'AVGO', 'BABA',
    'BKNG', 'CCL', 'CLS', 'COF', 'COST', 'DELL', 'EBAY', 'GLD', 'GOOGL', 'GS',
    'HLT', 'HOOD', 'IBIT', 'IBKR', 'IBM', 'JPM', 'KKR', 'KO', 'LRCX', 'MAR',
    'MCD', 'MO', 'MPWR', 'MSFT', 'MU', 'NBIS', 'NLR', 'NVDA', 'NVMI', 'NVO',
    'OKLO', 'PANW', 'QCOM', 'QQQ', 'RCL', 'SMH', 'SMR', 'SOXL', 'SOXX', 'SPOT',
    'SPY', 'TGT', 'TOL', 'TSLA', 'TSM', 'TXN', 'UAL', 'VGT', 'VST', 'WMT', 'XYZ'
];

let lastRunDate = '';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function shouldRunTask(etTime: string, etDate: string, lastRunDate: string, etWeekday: string): boolean {
    // Run at 09:45 AM ET
    if (etTime !== "09:45") return false;

    // Run only once per day
    if (lastRunDate === etDate) return false;

    // Skip weekends
    if (etWeekday === 'Sat' || etWeekday === 'Sun') return false;

    return true;
}

async function getTickers(): Promise<string[]> {
    try {
        const count = await prisma.ticker.count();
        if (count === 0) {
            console.log('[Scheduler] Seeding default tickers...');
            for (const symbol of DEFAULT_TICKERS) {
                await prisma.ticker.create({
                    data: { symbol }
                });
            }
            return DEFAULT_TICKERS;
        }

        const tickers = await prisma.ticker.findMany({
            select: { symbol: true }
        });
        return tickers.map(t => t.symbol);
    } catch (error) {
        console.error('[Scheduler] Error fetching tickers:', error);
        return [];
    }
}

export function startScheduler() {
    // Initial seed check
    getTickers().then(() => console.log('[Scheduler] Ticker check complete.'));

    setInterval(async () => {
        const now = new Date();
        const etTime = now.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: '2-digit', minute: '2-digit' });
        const etDate = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });
        const etWeekday = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: 'short' });

        if (shouldRunTask(etTime, etDate, lastRunDate, etWeekday)) {
            lastRunDate = etDate;
            console.log(`[Scheduler] Starting daily options ratio calculation for ${etDate} (${etWeekday}) at ${etTime} ET...`);

            const tickers = await getTickers();
            console.log(`[Scheduler] Found ${tickers.length} tickers to process.`);

            for (const ticker of tickers) {
                try {
                    console.log(`[Scheduler] Processing ${ticker}...`);
                    await calculateAndSaveOptionsRatio(ticker);
                    // Paid plan: minimal delay to be safe, but much faster than free tier.
                    await sleep(200);
                } catch (error: any) {
                    console.error(`[Scheduler] Error calculating options ratio for ${ticker}:`, error.message);
                }
            }
            console.log('[Scheduler] Daily options ratio calculation completed.');
        }
    }, 60000); // Check every minute
}
