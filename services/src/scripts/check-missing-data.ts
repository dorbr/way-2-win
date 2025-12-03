
import { prisma } from '../config/db';

async function checkMissingData() {
    console.log('--- Checking for Active Tickers with Missing Data (Last 24h) ---');

    const activeTickers = await prisma.ticker.findMany({
        where: { isActive: true },
        select: { id: true, symbol: true }
    });

    console.log(`Total Active Tickers: ${activeTickers.length}`);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const missingDataTickers = [];

    for (const ticker of activeTickers) {
        const history = await prisma.optionsRatioHistory.findFirst({
            where: {
                tickerId: ticker.id,
                timestamp: { gte: oneDayAgo }
            }
        });

        if (!history) {
            // Double check by string ticker just in case
            const historyString = await prisma.optionsRatioHistory.findFirst({
                where: {
                    ticker: ticker.symbol,
                    timestamp: { gte: oneDayAgo }
                }
            });

            if (!historyString) {
                missingDataTickers.push(ticker.symbol);
            }
        }
    }

    console.log(`Tickers with missing data in last 24h: ${missingDataTickers.length}`);
    if (missingDataTickers.length > 0) {
        console.log('Missing Tickers:', missingDataTickers);
    }

    await prisma.$disconnect();
}

checkMissingData().catch(console.error);
