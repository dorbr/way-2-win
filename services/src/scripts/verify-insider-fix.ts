
import { fetchStockFundamentals } from '../services/stocks.service';

async function verify() {
    try {
        console.log('Verifying AAPL...');
        const aapl = await fetchStockFundamentals('AAPL');
        console.log('AAPL Insider Trans:', (aapl.insiderTrans * 100).toFixed(2) + '%');
        console.log('AAPL Insider Own:', (aapl.insidersPercentHeld * 100).toFixed(2) + '%');

        console.log('\nVerifying NVDA...');
        const nvda = await fetchStockFundamentals('NVDA');
        console.log('NVDA Insider Trans:', (nvda.insiderTrans * 100).toFixed(2) + '%');
        console.log('NVDA Insider Own:', (nvda.insidersPercentHeld * 100).toFixed(2) + '%');

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
