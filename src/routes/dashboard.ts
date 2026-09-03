import { Router } from 'express';
import { range, stats } from '../controllers/dashboardController';
import { organizationContext } from '../middleware/organization';

const router = Router();
router.use(organizationContext);
router.get('/range', range);
router.get('/stats', stats);
export default router;
