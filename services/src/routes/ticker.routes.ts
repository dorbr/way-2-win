import { Router } from 'express';
import { getTickers, addTicker, toggleTickerStatus } from '../controllers/ticker.controller';

const router = Router();

router.get('/', getTickers);
router.post('/', addTicker);
router.patch('/:symbol/status', toggleTickerStatus);

export default router;
