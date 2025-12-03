const { fetchStockFundamentals } = require('../services/stocks.service');

async function verifyForwardPE(symbol: string) {
    console.log(`Verifying Forward P/E for ${symbol}...`);
    try {
        const fundamentals = await fetchStockFundamentals(symbol);
        console.log('--- Fundamentals ---');
        console.log('Symbol:', fundamentals.symbol);
        console.log('Price:', fundamentals.regularMarketPrice);
        console.log('Forward EPS:', fundamentals.forwardEps);
        console.log('Forward P/E:', fundamentals.forwardPE);

        if (fundamentals.regularMarketPrice && fundamentals.forwardEps) {
            const calculated = fundamentals.regularMarketPrice / fundamentals.forwardEps;
            console.log('Calculated (Price / Forward EPS):', calculated);
            const diff = Math.abs(fundamentals.forwardPE - calculated);
            if (diff < 0.0001) {
                console.log('SUCCESS: Forward P/E matches manual calculation.');
            } else {
                console.error('FAILURE: Forward P/E does NOT match manual calculation.');
                console.error(`Diff: ${diff}`);
            }
        } else {
            console.log('Skipping verification: Price or Forward EPS missing.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyForwardPE('AAPL');
