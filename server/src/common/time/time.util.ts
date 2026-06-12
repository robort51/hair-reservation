type GenerateSlotsInput = {
  date: string;
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  stepMinutes: number;
};

export type TimeSlot = {
  startAt: Date;
  endAt: Date;
};

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function hasOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}

export function isInsideWindow(
  startAt: Date,
  endAt: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return startAt >= windowStart && endAt <= windowEnd;
}

export function toShanghaiDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

export function generateSlots(input: GenerateSlotsInput): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const windowStart = toShanghaiDateTime(input.date, input.windowStart);
  const windowEnd = toShanghaiDateTime(input.date, input.windowEnd);

  for (
    let startAt = windowStart;
    addMinutes(startAt, input.durationMinutes) <= windowEnd;
    startAt = addMinutes(startAt, input.stepMinutes)
  ) {
    slots.push({
      startAt,
      endAt: addMinutes(startAt, input.durationMinutes),
    });
  }

  return slots;
}