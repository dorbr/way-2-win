const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function findFields(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'defaultKeyStatistics',
                'summaryDetail',
                'financialData',
                'price'
            ]
        }) as any;

        if (!result) {
            console.log('No result found');
            return;
        }

        const ks = result.defaultKeyStatistics || {};
        const sd = result.summaryDetail || {};
        const fd = result.financialData || {};
        const price = result.price || {};

        console.log('--- Shares & Short ---');
        console.log('Shs Outstand (sharesOutstanding):', ks.sharesOutstanding);
        console.log('Shs Float (floatShares):', ks.floatShares);
        console.log('Short Float (shortPercentOfFloat):', ks.shortPercentOfFloat);
        console.log('Short Ratio (shortRatio):', ks.shortRatio);
        console.log('Short Interest (sharesShort):', ks.sharesShort); // or dateShortInterest?

        console.log('--- Price & Volume ---');
        console.log('52W High (fiftyTwoWeekHigh):', sd.fiftyTwoWeekHigh);
        console.log('52W Low (fiftyTwoWeekLow):', sd.fiftyTwoWeekLow);
        console.log('Beta (beta):', ks.beta); // or sd.beta?
        console.log('Avg Volume (averageVolume):', sd.averageVolume);
        console.log('Volume (volume):', sd.volume); // or regularMarketVolume in price?
        console.log('Regular Market Volume:', price.regularMarketVolume);

        console.log('--- Technicals (Likely missing directly) ---');
        // ATR and RSI are typically calculated values.
        // We might need to fetch historical data to calculate them if not here.

        // Rel Volume = Volume / Avg Volume
        const vol = sd.volume || price.regularMarketVolume;
        const avgVol = sd.averageVolume;
        if (vol && avgVol) {
            console.log('Rel Volume (calc):', vol / avgVol);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.errors) console.error(error.errors);
    }
}

findFields('AAPL');

export {};
