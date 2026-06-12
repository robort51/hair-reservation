import { Module } from '@nestjs/common';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';

@Module({
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
  exports: [ServiceItemsService],
})
export class ServiceItemsModule {}
