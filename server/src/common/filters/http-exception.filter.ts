import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AppErrorCode } from '../errors/app-error-code';

type ErrorResponse = {
  code?: string;
  message?: string | string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as ErrorResponse | string;
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray(body.message)
            ? body.message.join('；')
            : body.message || exception.message;

      response.status(status).json({
        data: null,
        error: {
          code:
            typeof body === 'object' && body.code
              ? body.code
              : AppErrorCode.VALIDATION_ERROR,
          message,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      },
    });
  }
}