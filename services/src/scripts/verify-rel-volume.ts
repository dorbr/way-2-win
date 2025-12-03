const { fetchStockFundamentals } = require('../services/stocks.service');

async function verifyRelVolume(symbol: string) {
    console.log(`Verifying Relative Volume for ${symbol}...`);
    try {
        const fundamentals = await fetchStockFundamentals(symbol);
        console.log('--- Fundamentals ---');
        console.log('Symbol:', fundamentals.symbol);
        console.log('Volume:', fundamentals.volume);
        console.log('Avg Volume:', fundamentals.averageVolume);
        console.log('Rel Volume:', fundamentals.relVolume);

        if (fundamentals.volume && fundamentals.averageVolume) {
            const simpleRelVol = fundamentals.volume / fundamentals.averageVolume;
            console.log('Simple Rel Volume (Vol / AvgVol):', simpleRelVol);

            if (Math.abs(fundamentals.relVolume - simpleRelVol) > 0.01) {
                console.log('SUCCESS: Rel Volume is different from simple calculation (Projection Active).');
            } else {
                console.log('NOTE: Rel Volume matches simple calculation (Market Closed or Pre-Market).');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function run() {
    await verifyRelVolume('AAPL');
    await verifyRelVolume('MSFT');
}

run();
