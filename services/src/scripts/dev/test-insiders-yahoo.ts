
import { getInsiderData } from '../../services/insiders.service';

const test = async () => {
    // Test a stock with known recent activity
    const symbol = 'NVDA';
    console.log(`Testing Insider Data for ${symbol}...`);

    const data = await getInsiderData(symbol);

    if (data.error) {
        console.error('Error:', data.error);
    } else {
        const insiderTrades = data.insiderTrades || [];
        const institutionalHoldings = data.institutionalHoldings || [];

        console.log('--- Insider Trades ---');
        console.log(`Count: ${insiderTrades.length}`);
        insiderTrades.slice(0, 3).forEach((t: any) => console.log(`${t.transactionDate}: ${t.transactionCode} ${t.shares} @ ${t.price} (${t.reportingName})`));

        console.log('\n--- Institutional Holdings ---');
        console.log(`Count: ${institutionalHoldings.length}`);
        institutionalHoldings.slice(0, 3).forEach((h: any) => console.log(`${h.holder}: ${h.shares} (${h.source})`));
    }
};

test();
