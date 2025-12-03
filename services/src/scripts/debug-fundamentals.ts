const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function testFetch(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);

        const result = await yahooFinance.quoteSummary(symbol, {
            modules: ['defaultKeyStatistics', 'assetProfile', 'financialData', 'summaryDetail']
        }) as any;

        if (!result) {
            console.log('No result found');
            return;
        }

        const defaultKeyStatistics = result.defaultKeyStatistics || {};
        const assetProfile = result.assetProfile || {};
        const financialData = result.financialData || {};
        const summaryDetail = result.summaryDetail || {};

        console.log('--- Raw Data Samples ---');
        console.log('Market Cap (summaryDetail):', summaryDetail.marketCap);
        console.log('Enterprise Value (defaultKeyStatistics):', defaultKeyStatistics.enterpriseValue);
        console.log('Net Income (defaultKeyStatistics):', defaultKeyStatistics.netIncomeToCommon);
        console.log('Total Revenue (financialData):', financialData.totalRevenue);
        console.log('Employees (assetProfile):', assetProfile.fullTimeEmployees);

        console.log('\n--- Mapped Values ---');
        // yahoo-finance2 returns numbers directly, not { raw, fmt } objects usually, or it handles it.
        // Let's check the output.

        console.log('Market Cap:', summaryDetail.marketCap);
        console.log('Enterprise Value:', defaultKeyStatistics.enterpriseValue);
        console.log('Income:', defaultKeyStatistics.netIncomeToCommon);
        console.log('Revenue:', financialData.totalRevenue);

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.errors) {
            console.error('Errors:', error.errors);
        }
    }
}

testFetch('AAPL');
