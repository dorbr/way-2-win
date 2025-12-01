import { Router } from 'express';
import { getTickers, addTicker, deleteTicker } from '../controllers/ticker.controller';

const router = Router();

router.get('/', getTickers);
router.post('/', addTicker);
router.delete('/:symbol', deleteTicker);

export default router;
