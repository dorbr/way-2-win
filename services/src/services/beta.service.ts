import { fetchMacroData } from './macro.service';
import { fetchStockData } from './sp500.service';

interface BetaResult {
    macroType: 'CPI' | 'JOBLESS';
    correlation: number;
    dataPoints: { date: string; macroChange: number; spyChange: number }[];
    period: string;
}

function calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

export async function getMacroBeta(macroType: 'CPI' | 'JOBLESS', months: number = 24, symbol: string = '^GSPC'): Promise<BetaResult> {
    const macroData = await fetchMacroData();

    let macroHistory: { date: string; value: number }[] = [];
    let spyInterval: '1mo' | '1wk' = '1mo';

    if (macroType === 'CPI') {
        macroHistory = macroData.cpi.history;
        spyInterval = '1mo';
    } else {
        macroHistory = macroData.joblessClaims.history;
        spyInterval = '1wk';
    }

    const spyData = await fetchStockData(symbol, spyInterval);
    const spyHistory = spyData.history;

    // Align data and calculate changes
    // We need at least 2 points to calculate a change
    if (macroHistory.length < 2 || spyHistory.length < 2) {
        return { macroType, correlation: 0, dataPoints: [], period: 'N/A' };
    }

    // Sort ascending by date for calculation
    macroHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    spyHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dataPoints: { date: string; macroChange: number; spyChange: number }[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];

    // Calculate cutoff date based on months
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // Loop through macro history starting from 2nd item
    for (let i = 1; i < macroHistory.length; i++) {
        const currentMacro = macroHistory[i];
        const prevMacro = macroHistory[i - 1];

        // Filter by date
        if (new Date(currentMacro.date) < cutoffDate) continue;

        // Find matching SPY data
        // For monthly, we look for closest date within a few days? 
        // Or just match the date string if possible. 
        // FRED dates are usually 1st of month for CPI? No, release date is mid-month, but "date" in observation is usually 1st of month.
        // Yahoo monthly data is usually 1st of month.

        // Let's try to find exact date match or closest previous date
        const findSpy = (dateStr: string) => {
            const targetTime = new Date(dateStr).getTime();
            // Find closest date in spyHistory that is <= targetTime
            let bestMatch = null;
            let minDiff = Infinity;

            for (const item of spyHistory) {
                const itemTime = new Date(item.date).getTime();
                const diff = Math.abs(targetTime - itemTime);
                // Allow max 5 days difference for alignment
                if (diff < 5 * 24 * 60 * 60 * 1000) {
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestMatch = item;
                    }
                }
            }
            return bestMatch;
        };

        const currentSpy = findSpy(currentMacro.date);
        const prevSpy = findSpy(prevMacro.date);

        if (currentSpy && prevSpy) {
            const macroChange = (currentMacro.value - prevMacro.value) / prevMacro.value;
            const spyChange = (currentSpy.close - prevSpy.close) / prevSpy.close;

            dataPoints.push({
                date: currentMacro.date,
                macroChange,
                spyChange
            });
            xValues.push(macroChange);
            yValues.push(spyChange);
        }
    }

    const correlation = calculateCorrelation(xValues, yValues);

    return {
        macroType,
        correlation,
        dataPoints,
        period: `${months}m`
    };
}
