import { Router } from 'express';
import { getOptionsData, getRatioHistory, calculateRatio } from '../controllers/options.controller';

const router = Router();

router.get('/', getOptionsData);
router.get('/ratio-history', getRatioHistory);
router.post('/ratio-history', calculateRatio);

export default router;
