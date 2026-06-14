'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import type { Staff, WeeklySchedule, WeeklySchedulePayload } from '@/lib/types';

type ScheduleSegment = {
  localId: string;
  startTime: string;
  endTime: string;
};

type ScheduleDay = {
  dayOfWeek: number;
  isWorking: boolean;
  segments: ScheduleSegment[];
};

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const defaultSegment = { startTime: '09:00', endTime: '22:00' };

function createSegment(
  dayOfWeek: number,
  index: number,
  startTime = defaultSegment.startTime,
  endTime = defaultSegment.endTime,
): ScheduleSegment {
  return {
    localId: `${dayOfWeek}-${index}-${startTime}-${endTime}`,
    startTime,
    endTime,
  };
}

function createDefaultDays(): ScheduleDay[] {
  return dayNames.map((_, index) => ({
    dayOfWeek: index + 1,
    isWorking: true,
    segments: [createSegment(index + 1, 0)],
  }));
}

function normalizeTime(value: string, fallback: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function buildDaysFromSchedules(schedules: WeeklySchedule[]): ScheduleDay[] {
  const defaults = createDefaultDays();

  return defaults.map((day) => {
    const rows = schedules.filter((item) => item.dayOfWeek === day.dayOfWeek);
    if (rows.length === 0) {
      return day;
    }

    const workingRows = rows.filter((item) => item.isWorking);
    if (workingRows.length === 0) {
      const first = rows[0];
      return {
        ...day,
        isWorking: false,
        segments: [
          createSegment(
            day.dayOfWeek,
            0,
            normalizeTime(first?.startTime ?? '', defaultSegment.startTime),
            normalizeTime(first?.endTime ?? '', defaultSegment.endTime),
          ),
        ],
      };
    }

    return {
      ...day,
      isWorking: true,
      segments: workingRows.map((item, index) =>
        createSegment(
          day.dayOfWeek,
          index,
          normalizeTime(item.startTime, defaultSegment.startTime),
          normalizeTime(item.endTime, defaultSegment.endTime),
        ),
      ),
    };
  });
}

export function SchedulesManager() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [days, setDays] = useState<ScheduleDay[]>(createDefaultDays());
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedStaff = useMemo(
    () => staffList.find((staff) => staff.id === selectedStaffId) ?? null,
    [selectedStaffId, staffList],
  );

  async function loadStaff() {
    setLoading(true);
    setErrorMessage('');
    try {
      const staffData = await api.listStaff();
      setStaffList(staffData);
      setSelectedStaffId((current) => current ?? staffData[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '员工加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (!selectedStaffId) {
      setDays(createDefaultDays());
      return;
    }

    let disposed = false;
    const staffId = selectedStaffId;

    async function loadSchedules() {
      setScheduleLoading(true);
      setErrorMessage('');
      try {
        const data = await api.listWeeklySchedules(staffId);
        if (!disposed) {
          setDays(data.length > 0 ? buildDaysFromSchedules(data) : createDefaultDays());
        }
      } catch (error) {
        if (!disposed) {
          setErrorMessage(
            error instanceof Error ? error.message : '排班加载失败',
          );
        }
      } finally {
        if (!disposed) {
          setScheduleLoading(false);
        }
      }
    }

    loadSchedules();

    return () => {
      disposed = true;
    };
  }, [selectedStaffId]);

  function toggleDay(dayOfWeek: number, isWorking: boolean) {
    setDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, isWorking } : day,
      ),
    );
  }

  function addSegment(dayOfWeek: number) {
    setDays((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        const nextIndex = day.segments.length;
        const nextSegment =
          nextIndex === 1
            ? createSegment(dayOfWeek, nextIndex, '13:00', '19:00')
            : createSegment(dayOfWeek, nextIndex);

        return {
          ...day,
          isWorking: true,
          segments: [...day.segments, nextSegment],
        };
      }),
    );
  }

  function removeSegment(dayOfWeek: number, localId: string) {
    setDays((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek || day.segments.length <= 1) {
          return day;
        }

        return {
          ...day,
          segments: day.segments.filter((segment) => segment.localId !== localId),
        };
      }),
    );
  }

  function updateSegment(
    dayOfWeek: number,
    localId: string,
    patch: Partial<Pick<ScheduleSegment, 'startTime' | 'endTime'>>,
  ) {
    setDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              segments: day.segments.map((segment) =>
                segment.localId === localId ? { ...segment, ...patch } : segment,
              ),
            }
          : day,
      ),
    );
  }

  async function handleSaveSchedules() {
    if (!selectedStaffId) {
      setErrorMessage('请先选择员工');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      type SchedulePayloadItem = WeeklySchedulePayload['schedules'][number];
      const schedules = days.flatMap<SchedulePayloadItem>((day): SchedulePayloadItem[] => {
        if (!day.isWorking) {
          const first = day.segments[0];
          return [
            {
              dayOfWeek: day.dayOfWeek,
              startTime: normalizeTime(first?.startTime ?? '', defaultSegment.startTime),
              endTime: normalizeTime(first?.endTime ?? '', defaultSegment.endTime),
              isWorking: false,
            },
          ];
        }

        const segments =
          day.segments.length > 0 ? day.segments : [createSegment(day.dayOfWeek, 0)];
        return segments.map((segment) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: normalizeTime(segment.startTime, defaultSegment.startTime),
          endTime: normalizeTime(segment.endTime, defaultSegment.endTime),
          isWorking: true,
        }));
      });

      const updatedSchedules = await api.replaceWeeklySchedules(selectedStaffId, {
        schedules,
      });
      setDays(buildDaysFromSchedules(updatedSchedules));
      setMessage('排班已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '排班保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="settings-page">
      <div className="shell admin-shell">
        <AdminNav />

        <header className="admin-header">
          <div>
            <p className="eyebrow">Roster</p>
            <h1 className="section-title">排班管理</h1>
          </div>
          <button className="button ghost" type="button" onClick={loadStaff}>
            刷新
          </button>
        </header>

        {message ? <p className="feedback feedback--success">{message}</p> : null}
        {errorMessage ? (
          <p className="feedback feedback--error">{errorMessage}</p>
        ) : null}

        <section className="settings-panel panel">
          <div className="schedule-toolbar">
            <label className="field">
              <span>员工</span>
              <select
                className="input"
                value={selectedStaffId ?? ''}
                onChange={(event) => setSelectedStaffId(Number(event.target.value))}
              >
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button"
              disabled={!selectedStaffId || saving}
              type="button"
              onClick={handleSaveSchedules}
            >
              保存排班
            </button>
          </div>

          {loading || scheduleLoading ? (
            <div className="skeleton-block">正在加载排班...</div>
          ) : selectedStaff ? (
            <div className="multi-schedule-list">
              {days.map((day) => (
                <article className="multi-schedule-day" key={day.dayOfWeek}>
                  <div className="multi-schedule-day__header">
                    <label className="switch-line">
                      <input
                        checked={day.isWorking}
                        type="checkbox"
                        onChange={(event) =>
                          toggleDay(day.dayOfWeek, event.target.checked)
                        }
                      />
                      <strong>{dayNames[day.dayOfWeek - 1]}</strong>
                    </label>
                    <button
                      className="button ghost"
                      disabled={!day.isWorking}
                      type="button"
                      onClick={() => addSegment(day.dayOfWeek)}
                    >
                      添加时间段
                    </button>
                  </div>

                  {day.isWorking ? (
                    <div className="schedule-segment-list">
                      {day.segments.map((segment) => (
                        <div className="schedule-segment-row" key={segment.localId}>
                          <input
                            className="input"
                            type="time"
                            value={segment.startTime}
                            onInput={(event) =>
                              updateSegment(day.dayOfWeek, segment.localId, {
                                startTime: event.currentTarget.value,
                              })
                            }
                            onChange={(event) =>
                              updateSegment(day.dayOfWeek, segment.localId, {
                                startTime: event.target.value,
                              })
                            }
                          />
                          <span>至</span>
                          <input
                            className="input"
                            type="time"
                            value={segment.endTime}
                            onInput={(event) =>
                              updateSegment(day.dayOfWeek, segment.localId, {
                                endTime: event.currentTarget.value,
                              })
                            }
                            onChange={(event) =>
                              updateSegment(day.dayOfWeek, segment.localId, {
                                endTime: event.target.value,
                              })
                            }
                          />
                          <button
                            className="button secondary"
                            disabled={day.segments.length <= 1}
                            type="button"
                            onClick={() =>
                              removeSegment(day.dayOfWeek, segment.localId)
                            }
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted schedule-rest-note">
                      当天休息，不会生成可预约时段。
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无员工" description="新增员工后即可配置排班。" />
          )}
        </section>
      </div>
    </main>
  );
}
