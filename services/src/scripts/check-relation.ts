
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Ticker relations...');

    // Fetch tickers including history
    const tickers = await prisma.ticker.findMany({
        take: 5,
        include: {
            history: true,
        },
    });

    console.log(`Found ${tickers.length} tickers.`);
    for (const ticker of tickers) {
        console.log(`Ticker: ${ticker.symbol}, History items: ${ticker.history.length}`);
    }

    console.log('\nChecking OptionsRatioHistory foreign keys...');
    const historyItems = await prisma.optionsRatioHistory.findMany({
        take: 5,
    });

    for (const item of historyItems) {
        console.log(`History Item ID: ${item.id}, Ticker: ${item.ticker}, TickerId: ${item.tickerId}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
