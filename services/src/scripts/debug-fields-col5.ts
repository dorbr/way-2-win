const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function findFields(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'price',
                'summaryDetail',
                'financialData'
            ]
        }) as any;

        if (!result) {
            console.log('No result found');
            return;
        }

        const price = result.price || {};
        const sd = result.summaryDetail || {};
        const fd = result.financialData || {};

        console.log('--- Price Data ---');
        console.log('Prev Close (regularMarketPreviousClose):', price.regularMarketPreviousClose);
        console.log('Prev Close (summaryDetail.previousClose):', sd.previousClose);

        console.log('Price (regularMarketPrice):', price.regularMarketPrice);
        console.log('Price (financialData.currentPrice):', fd.currentPrice);

        console.log('Change (regularMarketChange):', price.regularMarketChange);
        console.log('Change % (regularMarketChangePercent):', price.regularMarketChangePercent);

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.errors) console.error(error.errors);
    }
}

findFields('AAPL');
