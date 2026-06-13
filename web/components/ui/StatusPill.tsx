import { getStatusClass, getStatusLabel } from '@/lib/format';
import type { AppointmentStatus } from '@/lib/types';

type StatusPillProps = {
  status: AppointmentStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

