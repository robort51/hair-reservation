import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceCategoryDto } from './dto/service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  create(data: ServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data });
  }

  update(id: number, data: Partial<ServiceCategoryDto>) {
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  async remove(id: number) {
    const serviceCount = await this.prisma.serviceItem.count({
      where: { categoryId: id },
    });

    if (serviceCount > 0) {
      return this.prisma.serviceCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.serviceCategory.delete({ where: { id } });
  }
}
