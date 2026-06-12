import {
  addMinutes,
  generateSlots,
  hasOverlap,
  isInsideWindow,
} from '../src/common/time/time.util';
import { describe, expect, it } from "bun:test";

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