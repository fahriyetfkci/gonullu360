import { Router } from 'express';
import formController from '../controllers/formController';

const router = Router();

router.use(formController);

export default router;
