import { Router } from 'express';
import { getUpcomingEarnings, getFinancials } from '../controllers/earnings.controller';

const router = Router();

router.get('/', getUpcomingEarnings);
router.get('/:symbol/financials', getFinancials);

export default router;
