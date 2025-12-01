import { prisma } from '../config/db';

async function verifyTickerStatus() {
    const testSymbol = 'TEST_TICKER_' + Date.now();
    console.log(`Creating test ticker: ${testSymbol}`);

    try {
        // 1. Create Ticker
        const ticker = await prisma.ticker.create({
            data: { symbol: testSymbol }
        });
        console.log('Created ticker:', ticker);

        if (ticker.isActive !== true) {
            throw new Error('Default isActive should be true');
        }

        // 2. Toggle Status to false
        console.log('Updating status to false...');
        const updated1 = await prisma.ticker.update({
            where: { symbol: testSymbol },
            data: { isActive: false }
        });
        console.log('Updated ticker (false):', updated1);

        if (updated1.isActive !== false) {
            throw new Error('Failed to update isActive to false');
        }

        // 3. Toggle Status back to true
        console.log('Updating status to true...');
        const updated2 = await prisma.ticker.update({
            where: { symbol: testSymbol },
            data: { isActive: true }
        });
        console.log('Updated ticker (true):', updated2);

        if (updated2.isActive !== true) {
            throw new Error('Failed to update isActive to true');
        }

        console.log('Verification successful!');

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await prisma.ticker.delete({
            where: { symbol: testSymbol }
        }).catch(() => { });
        await prisma.$disconnect();
    }
}

verifyTickerStatus();
