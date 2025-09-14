import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { createDoctor, listStats, listUsers, updateDoctor, deleteDoctor, listPatients, deletePatient } from '../controllers/admin.controller';
import { listInquiries, markInquiryRead, deleteInquiry } from "../controllers/contact.controller";
const router = Router();

router.use(requireAuth(['admin']));
router.get('/stats', listStats);
router.get('/users', listUsers);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.get('/patients', listPatients);
router.delete('/patients/:id', deletePatient);
router.get("/inquiries", requireAuth, listInquiries);
router.patch("/inquiries/:id/read", requireAuth, markInquiryRead);
router.delete("/inquiries/:id", requireAuth, deleteInquiry);

export default router;
