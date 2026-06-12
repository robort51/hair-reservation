import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.staff.findMany({
      include: { staffServices: { include: { serviceItem: true } } },
      orderBy: { id: 'asc' },
    });
  }

  detail(id: number) {
    return this.prisma.staff.findUnique({
      where: { id },
      include: { staffServices: { include: { serviceItem: true } } },
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

  async replaceServices(staffId: number, serviceItemIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffService.deleteMany({ where: { staffId } });
      await tx.staffService.createMany({
        data: serviceItemIds.map((serviceItemId, index) => ({
          staffId,
          serviceItemId,
          sortOrder: index,
        })),
      });
      return tx.staff.findUnique({
        where: { id: staffId },
        include: { staffServices: { include: { serviceItem: true } } },
      });
    });
  }
}
