import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/error';

const prisma = new PrismaClient();

const citizenSchema = z.object({
  nic: z.string().min(2, 'NIC number must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  fatherNic: z.string().min(2, 'Father/relative NIC must be at least 2 characters'),
  motherName: z.string().min(2, 'Mother name must be at least 2 characters'),
  birthCertificate: z.string().min(2, 'Birth certificate must be at least 2 characters'),
  residentForm: z.string().min(2, 'Resident form number must be at least 2 characters'),
  maritalStatus: z.string().min(2, 'Marital status must be at least 2 characters'),
  age: z.number().min(18, 'Applicant must be 18 or older to apply for an NIC Card'),
});

const updateCitizenSchema = citizenSchema.partial().omit({ age: true });

export const getRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nic: { contains: search, mode: 'insensitive' } },
        { fatherNic: { contains: search, mode: 'insensitive' } },
        { motherName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.citizenRecord.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.citizenRecord.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecordByNic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nic } = req.params;
    const record = await prisma.citizenRecord.findUnique({
      where: { nic },
    });

    if (!record) {
      return next(new AppError('Citizen record not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

export const createRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = citizenSchema.parse(req.body);

    const existingRecord = await prisma.citizenRecord.findUnique({
      where: { nic: body.nic },
    });

    if (existingRecord) {
      return next(new AppError('A citizen with this NIC is already registered.', 400));
    }

    const newRecord = await prisma.citizenRecord.create({
      data: {
        nic: body.nic,
        name: body.name,
        fatherNic: body.fatherNic,
        motherName: body.motherName,
        birthCertificate: body.birthCertificate,
        residentForm: body.residentForm,
        maritalStatus: body.maritalStatus,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { record: newRecord },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const updateRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nic } = req.params;
    const body = updateCitizenSchema.parse(req.body);

    const existingRecord = await prisma.citizenRecord.findUnique({
      where: { nic },
    });

    if (!existingRecord) {
      return next(new AppError('Citizen record not found.', 404));
    }

    // If updating NIC, make sure new NIC isn't taken
    if (body.nic && body.nic !== nic) {
      const conflictRecord = await prisma.citizenRecord.findUnique({
        where: { nic: body.nic },
      });
      if (conflictRecord) {
        return next(new AppError('The new NIC is already assigned to another citizen.', 400));
      }
    }

    const updatedRecord = await prisma.citizenRecord.update({
      where: { nic },
      data: body,
    });

    res.status(200).json({
      status: 'success',
      data: { record: updatedRecord },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const deleteRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nic } = req.params;
    const existingRecord = await prisma.citizenRecord.findUnique({
      where: { nic },
    });

    if (!existingRecord) {
      return next(new AppError('Citizen record not found.', 404));
    }

    await prisma.citizenRecord.delete({
      where: { nic },
    });

    res.status(200).json({
      status: 'success',
      message: 'Record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.citizenRecord.deleteMany();

    res.status(200).json({
      status: 'success',
      message: 'All citizen records deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalCount = await prisma.citizenRecord.count();
    
    // Group by marital status
    const statusCounts = await prisma.citizenRecord.groupBy({
      by: ['maritalStatus'],
      _count: {
        id: true,
      },
    });

    const statusBreakdown = statusCounts.reduce((acc: any, curr) => {
      acc[curr.maritalStatus] = curr._count.id;
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: {
        total: totalCount,
        breakdown: statusBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
