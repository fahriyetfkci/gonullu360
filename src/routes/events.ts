import { Router } from 'express';
import { detail, getReport, latest, saveReport, updateNotes, updateTask } from '../controllers/eventController';
import { authMiddleware, requireManager } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, requireManager);
router.get('/latest', latest);
router.get('/:id', detail);
router.get('/:id/report', getReport);
router.put('/:id/report', saveReport);
router.put('/:id/notes', updateNotes);
router.patch('/:id/tasks/:taskId', updateTask);
export default router;
