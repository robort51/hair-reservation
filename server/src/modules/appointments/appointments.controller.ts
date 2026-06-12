import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
} from './dto/appointment.dto';
import type {
  CancelAppointmentDto,
  CreateAppointmentDto,
} from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAppointmentSchema))
    body: CreateAppointmentDto,
  ) {
    return this.service.create(body);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema))
    body: CancelAppointmentDto,
  ) {
    return this.service.cancel(Number(id), body);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(Number(id));
  }
}
