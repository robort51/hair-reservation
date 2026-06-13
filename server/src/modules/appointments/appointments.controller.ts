import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentQuerySchema,
} from './dto/appointment.dto';
import type {
  CancelAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentQueryDto,
} from './dto/appointment.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { verifyAdminToken } from '../admin-auth/admin-token';
import { AppErrorCode } from '../../common/errors/app-error-code';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAppointmentQuerySchema))
    query: ListAppointmentQueryDto,
    @Req() request: Request,
  ) {
    if (!query.customerPhone) {
      this.assertAdmin(request);
    }
    return this.service.list(query);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema))
    body: CancelAppointmentDto,
  ) {
    return this.service.cancel(Number(id), body);
  }

  @Patch(':id/complete')
  @UseGuards(AdminAuthGuard)
  complete(@Param('id') id: string) {
    return this.service.complete(Number(id));
  }

  private assertAdmin(request: Request) {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    if (!token || !verifyAdminToken(token)) {
      throw new UnauthorizedException({
        code: AppErrorCode.ADMIN_UNAUTHORIZED,
        message: '请先登录后台',
      });
    }
  }
}
