import { IService } from './service.interface';
import { Prisma, Service } from '@prisma/client';
import prisma from '../../../shared/prisma';
import {
  IOptions,
  ServiceFilterableFields,
  ServiceSearchableFields,
} from './service.constant';
import { IGenericResponse } from '../../../interfaces/common';
import { calculatePagination } from '../../../helpers/paginationHelper';

const listAllServices = async (
  options: IOptions,
  filters: any
): Promise<IGenericResponse<IService[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build the WHERE condition for filtering and searching
  const andConditions = [];

  // Handling search
  if (filters.searchTerm) {
    andConditions.push({
      OR: ServiceSearchableFields.map(field => ({
        [field]: { contains: filters.searchTerm, mode: 'insensitive' },
      })),
    });
  }

  // Handling filtering
  ServiceFilterableFields.forEach(field => {
    if (filters[field]) {
      andConditions.push({ [field]: { equals: filters[field] } });
    }
  });

  const whereConditions =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Execute the query with pagination, sorting, and filtering
  const services = await prisma.service.findMany({
    include: {
      images: true,
      availabilities: true,
      bookings: true,
      cartItems: true,
      category: true,
      reviews: true,
    },
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.service.count({ where: whereConditions });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: services,
  };
};

const createService = async (serviceData: IService): Promise<IService> => {
  const { images, ...rest } = serviceData;

  const imageCreateInputs =
    images?.map(image => ({
      filePath: image.filePath,
    })) || [];

  const service = await prisma.service.create({
    data: {
      ...rest,
      images: {
        create: imageCreateInputs,
      },
    },
    include: {
      images: true,
      category: true,
    },
  });

  return service;
};

const getService = async (serviceId: string): Promise<IService | null> => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  return service;
};

const updateService = async (
  serviceId: string,
  serviceData: Prisma.ServiceUpdateInput
): Promise<Service> => {
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: serviceData,
  });
  return service;
};

const deleteService = async (serviceId: string): Promise<IService> => {
  const service = await prisma.service.delete({ where: { id: serviceId } });
  return service;
};

const deleteMultipleServices = async (serviceIds: string[]) => {
  const deletedServices = [];
  const notFoundServices = [];

  for (const serviceId of serviceIds) {
    try {
      const service = await prisma.service.delete({
        where: { id: serviceId },
      });
      deletedServices.push(service);
    } catch (error:any) {
      // Check for specific error message indicating not found
      if (error.message.includes('Record to delete does not exist')) {
        notFoundServices.push(serviceId);
      } else {
        // Handle other errors
        console.error(error);
      }
    }
  }

  return { deletedServices, notFoundServices };
};



export const ServiceService = {
  createService,
  getService,
  updateService,
  deleteService,
  listAllServices,
  deleteMultipleServices
};
