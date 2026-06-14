import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { TimeOffDto, WeeklyScheduleDto } from './dto/schedule.dto';
import { addMinutes, toShanghaiDateTime } from '../../common/time/time.util';

type ScheduleInterval = {
  startTime: string;
  endTime: string;
};

type DateInterval = {
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTodayWorkingStaff(date = this.getShanghaiDateKey()) {
    const dayOfWeek = this.toDayOfWeek(date);
    const dayStart = toShanghaiDateTime(date, '00:00');
    const dayEnd = addMinutes(dayStart, 24 * 60);
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
        timeOffs: {
          where: {
            startAt: { lt: dayEnd },
            endAt: { gt: dayStart },
          },
          orderBy: { startAt: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return {
      date,
      staff: staffList
        .map((staff) => ({
          staffId: staff.id,
          staffName: staff.name,
          title: staff.title,
          schedules: staff.weeklySchedules.flatMap((schedule) =>
            this.subtractTimeOffs(
              date,
              {
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
              staff.timeOffs,
            ),
          ),
        }))
        .filter((staff) => staff.schedules.length > 0),
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

  private subtractTimeOffs(
    date: string,
    schedule: ScheduleInterval,
    timeOffs: DateInterval[],
  ): ScheduleInterval[] {
    let segments: DateInterval[] = [
      {
        startAt: toShanghaiDateTime(date, schedule.startTime),
        endAt: toShanghaiDateTime(date, schedule.endTime),
      },
    ];

    for (const timeOff of timeOffs) {
      segments = segments.flatMap((segment) =>
        this.subtractInterval(segment, timeOff),
      );
    }

    return segments.map((segment) => ({
      startTime: this.toShanghaiTimeKey(segment.startAt),
      endTime: this.toShanghaiTimeKey(segment.endAt),
    }));
  }

  private subtractInterval(
    segment: DateInterval,
    timeOff: DateInterval,
  ): DateInterval[] {
    if (timeOff.startAt >= segment.endAt || timeOff.endAt <= segment.startAt) {
      return [segment];
    }

    const nextSegments: DateInterval[] = [];
    if (timeOff.startAt > segment.startAt) {
      nextSegments.push({
        startAt: segment.startAt,
        endAt: new Date(
          Math.min(timeOff.startAt.getTime(), segment.endAt.getTime()),
        ),
      });
    }
    if (timeOff.endAt < segment.endAt) {
      nextSegments.push({
        startAt: new Date(
          Math.max(timeOff.endAt.getTime(), segment.startAt.getTime()),
        ),
        endAt: segment.endAt,
      });
    }

    return nextSegments.filter((item) => item.startAt < item.endAt);
  }

  private toShanghaiTimeKey(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
    return `${hour}:${minute}`;
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
