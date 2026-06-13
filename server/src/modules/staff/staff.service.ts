import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StaffDto, StaffServicesDto } from './dto/staff.dto';

type StaffServiceAssignment = {
  serviceItemId: number;
  priceCents?: number;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.staff.findMany({
      include: {
        staffServices: {
          include: { serviceItem: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  detail(id: number) {
    return this.prisma.staff.findUnique({
      where: { id },
      include: {
        staffServices: {
          include: { serviceItem: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  create(data: StaffDto) {
    return this.prisma.staff.create({ data });
  }

  update(id: number, data: Partial<StaffDto>) {
    return this.prisma.staff.update({ where: { id }, data });
  }

  updateStatus(id: number, isActive: boolean) {
    return this.prisma.staff.update({ where: { id }, data: { isActive } });
  }

  async replaceServices(staffId: number, dto: StaffServicesDto) {
    const assignments: StaffServiceAssignment[] =
      dto.services ??
      dto.serviceItemIds?.map((serviceItemId) => ({ serviceItemId })) ??
      [];
    const serviceItemIds = assignments.map((item) => item.serviceItemId);

    return this.prisma.$transaction(async (tx) => {
      const serviceItems = await tx.serviceItem.findMany({
        where: { id: { in: serviceItemIds } },
        select: { id: true, priceCents: true },
      });
      const basePriceByServiceId = new Map(
        serviceItems.map((service) => [service.id, service.priceCents]),
      );

      await tx.staffService.deleteMany({ where: { staffId } });
      await tx.staffService.createMany({
        data: assignments.map((assignment, index) => ({
          staffId,
          serviceItemId: assignment.serviceItemId,
          priceCents:
            assignment.priceCents ??
            basePriceByServiceId.get(assignment.serviceItemId) ??
            0,
          sortOrder: index,
        })),
      });
      return tx.staff.findUnique({
        where: { id: staffId },
        include: {
          staffServices: {
            include: { serviceItem: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      });
    });
  }
}
