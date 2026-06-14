'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TodayWorkingStaffResponse } from '@/lib/types';

function formatSchedule(
  schedules: TodayWorkingStaffResponse['staff'][number]['schedules'],
) {
  return schedules
    .map((schedule) => `${schedule.startTime}-${schedule.endTime}`)
    .join(' / ');
}

export function HomeWorkingStaff() {
  const [data, setData] = useState<TodayWorkingStaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let disposed = false;

    async function loadWorkingStaff() {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await api.getTodayWorkingStaff();
        if (!disposed) {
          setData(result);
        }
      } catch (error) {
        if (!disposed) {
          setErrorMessage(
            error instanceof Error ? error.message : '今日排班加载失败',
          );
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    loadWorkingStaff();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="salon-visual__ticket">
      <span>今日在班</span>
      {loading ? <strong>加载中</strong> : null}
      {!loading && errorMessage ? <strong>暂不可查</strong> : null}
      {!loading && !errorMessage && data?.staff.length === 0 ? (
        <strong>暂无员工</strong>
      ) : null}
      {!loading && !errorMessage && data?.staff.length ? (
        <div className="working-staff-list">
          {data.staff.map((staff) => (
            <div className="working-staff-item" key={staff.staffId}>
              <strong>{staff.staffName}</strong>
              <small>{formatSchedule(staff.schedules)}</small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
