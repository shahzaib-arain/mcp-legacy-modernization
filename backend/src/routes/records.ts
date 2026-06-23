import { Router } from 'express';
import {
  getRecords,
  getRecordByNic,
  createRecord,
  updateRecord,
  deleteRecord,
  deleteAllRecords,
  getStats,
} from '../controllers/records';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Protect all citizen records routes
router.use(authMiddleware);

router.get('/', getRecords);
router.post('/', requireRole(['ADMIN']), createRecord);
router.delete('/', requireRole(['ADMIN']), deleteAllRecords); // Bulk delete
router.get('/stats', getStats);
router.get('/:nic', getRecordByNic);
router.put('/:nic', requireRole(['ADMIN']), updateRecord);
router.delete('/:nic', requireRole(['ADMIN']), deleteRecord);

export default router;
