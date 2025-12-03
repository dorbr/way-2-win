
const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function debugInsiderData(symbol: string) {
    try {
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'majorHoldersBreakdown',
                'netSharePurchaseActivity',
                'defaultKeyStatistics',
                'institutionOwnership',
                'fundOwnership',
                'insiderTransactions',
                'insiderHolders'
            ]
        });

        console.log(`Data for ${symbol}:`);
        console.log('majorHoldersBreakdown:', JSON.stringify(result.majorHoldersBreakdown, null, 2));
        console.log('netSharePurchaseActivity:', JSON.stringify(result.netSharePurchaseActivity, null, 2));
        console.log('defaultKeyStatistics (heldPercentInsiders):', result.defaultKeyStatistics?.heldPercentInsiders);
        console.log('defaultKeyStatistics (heldPercentInstitutions):', result.defaultKeyStatistics?.heldPercentInstitutions);
        console.log('insiderHolders:', JSON.stringify(result.insiderHolders, null, 2));

        // Check if there are other relevant fields
        if (result.insiderTransactions) {
            console.log('insiderTransactions length:', result.insiderTransactions.transactions?.length);
            console.log('insiderTransactions (sample):', JSON.stringify(result.insiderTransactions.transactions?.slice(0, 2), null, 2));
        }

    } catch (error) {
        console.error(error);
    }
}

debugInsiderData('AAPL');
debugInsiderData('NVDA');

export {};
