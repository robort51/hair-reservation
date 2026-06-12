import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { ServiceItemDto } from './dto/service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.serviceItem.findMany({
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async detail(id: number) {
    const item = await this.prisma.serviceItem.findUnique({
      where: { id },
      include: { category: true, staffServices: true },
    });
    if (!item) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在',
      });
    }
    return item;
  }

  create(data: ServiceItemDto) {
    return this.prisma.serviceItem.create({ data });
  }

  update(id: number, data: Partial<ServiceItemDto>) {
    return this.prisma.serviceItem.update({ where: { id }, data });
  }

  updateStatus(id: number, isActive: boolean) {
    return this.prisma.serviceItem.update({ where: { id }, data: { isActive } });
  }

  async remove(id: number) {
    const appointmentCount = await this.prisma.appointment.count({
      where: { serviceItemId: id },
    });
    if (appointmentCount > 0) {
      return this.updateStatus(id, false);
    }
    return this.prisma.serviceItem.delete({ where: { id } });
  }
}
