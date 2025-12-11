
import { getEarningsData } from '../../services/earnings.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const verifyFix = async () => {
    const tickers = ['AAPL', 'MSFT', 'TSLA', 'NVDA'];
    console.log(`Fetching earnings for: ${tickers.join(', ')}`);

    try {
        const results = await getEarningsData(tickers);
        console.log('Results:');
        console.log(JSON.stringify(results, null, 2));

        const invalid = results.filter(r => r.earningsDate === null);
        if (invalid.length > 0) {
            console.warn(`Warning: ${invalid.length} tickers have no earnings date.`);
        } else {
            console.log('Success: All tickers have earnings dates!');
        }

    } catch (e) {
        console.error('Error:', e);
    }
};

verifyFix();
