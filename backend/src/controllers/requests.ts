import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const requestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  fatherNic: z.string().min(2, 'Father/relative NIC must be at least 2 characters'),
  motherName: z.string().min(2, 'Mother name must be at least 2 characters'),
  birthCertificate: z.string().min(2, 'Birth certificate must be at least 2 characters'),
  residentForm: z.string().min(2, 'Resident form number must be at least 2 characters'),
  maritalStatus: z.string().min(2, 'Marital status must be at least 2 characters'),
  age: z.number().min(18, 'Applicant must be 18 or older to apply for an NIC Card'),
});

const generateUniqueNIC = async (): Promise<string> => {
  let isUnique = false;
  let nic = '';
  while (!isUnique) {
    const part1 = Math.floor(10000 + Math.random() * 90000); // 5 digits
    const part2 = Math.floor(1000000 + Math.random() * 9000000); // 7 digits
    const part3 = Math.floor(0 + Math.random() * 10); // 1 digit
    nic = `${part1}-${part2}-${part3}`;

    const existingInRecords = await prisma.citizenRecord.findUnique({
      where: { nic },
    });
    const existingInRequests = await prisma.verificationRequest.findUnique({
      where: { nic },
    });
    if (!existingInRecords && !existingInRequests) {
      isUnique = true;
    }
  }
  return nic;
};

export const createRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = requestSchema.parse(req.body);

    if (!req.userId) {
      return next(new AppError('Unauthorized access.', 401));
    }

    const newRequest = await prisma.verificationRequest.create({
      data: {
        name: body.name,
        fatherNic: body.fatherNic,
        motherName: body.motherName,
        birthCertificate: body.birthCertificate,
        residentForm: body.residentForm,
        maritalStatus: body.maritalStatus,
        age: body.age,
        userId: req.userId,
        status: 'PENDING_MANAGER',
      },
    });

    res.status(201).json({
      status: 'success',
      data: { request: newRequest },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId || !req.userRole) {
      return next(new AppError('Unauthorized access.', 401));
    }

    let requests;
    if (req.userRole === 'USER') {
      requests = await prisma.verificationRequest.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.userRole === 'MANAGER') {
      requests = await prisma.verificationRequest.findMany({
        where: { status: 'PENDING_MANAGER' },
        include: {
          user: { select: { name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.userRole === 'ADMIN') {
      requests = await prisma.verificationRequest.findMany({
        where: { status: 'PENDING_ADMIN' },
        include: {
          user: { select: { name: true } },
          manager: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return next(new AppError('Forbidden: Invalid Role', 403));
    }

    res.status(200).json({
      status: 'success',
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRequestByManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.userId) {
      return next(new AppError('Unauthorized access.', 401));
    }

    const request = await prisma.verificationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return next(new AppError('Verification request not found.', 404));
    }

    if (request.status !== 'PENDING_MANAGER') {
      return next(new AppError('Request is not pending manager verification.', 400));
    }

    const updatedRequest = await prisma.verificationRequest.update({
      where: { id },
      data: {
        status: 'PENDING_ADMIN',
        managerId: req.userId,
        managerVerifiedAt: new Date(),
      },
    });

    res.status(200).json({
      status: 'success',
      data: { request: updatedRequest },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRequestByAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.userId) {
      return next(new AppError('Unauthorized access.', 401));
    }

    const request = await prisma.verificationRequest.findUnique({
      where: { id },
      include: {
        manager: { select: { name: true } },
      },
    });

    if (!request) {
      return next(new AppError('Verification request not found.', 404));
    }

    if (request.status !== 'PENDING_ADMIN') {
      return next(new AppError('Request is not in pending admin approval state.', 400));
    }

    // Get Admin User profile to record admin name
    const adminUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!adminUser) {
      return next(new AppError('Admin user profile not found.', 404));
    }

    const generatedNic = await generateUniqueNIC();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update verification request status
      const updatedRequest = await tx.verificationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          nic: generatedNic,
          adminId: adminUser.id,
          adminVerifiedAt: new Date(),
        },
      });

      // 2. Create the CitizenRecord
      const citizenRecord = await tx.citizenRecord.create({
        data: {
          nic: generatedNic,
          name: request.name,
          fatherNic: request.fatherNic,
          motherName: request.motherName,
          birthCertificate: request.birthCertificate,
          residentForm: request.residentForm,
          maritalStatus: request.maritalStatus,
          isVerified: true,
          verifiedByManager: request.manager?.name || 'Manager',
          verifiedByAdmin: adminUser.name,
        },
      });

      return { updatedRequest, citizenRecord };
    });

    res.status(200).json({
      status: 'success',
      data: {
        request: result.updatedRequest,
        record: result.citizenRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.userId || !req.userRole) {
      return next(new AppError('Unauthorized access.', 401));
    }

    const request = await prisma.verificationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return next(new AppError('Verification request not found.', 404));
    }

    if (request.status !== 'PENDING_MANAGER' && request.status !== 'PENDING_ADMIN') {
      return next(new AppError('Request cannot be rejected in its current status.', 400));
    }

    const updateData: any = {
      status: 'REJECTED',
    };

    if (req.userRole === 'MANAGER') {
      updateData.managerId = req.userId;
      updateData.managerVerifiedAt = new Date();
    } else if (req.userRole === 'ADMIN') {
      updateData.adminId = req.userId;
      updateData.adminVerifiedAt = new Date();
    }

    const updatedRequest = await prisma.verificationRequest.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: { request: updatedRequest },
    });
  } catch (error) {
    next(error);
  }
};
