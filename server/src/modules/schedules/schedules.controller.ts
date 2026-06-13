import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { timeOffSchema, weeklyScheduleSchema } from './dto/schedule.dto';
import type { TimeOffDto, WeeklyScheduleDto } from './dto/schedule.dto';

@Controller()
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get('staff/:staffId/weekly-schedules')
  listWeekly(@Param('staffId') staffId: string) {
    return this.service.listWeekly(Number(staffId));
  }

  @Put('staff/:staffId/weekly-schedules')
  replaceWeekly(
    @Param('staffId') staffId: string,
    @Body(new ZodValidationPipe(weeklyScheduleSchema)) body: WeeklyScheduleDto,
  ) {
    return this.service.replaceWeekly(Number(staffId), body);
  }

  @Get('staff/:staffId/time-off')
  listTimeOff(@Param('staffId') staffId: string) {
    return this.service.listTimeOff(Number(staffId));
  }

  @Post('staff/:staffId/time-off')
  createTimeOff(
    @Param('staffId') staffId: string,
    @Body(new ZodValidationPipe(timeOffSchema)) body: TimeOffDto,
  ) {
    return this.service.createTimeOff(Number(staffId), body);
  }

  @Patch('time-off/:id')
  updateTimeOff(@Param('id') id: string, @Body() body: Partial<TimeOffDto>) {
    return this.service.updateTimeOff(Number(id), body);
  }

  @Delete('time-off/:id')
  removeTimeOff(@Param('id') id: string) {
    return this.service.removeTimeOff(Number(id));
  }
}
