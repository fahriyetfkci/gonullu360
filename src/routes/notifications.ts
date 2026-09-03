import { Router } from 'express';
import { create, list, readAll, readOne, remove } from '../controllers/notificationController';
import { authMiddleware, requireManager } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, requireManager);
router.put('/read-all', readAll);
router.get('/', list);
router.post('/', create);
router.put('/:id/read', readOne);
router.delete('/:id', remove);
export default router;
