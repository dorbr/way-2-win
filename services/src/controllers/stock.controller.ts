import { Request, Response } from 'express';
import { fetchStockData } from '../services/sp500.service';

export const getStockData = async (req: Request, res: Response) => {
    try {
        const symbol = req.query.symbol as string;
        const interval = req.query.interval as '1d' | '1wk' | '1mo' || '1mo';
        const range = req.query.range as string || '2y';

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }
        console.log(`Fetching data for stock: ${symbol}, interval: ${interval}, range: ${range}`);
        const data = await fetchStockData(symbol, interval, range);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching stock data for ${req.query.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
};

export const getStockFundamentals = async (req: Request, res: Response) => {
    try {
        const symbol = req.query.symbol as string;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        // Import dynamically to avoid circular deps if any, or just standard import at top
        const { fetchStockFundamentals } = await import('../services/stocks.service');

        console.log(`Fetching fundamentals for stock: ${symbol}`);
        const data = await fetchStockFundamentals(symbol);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching stock fundamentals for ${req.query.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch stock fundamentals' });
    }
};
