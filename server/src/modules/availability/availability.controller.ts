import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  getAvailability(
    @Query('serviceItemId') serviceItemId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.service.getAvailability(
      Number(serviceItemId),
      date,
      staffId ? Number(staffId) : undefined,
    );
  }
}
