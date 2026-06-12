import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';
import { StaffModule } from './modules/staff/staff.module';
import { SchedulesModule } from './modules/schedules/schedules.module';

@Module({
  imports: [PrismaModule, ServiceCategoriesModule, ServiceItemsModule, StaffModule, SchedulesModule],
})
export class AppModule {}
