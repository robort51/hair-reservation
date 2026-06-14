import { z } from 'zod';

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, '日期无效');

export const weeklyScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      isWorking: z.boolean(),
    }),
  ),
});

export const timeOffSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().optional(),
});

export const todayWorkingStaffQuerySchema = z.object({
  date: dateKeySchema.optional(),
});

export type WeeklyScheduleDto = z.infer<typeof weeklyScheduleSchema>;
export type TimeOffDto = z.infer<typeof timeOffSchema>;
export type TodayWorkingStaffQueryDto = z.infer<
  typeof todayWorkingStaffQuerySchema
>;
