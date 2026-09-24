import { Router } from 'express';
import { contentController } from '../controllers/contentController';

const router = Router();

// Public editorial content — services, journal, and legal policies.
router.get('/services', contentController.getServices);
router.get('/blog', contentController.getBlogPosts);
router.get('/policies', contentController.getPolicies);

export default router;
