import { weeklyScheduleSchema } from '../src/modules/schedules/dto/schedule.dto';

describe('weeklyScheduleSchema', () => {
  it('接受 HH:mm 格式的排班时间', () => {
    const result = weeklyScheduleSchema.safeParse({
      schedules: [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '18:00',
          isWorking: false,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('接受同一天多个排班时间段', () => {
    const result = weeklyScheduleSchema.safeParse({
      schedules: [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '11:00',
          isWorking: true,
        },
        {
          dayOfWeek: 1,
          startTime: '13:00',
          endTime: '19:00',
          isWorking: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
