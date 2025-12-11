
import { getEarningsData } from '../../services/earnings.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const verifyLoad = async () => {
    // List of tickers to simulate a larger load, similar to real app usage
    const tickers = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B', 'LLY', 'V',
        'TSM', 'AVGO', 'NVO', 'JPM', 'WMT', 'XOM', 'MA', 'UNH', 'PG', 'ORCL',
        'COST', 'JNJ', 'HD', 'MRK', 'BAC', 'ABBV', 'CVX', 'KO', 'PEP', 'AMD'
    ]; // 30 tickers

    console.log(`Fetching earnings for ${tickers.length} tickers...`);
    const start = Date.now();

    try {
        const results = await getEarningsData(tickers);
        const duration = (Date.now() - start) / 1000;

        console.log(`Finished in ${duration.toFixed(2)}s`);

        const failures = results.filter(r => r.earningsDate === null);
        const success = results.length - failures.length;

        console.log(`Success: ${success}`);
        console.log(`Failures: ${failures.length}`);

        if (failures.length > 0) {
            console.log('Sample Failure:', JSON.stringify(failures[0], null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    }
};

verifyLoad();
