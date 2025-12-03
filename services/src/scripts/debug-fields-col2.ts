const pkg = require('yahoo-finance2');
const yahooFinance = new pkg.default();

async function findFields(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        // Fetching more modules to find the requested fields
        const result = await yahooFinance.quoteSummary(symbol, {
            modules: ['defaultKeyStatistics', 'assetProfile', 'financialData', 'summaryDetail', 'calendarEvents', 'earnings', 'earningsHistory', 'price', 'earningsTrend']
        }) as any;

        if (!result) {
            console.log('No result found');
            return;
        }

        const ks = result.defaultKeyStatistics || {};
        const sd = result.summaryDetail || {};
        const price = result.price || {};
        const fd = result.financialData || {};
        const ce = result.calendarEvents || {};
        const eh = result.earningsHistory || {};

        console.log('--- Requested Fields Candidates ---');
        console.log('P/E (trailingPE):', sd.trailingPE);
        console.log('Forward P/E (forwardPE):', sd.forwardPE);
        console.log('PEG (defaultKeyStatistics.pegRatio):', ks.pegRatio);
        console.log('PEG (summaryDetail.pegRatio):', sd.pegRatio); // Check summaryDetail too
        console.log('EPS (ttm) (trailingEps):', ks.trailingEps);
        console.log('EPS next Y (forwardEps):', ks.forwardEps); // Check if this matches "EPS next Y"
        console.log('EPS Q/Q (earningsQuarterlyGrowth):', ks.earningsQuarterlyGrowth);
        console.log('Sales Q/Q (revenueQuarterlyGrowth):', fd.revenueGrowth);

        const priceVal = result.price?.regularMarketPrice;
        console.log('Price:', priceVal);
        if (priceVal && ks.forwardEps) {
            console.log('Calculated Forward P/E (Price / Forward EPS):', priceVal / ks.forwardEps);
        }

        console.log('Earnings Date:', ce.earnings && ce.earnings.earningsDate);

        // EPS/Sales Surprise is usually in earnings history
        if (eh.history && eh.history.length > 0) {
            // Sort by quarter date descending to get the latest
            const sortedHistory = eh.history.sort((a: any, b: any) => new Date(b.quarter).getTime() - new Date(a.quarter).getTime());
            console.log('Latest Earnings History Item (Sorted):', JSON.stringify(sortedHistory[0], null, 2));
        }

        const earnings = result.earnings || {};
        console.log('Earnings Module:', JSON.stringify(earnings, null, 2));

        const et = result.earningsTrend || {};
        const trend = et.trend || [];
        console.log('Available Trend Periods:', trend.map((t: any) => t.period));

        console.log('--- Volume Fields ---');
        console.log('summaryDetail.averageVolume:', sd.averageVolume);
        console.log('summaryDetail.volume:', sd.volume);
        console.log('price.regularMarketVolume:', price.regularMarketVolume);

        const avgVol = sd.averageVolume;
        const vol = sd.volume || price.regularMarketVolume;
        if (avgVol && vol) {
            console.log('Calculated Rel Volume (Vol / AvgVol):', vol / avgVol);
        }

        const fiveYearTrend = trend.find((t: any) => t.period === '+5y');
        if (fiveYearTrend) {
            const growthRate = fiveYearTrend.growth * 100;
            console.log('5-Year Growth Rate (%):', growthRate);
            const pe = sd.trailingPE;
            if (pe) {
                console.log('Calculated PEG (Trailing P/E / Growth):', pe / growthRate);
            }
        } else {
            console.log('5-Year Trend not found. Checking +1y...');
            const nextYearTrend = trend.find((t: any) => t.period === '+1y');
            if (nextYearTrend) {
                const growthRate = nextYearTrend.growth * 100;
                console.log('Next Year Growth Rate (%):', growthRate);
                const pe = sd.trailingPE;
                if (pe) {
                    console.log('Calculated PEG (Trailing P/E / Next Year Growth):', pe / growthRate);
                }
            }
        }

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.errors) console.error(error.errors);
    }
}

findFields('AAPL');
setTimeout(() => findFields('MSFT'), 2000);
