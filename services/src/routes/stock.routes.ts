import { Router } from 'express';
import { getStockData } from '../controllers/stock.controller';

const router = Router();

router.get('/', getStockData);

export default router;
