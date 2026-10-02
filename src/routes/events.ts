import { Router } from 'express';
import multer from 'multer';
import { create, createGroup, detail, getReport, latest, list, options, overview, remove, saveReport, update, updateNotes, updateTask, uploadPoster } from '../controllers/eventController';
import { authMiddleware, requireManager } from '../middleware/auth';

const router = Router();
router.use(authMiddleware, requireManager);
const posterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ['image/png', 'image/jpeg'].includes(file.mimetype)),
});
router.get('/', list);
router.get('/options', options);
router.get('/overview', overview);
router.post('/groups', createGroup);
router.post('/', create);
router.post('/poster', posterUpload.single('poster'), uploadPoster);
router.get('/latest', latest);
router.get('/:id', detail);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/:id/report', getReport);
router.put('/:id/report', saveReport);
router.put('/:id/notes', updateNotes);
router.patch('/:id/tasks/:taskId', updateTask);
export default router;
