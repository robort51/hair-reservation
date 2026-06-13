import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { serviceCategorySchema } from './dto/service-category.dto';
import type { ServiceCategoryDto } from './dto/service-category.dto';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  create(
    @Body(new ZodValidationPipe(serviceCategorySchema))
    body: ServiceCategoryDto,
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id') id: string, @Body() body: Partial<ServiceCategoryDto>) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
