import { z } from 'zod';

export const weeklyScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      startTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      endTime: z.string().regex(/^\\d{2}:\\d{2}$/),
      isWorking: z.boolean(),
    }),
  ),
});

export const timeOffSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().optional(),
});

export type WeeklyScheduleDto = z.infer<typeof weeklyScheduleSchema>;
export type TimeOffDto = z.infer<typeof timeOffSchema>;
