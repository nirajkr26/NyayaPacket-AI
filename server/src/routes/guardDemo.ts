import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Citizen-only guarded ping
router.get('/citizen/ping', authenticate, requireRole('citizen'), (req: Request, res: Response) => {
  res.json({
    message: 'Citizen access granted. Welcome to the citizen evidence organizer.',
    role: req.user?.role,
    user: {
      id: req.user?._id,
      name: req.user?.name,
    },
  });
});

// Lawyer-only guarded ping
router.get('/lawyer/ping', authenticate, requireRole('lawyer'), (req: Request, res: Response) => {
  res.json({
    message: 'Lawyer access granted. Welcome to the advocate portal.',
    role: req.user?.role,
    user: {
      id: req.user?._id,
      name: req.user?.name,
      barCouncilId: req.user?.barCouncilId,
    },
  });
});

export default router;
