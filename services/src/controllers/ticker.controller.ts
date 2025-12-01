import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getTickers = async (req: Request, res: Response) => {
    try {
        const tickers = await prisma.ticker.findMany({
            orderBy: { symbol: 'asc' }
        });
        res.json(tickers);
    } catch (error) {
        console.error('Error fetching tickers:', error);
        res.status(500).json({ error: 'Failed to fetch tickers' });
    }
};

export const addTicker = async (req: Request, res: Response) => {
    try {
        const { symbol } = req.body;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        const upperSymbol = symbol.toUpperCase();

        const existing = await prisma.ticker.findUnique({
            where: { symbol: upperSymbol }
        });

        if (existing) {
            return res.status(400).json({ error: 'Ticker already exists' });
        }

        const ticker = await prisma.ticker.create({
            data: { symbol: upperSymbol }
        });

        res.json(ticker);
    } catch (error) {
        console.error('Error adding ticker:', error);
        res.status(500).json({ error: 'Failed to add ticker' });
    }
};

export const deleteTicker = async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        const upperSymbol = symbol.toUpperCase();

        await prisma.ticker.delete({
            where: { symbol: upperSymbol }
        });

        res.json({ message: 'Ticker deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticker:', error);
        res.status(500).json({ error: 'Failed to delete ticker' });
    }
};
