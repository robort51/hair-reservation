import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';

@Module({
  imports: [PrismaModule, ServiceCategoriesModule, ServiceItemsModule],
})
export class AppModule {}
