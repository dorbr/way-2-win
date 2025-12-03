const { fetchStockFundamentals } = require('../services/stocks.service');

async function verifySurprise(symbol: string) {
    console.log(`Verifying Surprise Data for ${symbol}...`);
    try {
        const fundamentals = await fetchStockFundamentals(symbol);
        console.log('--- Fundamentals ---');
        console.log('Symbol:', fundamentals.symbol);
        console.log('EPS Surprise (%):', fundamentals.epsSurprisePercent * 100);
        console.log('Sales Surprise (%):', fundamentals.salesSurprise ? fundamentals.salesSurprise * 100 : 'N/A');

        if (fundamentals.epsSurprisePercent !== undefined) {
            console.log('SUCCESS: EPS Surprise is present.');
        } else {
            console.error('FAILURE: EPS Surprise is missing.');
        }

        if (fundamentals.salesSurprise === 0 || fundamentals.salesSurprise === null) {
            console.log('SUCCESS: Sales Surprise is 0/null as expected (placeholder).');
        } else {
            console.log('Sales Surprise has a value:', fundamentals.salesSurprise);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function run() {
    await verifySurprise('AAPL');
    await verifySurprise('MSFT');
}

run();

export {};
