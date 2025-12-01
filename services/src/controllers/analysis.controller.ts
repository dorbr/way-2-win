import { Request, Response } from 'express';
import { fetchStockData } from '../services/sp500.service';
import { fetchMacroData } from '../services/macro.service';
import { generateMarketInsight } from '../services/insights.service';

export const analyzeMarket = async (req: Request, res: Response) => {
    try {
        const { symbol, macroData } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        console.log(`Generating insight for ${symbol}...`);

        // Fetch fresh stock data if needed, or use what's passed (but better to fetch fresh to be safe/consistent)
        const stockData = await fetchStockData(symbol);

        // If macroData is not passed, we might need to fetch it. 
        // For efficiency, let's assume the client passes it or we fetch it.
        // Fetching it ensures we have the latest.
        const macro = macroData || await fetchMacroData();

        const insight = await generateMarketInsight(macro, stockData);

        res.json({ insight });
    } catch (error) {
        console.error('Error generating analysis:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
};

export const getAssetCorrelation = async (req: Request, res: Response) => {
    try {
        const { tickers, months } = req.query;

        if (!tickers) {
            return res.status(400).json({ error: 'Tickers are required' });
        }

        const tickerList = (tickers as string).split(',');
        const monthCount = months ? parseInt(months as string) : 12;

        // Import dynamically to avoid circular dependency issues if any, though here it should be fine.
        // Better to import at top, but for this edit let's add import at top.
        const { getAssetCorrelation } = await import('../services/correlation.service');

        const result = await getAssetCorrelation(tickerList, monthCount);

        res.json(result);
    } catch (error) {
        console.error('Error calculating correlation:', error);
        res.status(500).json({ error: 'Failed to calculate correlation' });
    }
};
