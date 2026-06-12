import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ServiceCategoryDto, serviceCategorySchema } from './dto/service-category.dto';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(serviceCategorySchema)) body: ServiceCategoryDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<ServiceCategoryDto>) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
