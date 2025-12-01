import { prisma } from '../config/db';

async function verifyData() {
    console.log('[Verify Data] Starting verification...');

    try {
        const tickerCount = await prisma.ticker.count();
        console.log(`[Verify Data] Total Tickers: ${tickerCount}`);

        const historyCount = await prisma.optionsRatioHistory.count();
        console.log(`[Verify Data] Total History Records: ${historyCount}`);

        const linkedHistoryCount = await prisma.optionsRatioHistory.count({
            where: {
                tickerId: { not: null }
            }
        });
        console.log(`[Verify Data] History Records with linked Ticker: ${linkedHistoryCount}`);

        if (historyCount > 0) {
            const sampleHistory = await prisma.optionsRatioHistory.findFirst({
                include: { tickerRel: true }
            });
            console.log('[Verify Data] Sample History Record:', JSON.stringify(sampleHistory, null, 2));
        }

        if (tickerCount > 0) {
            const sampleTicker = await prisma.ticker.findFirst({
                include: { history: { take: 1 } }
            });
            console.log('[Verify Data] Sample Ticker Record:', JSON.stringify(sampleTicker, null, 2));
        }

    } catch (error) {
        console.error('[Verify Data] Error verifying data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();
