import type { AppointmentStatus } from './types';

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

export function formatPrice(priceCents: number) {
  return `¥${(priceCents / 100).toFixed(0)}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

export function toShanghaiDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

export function createDateOptions(days = 7) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const value = toShanghaiDateKey(date);
    return {
      value,
      label: index === 0 ? '今天' : formatter.format(date),
    };
  });
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export function getStatusLabel(status: AppointmentStatus) {
  const labels: Record<AppointmentStatus, string> = {
    PENDING: '待到店',
    COMPLETED: '已完成',
    CANCELED: '已取消',
    EXPIRED: '已过期',
  };
  return labels[status];
}

export function getStatusClass(status: AppointmentStatus) {
  const classes: Record<AppointmentStatus, string> = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELED: 'canceled',
    EXPIRED: 'canceled',
  };
  return classes[status];
}
