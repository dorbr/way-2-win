import { fetchStockFundamentals } from '../services/stocks.service';

async function verifyNewFields() {
    try {
        const symbol = 'AAPL';
        console.log(`Fetching fundamentals for ${symbol}...`);
        const data = await fetchStockFundamentals(symbol);

        console.log('--- New Fields Verification ---');
        console.log('Index:', data.index);
        console.log('Insider Trans:', data.insiderTrans);
        console.log('Inst Trans:', data.instTrans);
        console.log('SMA20:', data.sma20);
        console.log('SMA150:', data.sma150);
        console.log('IPO Date:', data.ipoDate);
        console.log('isMock:', data.isMock);

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyNewFields();
