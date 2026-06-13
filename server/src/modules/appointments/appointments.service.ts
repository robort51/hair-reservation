import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppErrorCode } from '../../common/errors/app-error-code';
import {
  addMinutes,
  hasOverlap,
  isInsideWindow,
  toShanghaiDateTime,
} from '../../common/time/time.util';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CancelAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentQueryDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListAppointmentQueryDto = {}) {
    return this.prisma.appointment.findMany({
      where: query.customerPhone
        ? { customerPhoneSnapshot: query.customerPhone }
        : undefined,
      orderBy: { startAt: 'desc' },
    });
  }

  async detail(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException({
        code: AppErrorCode.APPOINTMENT_NOT_FOUND,
        message: '预约不存在',
      });
    }
    return appointment;
  }

  async create(dto: CreateAppointmentDto) {
    const service = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceItemId },
    });
    if (!service || !service.isActive) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在或已停用',
      });
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff || !staff.isActive) {
      throw new NotFoundException({
        code: AppErrorCode.STAFF_NOT_FOUND,
        message: '员工不存在或已停用',
      });
    }

    const staffService = await this.prisma.staffService.findUnique({
      where: {
        staffId_serviceItemId: {
          staffId: dto.staffId,
          serviceItemId: dto.serviceItemId,
        },
      },
    });
    if (!staffService) {
      throw new ConflictException({
        code: AppErrorCode.STAFF_SERVICE_UNSUPPORTED,
        message: '该员工不能提供此服务',
      });
    }

    const startAt = new Date(dto.startAt);
    if (startAt < new Date()) {
      throw new ConflictException({
        code: AppErrorCode.APPOINTMENT_TIME_PASSED,
        message: '预约时间已过，请重新选择可预约时段',
      });
    }

    const endAt = addMinutes(startAt, service.durationMinutes);
    const date = dto.startAt.slice(0, 10);
    const dayOfWeek = this.toDayOfWeek(date);

    const schedules = await this.prisma.staffWeeklySchedule.findMany({
      where: { staffId: dto.staffId, dayOfWeek, isWorking: true },
    });
    const insideWorkingHours = schedules.some((schedule) =>
      isInsideWindow(
        startAt,
        endAt,
        toShanghaiDateTime(date, schedule.startTime),
        toShanghaiDateTime(date, schedule.endTime),
      ),
    );
    if (!insideWorkingHours) {
      throw new ConflictException({
        code: AppErrorCode.OUTSIDE_WORKING_HOURS,
        message: '预约时间不在员工工作时间内',
      });
    }

    const timeOffs = await this.prisma.staffTimeOff.findMany({
      where: { staffId: dto.staffId },
    });
    const overlapsTimeOff = timeOffs.some((item) =>
      hasOverlap(startAt, endAt, item.startAt, item.endAt),
    );
    if (overlapsTimeOff) {
      throw new ConflictException({
        code: AppErrorCode.STAFF_TIME_OFF,
        message: '该时间段员工不可预约',
      });
    }

    const pendingAppointments = await this.prisma.appointment.findMany({
      where: {
        staffId: dto.staffId,
        status: AppointmentStatus.PENDING,
      },
    });

    const isConflict = pendingAppointments.some((item) =>
      hasOverlap(startAt, endAt, item.startAt, item.endAt),
    );
    if (isConflict) {
      throw new ConflictException({
        code: AppErrorCode.APPOINTMENT_CONFLICT,
        message: '该时间段已被预约',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone: dto.customerPhone },
        update: { name: dto.customerName },
        create: { name: dto.customerName, phone: dto.customerPhone },
      });

      return tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceItemId: service.id,
          staffId: staff.id,
          customerNameSnapshot: customer.name,
          customerPhoneSnapshot: customer.phone,
          serviceNameSnapshot: service.name,
          serviceDurationMinutesSnapshot: service.durationMinutes,
          servicePriceCentsSnapshot: staffService.priceCents,
          staffNameSnapshot: staff.name,
          startAt,
          endAt,
          status: AppointmentStatus.PENDING,
          remark: dto.remark,
        },
      });
    });
  }

  cancel(id: number, dto: CancelAppointmentDto) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        cancelReason: dto.cancelReason,
      },
    });
  }

  complete(id: number) {
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
    });
  }

  private toDayOfWeek(date: string): number {
    const jsDay = toShanghaiDateTime(date, '00:00').getDay();
    return jsDay === 0 ? 7 : jsDay;
  }
}
