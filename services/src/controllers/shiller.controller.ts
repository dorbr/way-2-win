
import { Request, Response } from 'express';
import { fetchShillerPEHistory } from '../services/shiller.service';

export const getShillerHistory = async (req: Request, res: Response) => {
    try {
        const symbol = req.query.symbol as string || '^GSPC';
        const data = await fetchShillerPEHistory(symbol);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
