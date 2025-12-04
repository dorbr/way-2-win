import { Router } from 'express';
import { getUpcomingEarnings } from '../controllers/earnings.controller';

const router = Router();

router.get('/', getUpcomingEarnings);

export default router;
