import { Router } from 'express';
import { analyzeMarket, getAssetCorrelation } from '../controllers/analysis.controller';

const router = Router();

router.post('/', analyzeMarket);
router.get('/correlation', getAssetCorrelation);

export default router;
