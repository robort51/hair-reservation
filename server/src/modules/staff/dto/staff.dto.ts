import { z } from 'zod';

export const staffSchema = z.object({
  name: z.string().min(1, '请输入员工姓名'),
  title: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const staffServiceAssignmentSchema = z.object({
  serviceItemId: z.number().int().positive(),
  priceCents: z.number().int().min(0, '服务价格不能小于 0'),
});

export const staffServicesSchema = z.object({
  serviceItemIds: z.array(z.number().int().positive()).optional(),
  services: z.array(staffServiceAssignmentSchema).optional(),
}).refine(
  (value) => Boolean(value.serviceItemIds?.length || value.services?.length),
  '请至少选择一个服务项目',
);

export type StaffDto = z.infer<typeof staffSchema>;
export type StaffServicesDto = z.infer<typeof staffServicesSchema>;
