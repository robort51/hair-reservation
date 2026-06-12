import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ServiceItemDto, serviceItemSchema } from './dto/service-item.dto';
import { ServiceItemsService } from './service-items.service';

@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly service: ServiceItemsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(@Body(new ZodValidationPipe(serviceItemSchema)) body: ServiceItemDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<ServiceItemDto>) {
    return this.service.update(Number(id), body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.updateStatus(Number(id), isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
