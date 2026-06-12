import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { generateSlots, hasOverlap, toShanghaiDateTime } from '../../common/time/time.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(serviceItemId: number, date: string, staffId?: number) {
    const service = await this.prisma.serviceItem.findUnique({
      where: { id: serviceItemId },
    });
    if (!service) {
      throw new NotFoundException({
        code: AppErrorCode.SERVICE_NOT_FOUND,
        message: '服务项目不存在',
      });
    }

    const staffList = await this.prisma.staff.findMany({
      where: {
        id: staffId,
        isActive: true,
        staffServices: { some: { serviceItemId } },
      },
      orderBy: { id: 'asc' },
    });

    const grouped = [];
    for (const staff of staffList) {
      const slots = await this.getStaffSlots(staff.id, date, service.durationMinutes);
      grouped.push({ staffId: staff.id, staffName: staff.name, slots });
    }

    if (staffId) {
      return {
        date,
        serviceItemId,
        staffId,
        slots: grouped[0]?.slots ?? [],
      };
    }

    return { date, serviceItemId, staff: grouped };
  }

  private async getStaffSlots(staffId: number, date: string, durationMinutes: number) {
    const dayOfWeek = this.toDayOfWeek(date);
    const schedules = await this.prisma.staffWeeklySchedule.findMany({
      where: { staffId, dayOfWeek, isWorking: true },
    });
    const timeOffs = await this.prisma.staffTimeOff.findMany({
      where: { staffId },
    });
    const appointments = await this.prisma.appointment.findMany({
      where: { staffId, status: AppointmentStatus.PENDING },
    });

    return schedules.flatMap((schedule) => {
      const candidates = generateSlots({
        date,
        windowStart: schedule.startTime,
        windowEnd: schedule.endTime,
        durationMinutes,
        stepMinutes: 30,
      });

      return candidates.filter((slot) => {
        const overlapsTimeOff = timeOffs.some((item) =>
          hasOverlap(slot.startAt, slot.endAt, item.startAt, item.endAt),
        );
        const overlapsAppointment = appointments.some((item) =>
          hasOverlap(slot.startAt, slot.endAt, item.startAt, item.endAt),
        );
        return !overlapsTimeOff && !overlapsAppointment;
      });
    });
  }

  private toDayOfWeek(date: string): number {
    const jsDay = toShanghaiDateTime(date, '00:00').getDay();
    return jsDay === 0 ? 7 : jsDay;
  }
}
