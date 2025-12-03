const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function testFetch() {
    try {
        const symbol = 'AAPL';
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'defaultKeyStatistics',
                'netSharePurchaseActivity',
                'majorHoldersBreakdown',
                'institutionOwnership',
                'fundOwnership',
                'quoteType',
                'calendarEvents'
            ]
        }) as any;

        console.log('--- Default Key Statistics (IPO?) ---');
        console.log('firstTradeDateEpochUtc:', result.defaultKeyStatistics?.firstTradeDateEpochUtc);

        console.log('\n--- Net Share Purchase Activity (Insider Trans?) ---');
        console.log(JSON.stringify(result.netSharePurchaseActivity, null, 2));

        console.log('\n--- Insider Trend ---');
        console.log(JSON.stringify(result.insiderTrend, null, 2));

        console.log('\n--- Major Holders ---');
        console.log(JSON.stringify(result.majorHoldersBreakdown, null, 2));

        console.log('\n--- Quote Type (Index?) ---');
        console.log(JSON.stringify(result.quoteType, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testFetch();
