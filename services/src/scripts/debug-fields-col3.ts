const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function findFields(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'defaultKeyStatistics',
                'assetProfile',
                'financialData',
                'summaryDetail',
                'majorHoldersBreakdown',
                'netSharePurchaseActivity',
                'insiderHolders',
                'institutionOwnership',
                'fundOwnership',
                'majorDirectHolders'
            ]
        }) as any;

        if (!result) {
            console.log('No result found');
            return;
        }

        const ks = result.defaultKeyStatistics || {};
        const sd = result.summaryDetail || {};
        const fd = result.financialData || {};
        const mhb = result.majorHoldersBreakdown || {};
        const nspa = result.netSharePurchaseActivity || {};

        console.log('--- Ownership & Transactions ---');
        console.log('Insider Own (insidersPercentHeld):', mhb.insidersPercentHeld);
        console.log('Inst Own (institutionsPercentHeld):', mhb.institutionsPercentHeld);
        // Insider Trans is tricky. Maybe netSharePurchaseActivity?
        console.log('Net Share Purchase Activity:', nspa);

        console.log('--- Margins ---');
        console.log('Gross Margin (grossMargins):', fd.grossMargins);
        console.log('Oper. Margin (operatingMargins):', fd.operatingMargins);
        console.log('Profit Margin (profitMargins):', fd.profitMargins);

        console.log('--- SMAs ---');
        console.log('SMA 50 (fiftyDayAverage):', sd.fiftyDayAverage);
        console.log('SMA 200 (twoHundredDayAverage):', sd.twoHundredDayAverage);
        // SMA 20 and 150 are likely not here.

        // Let's check if we can calculate them or if they are hidden.
        // Usually not in quoteSummary.

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.errors) console.error(error.errors);
    }
}

findFields('AAPL');
