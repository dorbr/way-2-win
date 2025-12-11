const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

const testYahoo = async () => {
    try {
        const symbol = 'AAPL';
        console.log(`Testing Yahoo Finance for ${symbol}...`);

        // Modules to check
        const modules = ['calendarEvents', 'earnings'];

        const result = await yahooFinance.quoteSummary(symbol, { modules });

        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.calendarEvents && result.calendarEvents.earnings) {
            console.log('Earnings Date:', result.calendarEvents.earnings.earningsDate);
            console.log('Earnings Average:', result.calendarEvents.earnings.earningsAverage);
            console.log('Revenue Average:', result.calendarEvents.earnings.revenueAverage);
        }

    } catch (e) {
        console.error('Error:', e);
    }
};

testYahoo();
