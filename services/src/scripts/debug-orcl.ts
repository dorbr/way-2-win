
import { prisma } from '../config/db';

async function debugOrcl() {
    console.log('--- Debugging ORCL ---');

    // 1. Check Ticker
    const ticker = await prisma.ticker.findUnique({
        where: { symbol: 'ORCL' },
        include: { history: { take: 5, orderBy: { timestamp: 'desc' } } }
    });

    console.log('Ticker Record:', ticker);

    if (!ticker) {
        console.log('ORCL ticker not found in DB!');
    } else {
        console.log(`Ticker ID: ${ticker.id}, Active: ${ticker.isActive}`);
    }

    // 2. Check History by String
    const historyByString = await prisma.optionsRatioHistory.findMany({
        where: { ticker: 'ORCL' },
        take: 5,
        orderBy: { timestamp: 'desc' }
    });

    console.log(`History entries (by string 'ORCL'): ${historyByString.length}`);
    if (historyByString.length > 0) {
        console.log('Sample history (string):', historyByString[0]);
    }

    // 3. Check History by ID (if ticker exists)
    if (ticker) {
        const historyById = await prisma.optionsRatioHistory.findMany({
            where: { tickerId: ticker.id },
            take: 5,
            orderBy: { timestamp: 'desc' }
        });
        console.log(`History entries (by ID ${ticker.id}): ${historyById.length}`);
    }

    await prisma.$disconnect();
}

debugOrcl().catch(console.error);
