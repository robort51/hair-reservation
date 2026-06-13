import { z } from 'zod';

const phoneSchema = z.string().trim().regex(/^\d{11}$/, '手机号必须为 11 位数字');

export const createAppointmentSchema = z.object({
  serviceItemId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  customerName: z.string().min(1, '请输入预约人姓名'),
  customerPhone: phoneSchema,
  startAt: z.string().datetime({ offset: true }),
  remark: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.preprocess(
    (value) => value ?? '',
    z
      .string()
      .trim()
      .min(1, '请输入取消原因')
      .max(200, '取消原因不能超过 200 字'),
  ),
});

export const listAppointmentQuerySchema = z.object({
  customerPhone: phoneSchema.optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;
export type ListAppointmentQueryDto = z.infer<typeof listAppointmentQuerySchema>;
