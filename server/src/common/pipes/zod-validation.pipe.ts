import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { AppErrorCode } from '../errors/app-error-code';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: AppErrorCode.VALIDATION_ERROR,
        message: result.error.issues.map((issue) => issue.message).join('；'),
      });
    }
    return result.data;
  }
}
