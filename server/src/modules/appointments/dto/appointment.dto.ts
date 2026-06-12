import { z } from 'zod';

export const createAppointmentSchema = z.object({
  serviceItemId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  customerName: z.string().min(1, '请输入预约人姓名'),
  customerPhone: z.string().min(1, '请输入手机号'),
  startAt: z.string().datetime({ offset: true }),
  remark: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;
