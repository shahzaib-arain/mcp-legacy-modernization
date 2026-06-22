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
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Protect all citizen records routes
router.use(authMiddleware);

router.get('/', getRecords);
router.post('/', createRecord);
router.delete('/', deleteAllRecords); // Bulk delete
router.get('/stats', getStats);
router.get('/:nic', getRecordByNic);
router.put('/:nic', updateRecord);
router.delete('/:nic', deleteRecord);

export default router;
