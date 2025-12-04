import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getEarningsData } from '../services/earnings.service';

export const getUpcomingEarnings = async (req: Request, res: Response) => {
    try {
        // Fetch all active tickers
        const tickers = await prisma.ticker.findMany({
            where: { isActive: true },
            select: { symbol: true }
        });

        const symbols = tickers.map(t => t.symbol);

        if (symbols.length === 0) {
            return res.json([]);
        }

        const earningsData = await getEarningsData(symbols);

        // Sort by earnings date (soonest first)
        // Handle null dates by pushing them to the end
        earningsData.sort((a, b) => {
            if (!a.earningsDate) return 1;
            if (!b.earningsDate) return -1;
            return new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime();
        });

        res.json(earningsData);
    } catch (error) {
        console.error('Error in getUpcomingEarnings:', error);
        res.status(500).json({ error: 'Failed to fetch earnings data' });
    }
};
