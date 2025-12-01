import { Request, Response } from 'express';
import { fetchCMEData } from '../services/cme.service';
import { fetchVIXData } from '../services/vix.service';
import { fetchFearGreedData } from '../services/fearGreed.service';
import { fetchMacroData } from '../services/macro.service';
import { fetchStockData } from '../services/sp500.service';
import { generateMarketInsight } from '../services/insights.service';

function aggregateHistory(vixHist: any[], fgHist: any[], fedHist: any[]) {
    // Create a map by date to merge data
    const historyMap = new Map();

    // Helper to add/update map
    const updateMap = (arr: any[], key: string, valFn: (item: any) => any) => {
        if (!arr) return;
        arr.forEach(item => {
            const date = item.date;
            if (!historyMap.has(date)) {
                historyMap.set(date, { date });
            }
            const entry = historyMap.get(date);
            Object.assign(entry, valFn(item));
        });
    };

    updateMap(vixHist, 'vix', item => ({ vixOpen: item.open, vixClose: item.close }));
    updateMap(fgHist, 'fg', item => ({ fgValue: item.value, fgLabel: item.label }));
    updateMap(fedHist, 'fed', item => ({ fedCutProb: item.cutProbability }));

    // Convert map to array and sort by date ASCENDING first to calculate opens
    const sortedHistory = Array.from(historyMap.values())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate "Open" values based on previous day's "Close" (Value)
    // For the very first item, we might not have an open, so we default to close or null.
    for (let i = 0; i < sortedHistory.length; i++) {
        const current: any = sortedHistory[i];
        const prev: any = i > 0 ? sortedHistory[i - 1] : null;

        // Fear & Greed Open/Close
        // Current 'fgValue' is treated as Close. Open is Prev Close.
        current.fgClose = current.fgValue;
        current.fgOpen = prev ? prev.fgValue : current.fgValue; // Fallback to current if no prev

        // Fed Cut Prob Open/Close
        // Current 'fedCutProb' is treated as Close. Open is Prev Close.
        current.fedClose = current.fedCutProb;
        current.fedOpen = prev ? prev.fedCutProb : current.fedCutProb; // Fallback to current if no prev
    }

    // Return descending for display (newest first), last 5 days
    return sortedHistory.reverse().slice(0, 5);
}

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        console.log("Fetching dashboard data...");

        const [fedWatch, vix, fearGreed, macro, sp500] = await Promise.all([
            fetchCMEData(),
            fetchVIXData(),
            fetchFearGreedData(),
            fetchMacroData(),
            fetchStockData()
        ]);

        // Generate insight (can be done in parallel or after, let's do after to have macro data)
        // Note: This adds latency. For production, maybe cache or run in background.
        // For now, we await it.
        const insight = await generateMarketInsight(macro, sp500);

        const response = {
            fedWatch,
            vix,
            fearGreed,
            cpi: macro.cpi,
            ppi: macro.ppi,
            joblessClaims: macro.joblessClaims,
            sp500: sp500,
            insight: insight,
            generatedAtUtc: new Date().toISOString(),
            history: aggregateHistory(vix.history, fearGreed.history, fedWatch.history || [])
        };

        res.json(response);
    } catch (error) {
        console.error('Error generating dashboard data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
