import { Router } from 'express';
import {
  createRequest,
  getRequests,
  verifyRequestByManager,
  verifyRequestByAdmin,
  rejectRequest,
} from '../controllers/requests';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Protect all routes with authMiddleware
router.use(authMiddleware);

// Get requests (accessible by all roles, returns filtered data)
router.get('/', getRequests);

// Create request (USER only)
router.post('/', requireRole(['USER']), createRequest);

// Verify request by Manager (MANAGER only)
router.put('/:id/verify-manager', requireRole(['MANAGER']), verifyRequestByManager);

// Verify/Approve request by Admin (ADMIN only)
router.put('/:id/verify-admin', requireRole(['ADMIN']), verifyRequestByAdmin);

// Reject request (MANAGER or ADMIN only)
router.put('/:id/reject', requireRole(['MANAGER', 'ADMIN']), rejectRequest);

export default router;
