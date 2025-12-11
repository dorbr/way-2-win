import { fetchStockData, fetchCurrentPrice } from '../../services/sp500.service';
import { fetchVIXData } from '../../services/vix.service';
import { fetchStockFundamentals } from '../../services/stocks.service';
import { fetchShillerPEHistory } from '../../services/shiller.service';

// Mock env if needed or ensure it's loaded by the runner (ts-node usually loads .env if configured, but we might need dotenv)
import dotenv from 'dotenv';
const result = dotenv.config();
console.log('Dotenv result:', result.error ? result.error : 'Loaded');
console.log('Current Dir:', process.cwd());
console.log('POLYGON_API_KEY Present:', !!process.env.POLYGON_API_KEY);

async function verifyPolygonMigration() {
    console.log('=== Verifying Polygon.io Migration ===');

    try {
        // 1. Verify SP500 Service
        console.log('\n--- 1. Testing SP500 Service ---');
        console.log('Fetching ^GSPC data...');
        const sp500 = await fetchStockData('^GSPC');
        console.log(`Result: ${sp500.symbol}, History Length: ${sp500.history.length}, Last Close: ${sp500.close}`);
        if (sp500.history.length > 0) {
            console.log('Sample Data:', sp500.history[sp500.history.length - 1]);
        }

        console.log('Fetching Current Price for ^GSPC...');
        const sp500Price = await fetchCurrentPrice('^GSPC');
        console.log(`Result: ${sp500Price}`);

        // 2. Verify VIX Service
        console.log('\n--- 2. Testing VIX Service ---');
        const vix = await fetchVIXData();
        console.log(`Result: VIX Today: ${vix.current}, Prev: ${vix.previous}, History Length: ${vix.history.length}`);

        // 3. Verify Stocks Service
        console.log('\n--- 3. Testing Stocks Service (AAPL) ---');
        const aapl = await fetchStockFundamentals('AAPL');
        console.log(`Result: ${aapl.symbol}`);
        console.log(`Market Cap: ${aapl.marketCap}`);
        console.log(`PE Trailing: ${aapl.trailingPE}, Forward: ${aapl.forwardPE}`);
        console.log(`PEG: ${aapl.pegRatio}, Short Ratio: ${aapl.shortRatio}`);
        console.log(`Beta: ${aapl.beta}, Held Insiders: ${aapl.insidersPercentHeld}`);
        console.log(`EPS: ${aapl.trailingEps}, Revenue: ${aapl.totalRevenue}`);
        console.log(`Technicals: RSI=${aapl.rsi14}, ATR=${aapl.atr14}, SMA50=${aapl.fiftyDayAverage}`);
        console.log(`IsMock: ${aapl.isMock}`);
        console.log(`EPS: ${aapl.trailingEps}, Revenue: ${aapl.totalRevenue}`);
        console.log(`Technicals: RSI=${aapl.rsi14}, ATR=${aapl.atr14}, SMA50=${aapl.fiftyDayAverage}`);
        console.log(`IsMock: ${aapl.isMock}`);

        // 4. Verify Shiller Service
        console.log('\n--- 4. Testing Shiller Service (AAPL) ---');
        // Test AAPL for single stock logic (uses Polygon financials + macro)
        const shillerAapl = await fetchShillerPEHistory('AAPL');
        console.log(`Result: AAPL Shiller History Length: ${shillerAapl.length}`);
        if (shillerAapl.length > 0) {
            console.log('Latest Point:', shillerAapl[0]);
        }

        console.log('\n--- Testing Shiller Service (S&P 500) ---');
        // Test SP500 for index logic (uses multpl + polygon GSPC)
        const shillerSpy = await fetchShillerPEHistory('^GSPC');
        console.log(`Result: S&P 500 Shiller History Length: ${shillerSpy.length}`);
        if (shillerSpy.length > 0) {
            console.log('Latest Point:', shillerSpy[0]);
        }

    } catch (error) {
        console.error('Verification Failed:', error);
    }
}

verifyPolygonMigration();
