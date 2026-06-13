import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AppErrorCode } from '../../common/errors/app-error-code';
import { verifyAdminToken } from './admin-token';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';

    if (token && verifyAdminToken(token)) {
      return true;
    }

    throw new UnauthorizedException({
      code: AppErrorCode.ADMIN_UNAUTHORIZED,
      message: '请先登录后台',
    });
  }
}
