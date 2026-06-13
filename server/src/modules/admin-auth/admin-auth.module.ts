import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminAuthModule {}
