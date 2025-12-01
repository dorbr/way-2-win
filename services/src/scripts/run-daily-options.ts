import { calculateAndSaveOptionsRatio } from '../services/options.service';
import { prisma } from '../config/db';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getTickers(): Promise<string[]> {
    try {
        const tickers = await prisma.ticker.findMany({
            where: { isActive: true },
            select: { symbol: true }
        });
        return tickers.map(t => t.symbol);
    } catch (error) {
        console.error('[Scheduler] Error fetching tickers:', error);
        return [];
    }
}

async function run() {
    const now = new Date();
    const etTime = now.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: '2-digit', minute: '2-digit' });
    const etDate = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });
    const etWeekday = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: 'short' });

    console.log(`[Scheduler] Script triggered at ${now.toISOString()} (UTC) / ${etTime} (ET) on ${etDate} (${etWeekday})`);

    // Check if force flag is present
    const forceRun = process.argv.includes('--force');

    if (forceRun) {
        console.log('[Scheduler] Force run detected. Bypassing time and weekend checks.');
    } else {
        // Check if it's a weekend
        if (etWeekday === 'Sat' || etWeekday === 'Sun') {
            console.log('[Scheduler] It is the weekend. Skipping task.');
            process.exit(0);
        }

        // Check time window: 09:40 to 09:55 ET
        // We want to run at 09:45 ET. The cron runs at 13:45 UTC and 14:45 UTC.
        // One of these will be 09:45 ET depending on DST.
        const [hour, minute] = etTime.split(':').map(Number);
        const timeInMinutes = hour * 60 + minute;
        const targetTime = 9 * 60 + 45; // 09:45
        const windowStart = targetTime - 5; // 09:40
        const windowEnd = targetTime + 10; // 09:55

        if (timeInMinutes < windowStart || timeInMinutes > windowEnd) {
            console.log(`[Scheduler] Current ET time ${etTime} is outside the target window (09:40-09:55). Skipping task.`);
            process.exit(0);
        }
    }

    console.log(`[Scheduler] Time is within window. Starting daily options ratio calculation...`);

    try {
        const tickers = await getTickers();
        console.log(`[Scheduler] Found ${tickers.length} tickers to process.`);

        for (const ticker of tickers) {
            try {
                console.log(`[Scheduler] Processing ${ticker}...`);
                await calculateAndSaveOptionsRatio(ticker);
                await sleep(200);
            } catch (error: any) {
                console.error(`[Scheduler] Error calculating options ratio for ${ticker}:`, error.message);
            }
        }
        console.log('[Scheduler] Daily options ratio calculation completed.');
    } catch (error) {
        console.error('[Scheduler] Fatal error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();
