import { Router } from 'express';
import volunteerController from '../controllers/volunteerController';

const router = Router();
router.use(volunteerController);
export default router;
