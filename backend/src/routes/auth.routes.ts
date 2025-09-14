import { Router } from 'express';
import { me, patientRegister, patientLogin, adminLogin, doctorLogin, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/me', requireAuth(), me);
router.post('/patient/register', patientRegister);
router.post('/patient/login', patientLogin);
router.post('/admin/login', adminLogin);
router.post('/doctor/login', doctorLogin);
router.post('/logout', requireAuth(), logout);

export default router;
