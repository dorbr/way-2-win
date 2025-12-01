import { Router } from 'express';
import { getMacroBeta } from '../services/beta.service';

const router = Router();

router.get('/beta/:type', async (req, res) => {
    try {
        const type = req.params.type.toUpperCase();
        const months = req.query.months ? parseInt(req.query.months as string) : 24;
        const symbol = req.query.symbol ? (req.query.symbol as string).toUpperCase() : 'SPY';

        if (type !== 'CPI' && type !== 'JOBLESS') {
            return res.status(400).json({ error: 'Invalid macro type. Use CPI or JOBLESS.' });
        }
        const data = await getMacroBeta(type as 'CPI' | 'JOBLESS', months, symbol);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
