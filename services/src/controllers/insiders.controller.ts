import { Request, Response } from 'express';
import { getInsiderData } from '../services/insiders.service';

export const getConf = async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            res.status(400).json({ error: 'Stock symbol is required' });
            return;
        }

        const data = await getInsiderData(symbol as string);
        res.json(data);
    } catch (error) {
        console.error('Error in getConf controller:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
