import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<{ data: unknown; error: null }> {
    return next.handle().pipe(
      map((data: unknown) => ({
        data,
        error: null,
      })),
    );
  }
}
