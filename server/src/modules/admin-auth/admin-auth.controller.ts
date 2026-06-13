import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { createAdminToken } from './admin-token';
import { adminLoginSchema } from './dto/admin-auth.dto';
import type { AdminLoginDto } from './dto/admin-auth.dto';
import { getAdminPassword, getAdminUsername } from './admin-config';

@Controller('admin-auth')
export class AdminAuthController {
  @Post('login')
  login(
    @Body(new ZodValidationPipe(adminLoginSchema))
    body: AdminLoginDto,
  ) {
    if (
      body.username !== getAdminUsername() ||
      body.password !== getAdminPassword()
    ) {
      throw new UnauthorizedException({
        code: AppErrorCode.ADMIN_UNAUTHORIZED,
        message: '用户名或密码错误',
      });
    }

    return {
      token: createAdminToken(body.username),
      username: body.username,
    };
  }
}
