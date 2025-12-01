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

export const toggleTickerStatus = async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;
        const { isActive } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive status is required and must be a boolean' });
        }

        const upperSymbol = symbol.toUpperCase();

        const updatedTicker = await prisma.ticker.update({
            where: { symbol: upperSymbol },
            data: { isActive }
        });

        res.json(updatedTicker);
    } catch (error) {
        console.error('Error updating ticker status:', error);
        res.status(500).json({ error: 'Failed to update ticker status' });
    }
};
