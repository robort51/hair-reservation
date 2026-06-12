import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { ServiceItemsModule } from './modules/service-items/service-items.module';
import { StaffModule } from './modules/staff/staff.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';

@Module({
  imports: [
    PrismaModule,
    ServiceCategoriesModule,
    ServiceItemsModule,
    StaffModule,
    SchedulesModule,
    AvailabilityModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
