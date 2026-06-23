import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: 'USER' | 'MANAGER' | 'ADMIN';
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided, authorization denied.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nadra_secret_jwt_key_2026_xyz') as { id: string; role: 'USER' | 'MANAGER' | 'ADMIN' };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    next(new AppError('Token is not valid or has expired.', 401));
  }
};

export const requireRole = (roles: ('USER' | 'MANAGER' | 'ADMIN')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError('Permission denied. Access restricted to authorized roles.', 403));
    }
    next();
  };
};
