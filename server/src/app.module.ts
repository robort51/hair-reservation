import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';
import { StaffModule } from './modules/staff/staff.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import {AvailabilityModule} from "./modules/availability/availability.module";

@Module({
  imports: [PrismaModule, ServiceCategoriesModule, ServiceItemsModule, StaffModule, SchedulesModule, AvailabilityModule],
})
export class AppModule {}
