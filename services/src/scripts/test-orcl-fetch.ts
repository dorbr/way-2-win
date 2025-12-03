
import { calculateAndSaveOptionsRatio } from '../services/options.service';
import { prisma } from '../config/db';

async function testOrclFetch() {
    console.log('--- Testing ORCL Data Fetch (No Save) ---');
    try {
        const result = await calculateAndSaveOptionsRatio('ORCL', null, false);
        console.log('Result:', result);
    } catch (error) {
        console.error('Error fetching ORCL:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testOrclFetch();
