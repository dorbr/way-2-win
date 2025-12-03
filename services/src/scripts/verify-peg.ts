const { fetchStockFundamentals } = require('../services/stocks.service');

async function verifyPEG(symbol: string) {
    console.log(`Verifying PEG for ${symbol}...`);
    try {
        const fundamentals = await fetchStockFundamentals(symbol);
        console.log('--- Fundamentals ---');
        console.log('Symbol:', fundamentals.symbol);
        console.log('Trailing P/E:', fundamentals.trailingPE);
        console.log('PEG Ratio:', fundamentals.pegRatio);

        if (fundamentals.pegRatio) {
            console.log('SUCCESS: PEG Ratio is present.');
            if (fundamentals.trailingPE) {
                const impliedGrowth = fundamentals.trailingPE / fundamentals.pegRatio;
                console.log('Implied Growth Rate (%):', impliedGrowth);
            }
        } else {
            console.error('FAILURE: PEG Ratio is missing.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function run() {
    await verifyPEG('AAPL');
    await verifyPEG('MSFT');
}

run();

export {};
