
import { Router } from 'express';
import { getShillerHistory } from '../controllers/shiller.controller';

const router = Router();

router.get('/history', getShillerHistory);

export default router;
