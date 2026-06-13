import { z } from 'zod';

export const adminLoginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
