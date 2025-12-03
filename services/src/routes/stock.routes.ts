import { Router } from 'express';
import { getStockData, getStockFundamentals } from '../controllers/stock.controller';

const router = Router();

router.get('/', getStockData);
router.get('/fundamentals', getStockFundamentals);

export default router;
