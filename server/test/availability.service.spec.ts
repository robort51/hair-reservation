import {
  addMinutes,
  generateSlots,
  hasOverlap,
  isInsideWindow,
} from '../src/common/time/time.util';

describe('time.util', () => {
  it('根据服务时长和 30 分钟粒度生成可预约时间', () => {
    const slots = generateSlots({
      date: '2026-06-12',
      windowStart: '09:00',
      windowEnd: '11:00',
      durationMinutes: 60,
      stepMinutes: 30,
    });

    expect(slots).toEqual([
      {
        startAt: new Date('2026-06-12T09:00:00+08:00'),
        endAt: new Date('2026-06-12T10:00:00+08:00'),
      },
      {
        startAt: new Date('2026-06-12T09:30:00+08:00'),
        endAt: new Date('2026-06-12T10:30:00+08:00'),
      },
      {
        startAt: new Date('2026-06-12T10:00:00+08:00'),
        endAt: new Date('2026-06-12T11:00:00+08:00'),
      },
    ]);
  });

  it('过滤早于当前时间的可预约时间', () => {
    const slots = generateSlots({
      date: '2026-06-12',
      windowStart: '09:00',
      windowEnd: '17:00',
      durationMinutes: 60,
      stepMinutes: 30,
      minStartAt: new Date('2026-06-12T15:00:00+08:00'),
    });

    expect(slots.map((slot) => slot.startAt)).toEqual([
      new Date('2026-06-12T15:00:00+08:00'),
      new Date('2026-06-12T15:30:00+08:00'),
      new Date('2026-06-12T16:00:00+08:00'),
    ]);
  });

  it('支持同一天多个营业时间段并保留中间空档', () => {
    const morningSlots = generateSlots({
      date: '2026-06-12',
      windowStart: '09:00',
      windowEnd: '11:00',
      durationMinutes: 60,
      stepMinutes: 30,
    });
    const afternoonSlots = generateSlots({
      date: '2026-06-12',
      windowStart: '13:00',
      windowEnd: '19:00',
      durationMinutes: 60,
      stepMinutes: 30,
    });
    const slots = [...morningSlots, ...afternoonSlots];

    expect(slots.map((slot) => slot.startAt)).toContainEqual(
      new Date('2026-06-12T10:00:00+08:00'),
    );
    expect(slots.map((slot) => slot.startAt)).not.toContainEqual(
      new Date('2026-06-12T11:00:00+08:00'),
    );
    expect(slots.map((slot) => slot.startAt)).not.toContainEqual(
      new Date('2026-06-12T12:00:00+08:00'),
    );
    expect(slots.map((slot) => slot.startAt)).toContainEqual(
      new Date('2026-06-12T13:00:00+08:00'),
    );
  });

  it('支持默认营业时间延长到晚上 22 点', () => {
    const slots = generateSlots({
      date: '2026-06-12',
      windowStart: '09:00',
      windowEnd: '22:00',
      durationMinutes: 60,
      stepMinutes: 30,
    });

    expect(slots.map((slot) => slot.startAt)).toContainEqual(
      new Date('2026-06-12T21:00:00+08:00'),
    );
    expect(slots.map((slot) => slot.startAt)).not.toContainEqual(
      new Date('2026-06-12T21:30:00+08:00'),
    );
  });

  it('识别重叠时间段', () => {
    expect(
      hasOverlap(
        new Date('2026-06-12T09:30:00+08:00'),
        new Date('2026-06-12T10:30:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T11:00:00+08:00'),
      ),
    ).toBe(true);

    expect(
      hasOverlap(
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T11:00:00+08:00'),
      ),
    ).toBe(false);
  });

  it('判断时间段是否完整落在工作窗口内', () => {
    expect(
      isInsideWindow(
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T10:00:00+08:00'),
        new Date('2026-06-12T09:00:00+08:00'),
        new Date('2026-06-12T18:00:00+08:00'),
      ),
    ).toBe(true);
  });

  it('按分钟增加时间', () => {
    expect(addMinutes(new Date('2026-06-12T09:00:00+08:00'), 90)).toEqual(
      new Date('2026-06-12T10:30:00+08:00'),
    );
  });
});
