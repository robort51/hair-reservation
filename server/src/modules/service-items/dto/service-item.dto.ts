import { z } from 'zod';

export const serviceItemSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, '请输入服务名称'),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().min(0),
  originalPriceCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceItemDto = z.infer<typeof serviceItemSchema>;
