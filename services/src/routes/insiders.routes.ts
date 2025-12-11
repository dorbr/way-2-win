import { Router } from 'express';
import { getConf } from '../controllers/insiders.controller';

const router = Router();

router.get('/:symbol', getConf);

export default router;
