import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  StaffDto,
  StaffServicesDto,
  staffSchema,
  staffServicesSchema,
} from './dto/staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(@Body(new ZodValidationPipe(staffSchema)) body: StaffDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<StaffDto>) {
    return this.service.update(Number(id), body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.updateStatus(Number(id), isActive);
  }

  @Put(':id/services')
  replaceServices(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(staffServicesSchema)) body: StaffServicesDto,
  ) {
    return this.service.replaceServices(Number(id), body.serviceItemIds);
  }
}
