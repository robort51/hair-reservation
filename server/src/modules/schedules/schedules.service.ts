import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeOffDto, WeeklyScheduleDto } from './dto/schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  listWeekly(staffId: number) {
    return this.prisma.staffWeeklySchedule.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  replaceWeekly(staffId: number, dto: WeeklyScheduleDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffWeeklySchedule.deleteMany({ where: { staffId } });
      await tx.staffWeeklySchedule.createMany({
        data: dto.schedules.map((schedule) => ({ staffId, ...schedule })),
      });
      return tx.staffWeeklySchedule.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  listTimeOff(staffId: number) {
    return this.prisma.staffTimeOff.findMany({
      where: { staffId },
      orderBy: { startAt: 'asc' },
    });
  }

  createTimeOff(staffId: number, dto: TimeOffDto) {
    return this.prisma.staffTimeOff.create({
      data: {
        staffId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
      },
    });
  }

  updateTimeOff(id: number, dto: Partial<TimeOffDto>) {
    return this.prisma.staffTimeOff.update({
      where: { id },
      data: {
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        reason: dto.reason,
      },
    });
  }

  removeTimeOff(id: number) {
    return this.prisma.staffTimeOff.delete({ where: { id } });
  }
}
