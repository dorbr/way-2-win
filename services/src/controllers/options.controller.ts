import { Request, Response } from 'express';
import { fetchOptionsOpenInterest, calculateAndSaveOptionsRatio, getOptionsRatioHistory } from '../services/options.service';

export const getOptionsData = async (req: Request, res: Response) => {
    try {
        const ticker = (req.query.ticker as string)?.toUpperCase();
        const expirationDate = req.query.expirationDate as string;

        if (!ticker) {
            return res.status(400).json({ error: 'Ticker is required' });
        }
        console.log(`Fetching options data for: ${ticker} (Exp: ${expirationDate || 'All'})`);
        const data = await fetchOptionsOpenInterest(ticker, expirationDate);
        console.log(`[Server] Sending ${data.length} options records for ${ticker}`);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching options data for ${req.query.ticker}:`, error);
        res.status(500).json({ error: 'Failed to fetch options data' });
    }
};

export const getRatioHistory = async (req: Request, res: Response) => {
    try {
        const ticker = (req.query.ticker as string)?.toUpperCase();
        let history = await getOptionsRatioHistory();

        if (ticker) {
            history = history.filter((item: any) => item.ticker === ticker);
        }

        res.json(history);
    } catch (error) {
        console.error('Error fetching options ratio history:', error);
        res.status(500).json({ error: 'Failed to fetch options ratio history' });
    }
};

export const calculateRatio = async (req: Request, res: Response) => {
    try {
        let { ticker } = req.body;
        if (!ticker) {
            return res.status(400).json({ error: 'Ticker is required' });
        }
        ticker = ticker.toUpperCase();

        console.log(`[Manual] Calculating options ratio for ${ticker}...`);
        // Calculate but DO NOT save to file (pass false as 3rd arg)
        const currentRecord = await calculateAndSaveOptionsRatio(ticker, null, false);

        // Return updated history for this ticker (history from file + current record)
        let history = await getOptionsRatioHistory();
        history = history.filter((item: any) => item.ticker === ticker);

        if (currentRecord) {
            history.push(currentRecord);
        }

        res.json(history);
    } catch (error) {
        console.error('Error calculating options ratio:', error);
        res.status(500).json({ error: 'Failed to calculate options ratio' });
    }
};
