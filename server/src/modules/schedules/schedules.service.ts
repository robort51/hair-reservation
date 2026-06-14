import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeOffDto, WeeklyScheduleDto } from './dto/schedule.dto';
import { toShanghaiDateTime } from '../../common/time/time.util';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTodayWorkingStaff(date = this.getShanghaiDateKey()) {
    const dayOfWeek = this.toDayOfWeek(date);
    const staffList = await this.prisma.staff.findMany({
      where: {
        isActive: true,
        weeklySchedules: { some: { dayOfWeek, isWorking: true } },
      },
      include: {
        weeklySchedules: {
          where: { dayOfWeek, isWorking: true },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return {
      date,
      staff: staffList.map((staff) => ({
        staffId: staff.id,
        staffName: staff.name,
        title: staff.title,
        schedules: staff.weeklySchedules.map((schedule) => ({
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        })),
      })),
    };
  }

  listWeekly(staffId: number) {
    return this.prisma.staffWeeklySchedule.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
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
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
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

  private toDayOfWeek(date: string): number {
    const jsDay = toShanghaiDateTime(date, '00:00').getDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  private getShanghaiDateKey() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    return `${year}-${month}-${day}`;
  }
}
