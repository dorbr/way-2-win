import { Request, Response } from 'express';
import { fetchStockData } from '../services/sp500.service';

export const getStockData = async (req: Request, res: Response) => {
    try {
        const symbol = req.query.symbol as string;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }
        console.log(`Fetching data for stock: ${symbol}`);
        const data = await fetchStockData(symbol);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching stock data for ${req.query.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
};
