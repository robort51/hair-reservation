'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  formatDateTime,
  formatDuration,
  formatPrice,
  toShanghaiDateKey,
} from '@/lib/format';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';

type AdminAppointmentsProps = {
  mode: 'today' | 'all';
};

type CancelDialogState = {
  appointment: Appointment;
  reason: string;
  error: string;
};

const statusOptions: Array<{ value: AppointmentStatus | 'ALL'; label: string }> =
  [
    { value: 'ALL', label: '全部' },
    { value: 'PENDING', label: '待到店' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'CANCELED', label: '已取消' },
  ];

export function AdminAppointments({ mode }: AdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>(
    'ALL',
  );
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState | null>(
    null,
  );

  const todayKey = useMemo(() => toShanghaiDateKey(new Date()), []);

  async function loadAppointments() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.listAppointments();
      setAppointments(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '预约列表加载失败',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const scopedAppointments = useMemo(() => {
    if (mode === 'all') {
      return appointments;
    }

    return appointments.filter(
      (item) => toShanghaiDateKey(new Date(item.startAt)) === todayKey,
    );
  }, [appointments, mode, todayKey]);

  const visibleAppointments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return scopedAppointments.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;
      const matchesKeyword =
        !keyword ||
        item.customerNameSnapshot.toLowerCase().includes(keyword) ||
        item.customerPhoneSnapshot.toLowerCase().includes(keyword) ||
        item.serviceNameSnapshot.toLowerCase().includes(keyword) ||
        item.staffNameSnapshot.toLowerCase().includes(keyword);

      return matchesStatus && matchesKeyword;
    });
  }, [query, scopedAppointments, statusFilter]);

  const metrics = useMemo(() => {
    const pending = scopedAppointments.filter(
      (item) => item.status === 'PENDING',
    );
    const completed = scopedAppointments.filter(
      (item) => item.status === 'COMPLETED',
    );
    const revenue = completed.reduce(
      (sum, item) => sum + item.servicePriceCentsSnapshot,
      0,
    );

    return {
      total: scopedAppointments.length,
      pending: pending.length,
      completed: completed.length,
      revenue,
    };
  }, [scopedAppointments]);

  async function handleComplete(id: number) {
    setWorkingId(id);
    setErrorMessage('');
    try {
      await api.completeAppointment(id);
      await loadAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '操作失败');
    } finally {
      setWorkingId(null);
    }
  }

  function handleCancel(appointment: Appointment) {
    setCancelDialog({
      appointment,
      reason: appointment.cancelReason ?? '',
      error: '',
    });
  }

  async function submitCancel() {
    if (!cancelDialog) {
      return;
    }

    const reason = cancelDialog.reason.trim();
    if (!reason) {
      setCancelDialog((current) =>
        current ? { ...current, error: '请输入取消原因' } : current,
      );
      return;
    }

    const id = cancelDialog.appointment.id;
    setWorkingId(id);
    setErrorMessage('');
    try {
      await api.cancelAppointment(id, reason);
      setCancelDialog(null);
      await loadAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      setCancelDialog((current) =>
        current ? { ...current, error: message } : current,
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <>
      <main className="admin-page">
        <div className="shell admin-shell">
          <AdminNav />

          <header className="admin-header">
            <div>
              <p className="eyebrow">门店后台</p>
              <h1 className="section-title">
                {mode === 'today' ? '今日预约看板' : '全部预约记录'}
              </h1>
            </div>
            <button className="button ghost" type="button" onClick={loadAppointments}>
              刷新
            </button>
          </header>

          <section className="metric-grid">
            <div className="metric-card">
              <span>预约总数</span>
              <strong>{metrics.total}</strong>
            </div>
            <div className="metric-card">
              <span>待到店</span>
              <strong>{metrics.pending}</strong>
            </div>
            <div className="metric-card">
              <span>已完成</span>
              <strong>{metrics.completed}</strong>
            </div>
            <div className="metric-card">
              <span>已确认收入</span>
              <strong>{formatPrice(metrics.revenue)}</strong>
            </div>
          </section>

          <section className="appointment-panel panel">
            <div className="appointment-toolbar">
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索客户、手机号、服务或员工"
              />
              <div className="status-filter">
                {statusOptions.map((option) => (
                  <button
                    className={option.value === statusFilter ? 'is-selected' : ''}
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage ? (
              <p className="feedback feedback--error">{errorMessage}</p>
            ) : null}

            {loading ? (
              <div className="skeleton-block">正在加载预约...</div>
            ) : visibleAppointments.length > 0 ? (
              <div className="appointment-list">
                {visibleAppointments.map((appointment) => (
                  <article className="appointment-row" key={appointment.id}>
                    <div className="appointment-row__time">
                      <strong>{formatDateTime(appointment.startAt)}</strong>
                      <span>{formatDuration(appointment.serviceDurationMinutesSnapshot)}</span>
                    </div>

                    <div className="appointment-row__main">
                      <div className="appointment-title">
                        <h3>{appointment.serviceNameSnapshot}</h3>
                        <StatusPill status={appointment.status} />
                      </div>
                      <p>
                        {appointment.customerNameSnapshot} ·{' '}
                        {appointment.customerPhoneSnapshot}
                      </p>
                      <p className="muted">
                        {appointment.staffNameSnapshot} ·{' '}
                        {formatPrice(appointment.servicePriceCentsSnapshot)}
                      </p>
                      {appointment.remark ? (
                        <p className="appointment-note">{appointment.remark}</p>
                      ) : null}
                      {appointment.cancelReason ? (
                        <p className="appointment-note">
                          取消原因：{appointment.cancelReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="row-actions">
                      <button
                        className="button ghost"
                        disabled={
                          appointment.status !== 'PENDING' ||
                          workingId === appointment.id
                        }
                        type="button"
                        onClick={() => handleComplete(appointment.id)}
                      >
                        完成
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          appointment.status !== 'PENDING' ||
                          workingId === appointment.id
                        }
                        type="button"
                        onClick={() => handleCancel(appointment)}
                      >
                        取消
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无匹配预约"
                description={
                  mode === 'today'
                    ? '今天还没有预约，或当前筛选条件没有匹配记录。'
                    : '当前筛选条件下没有预约记录。'
                }
              />
            )}
          </section>
        </div>
      </main>

      {cancelDialog ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="cancel-dialog-title"
            aria-modal="true"
            className="cancel-dialog"
            role="dialog"
          >
            <div className="cancel-dialog__header">
              <p className="eyebrow">取消预约</p>
              <h2 id="cancel-dialog-title">
                {cancelDialog.appointment.customerNameSnapshot} ·{' '}
                {cancelDialog.appointment.serviceNameSnapshot}
              </h2>
              <p>
                {formatDateTime(cancelDialog.appointment.startAt)}，
                {cancelDialog.appointment.staffNameSnapshot}
              </p>
            </div>

            <label className="field">
              <span>取消原因</span>
              <textarea
                autoFocus
                className="textarea"
                maxLength={200}
                value={cancelDialog.reason}
                onChange={(event) =>
                  setCancelDialog((current) =>
                    current
                      ? { ...current, reason: event.target.value, error: '' }
                      : current,
                  )
                }
                placeholder="例如：员工临时请假、客户改期、门店设备维护"
              />
            </label>

            {cancelDialog.error ? (
              <p className="feedback feedback--error">{cancelDialog.error}</p>
            ) : null}

            <div className="dialog-actions">
              <button
                className="button ghost"
                disabled={workingId === cancelDialog.appointment.id}
                type="button"
                onClick={() => setCancelDialog(null)}
              >
                返回
              </button>
              <button
                className="button secondary"
                disabled={workingId === cancelDialog.appointment.id}
                type="button"
                onClick={submitCancel}
              >
                {workingId === cancelDialog.appointment.id ? '取消中...' : '确认取消'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
