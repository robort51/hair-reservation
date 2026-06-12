import { z } from 'zod';

export const staffSchema = z.object({
  name: z.string().min(1, '请输入员工姓名'),
  title: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const staffServicesSchema = z.object({
  serviceItemIds: z.array(z.number().int().positive()),
});

export type StaffDto = z.infer<typeof staffSchema>;
export type StaffServicesDto = z.infer<typeof staffServicesSchema>;
