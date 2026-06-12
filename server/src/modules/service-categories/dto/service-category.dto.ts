import { z } from 'zod';

export const serviceCategorySchema = z.object({
  name: z.string().min(1, '请输入分类名称'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceCategoryDto = z.infer<typeof serviceCategorySchema>;
