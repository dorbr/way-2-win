import { prisma } from '../config/db';

const DEFAULT_TICKERS = [
    'AAPL', 'ABNB', 'AMAT', 'AMD', 'AMZN', 'ANET', 'ASML', 'ASTS', 'AVGO', 'BABA',
    'BKNG', 'CCL', 'CLS', 'COF', 'COST', 'DELL', 'EBAY', 'GLD', 'GOOGL', 'GS',
    'HLT', 'HOOD', 'IBIT', 'IBKR', 'IBM', 'JPM', 'KKR', 'KO', 'LRCX', 'MAR',
    'MCD', 'MO', 'MPWR', 'MSFT', 'MU', 'NBIS', 'NLR', 'NVDA', 'NVMI', 'NVO',
    'OKLO', 'PANW', 'QCOM', 'QQQ', 'RCL', 'SMH', 'SMR', 'SOXL', 'SOXX', 'SPOT',
    'SPY', 'TGT', 'TOL', 'TSLA', 'TSM', 'TXN', 'UAL', 'VGT', 'VST', 'WMT', 'XYZ'
];

async function seedTickers() {
    console.log('[Seed Tickers] Starting ticker seeding...');

    try {
        let addedCount = 0;
        for (const symbol of DEFAULT_TICKERS) {
            // Upsert to avoid errors if it exists, or use createMany with skipDuplicates
            // Using upsert for safety if we want to update fields later, but createMany is faster.
            // Since we only have symbol, findUnique or create is fine.

            const existing = await prisma.ticker.findUnique({
                where: { symbol }
            });

            if (!existing) {
                await prisma.ticker.create({
                    data: { symbol }
                });
                addedCount++;
            }
        }
        console.log(`[Seed Tickers] Seeding completed. Added ${addedCount} new tickers.`);

        const total = await prisma.ticker.count();
        console.log(`[Seed Tickers] Total tickers in DB: ${total}`);

    } catch (error) {
        console.error('[Seed Tickers] Error seeding tickers:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedTickers();
