import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: body.username },
    });

    if (existingAdmin) {
      return next(new AppError('Username is already taken.', 400));
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username: body.username,
        password: hashedPassword,
        name: body.name,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        admin: {
          id: newAdmin.id,
          username: newAdmin.username,
          name: newAdmin.name,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({
      where: { username: body.username },
    });

    if (!admin || !(await bcrypt.compare(body.password, admin.password))) {
      return next(new AppError('Invalid username or password.', 401));
    }

    const token = jwt.sign(
      { id: admin.id },
      process.env.JWT_SECRET || 'nadra_secret_jwt_key_2026_xyz',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      status: 'success',
      token,
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.adminId },
    });

    if (!admin) {
      return next(new AppError('Admin profile not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
