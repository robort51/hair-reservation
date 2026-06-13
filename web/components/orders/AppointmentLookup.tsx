'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime, formatPrice } from '@/lib/format';
import { customerPhonePattern, normalizePhoneInput } from '@/lib/phone';
import type { Appointment } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';

export function AppointmentLookup() {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<Appointment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customerPhone = phone.trim();
    if (!customerPhonePattern.test(customerPhone)) {
      setErrorMessage('请输入 11 位数字手机号');
      setResults(null);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.listAppointmentsByPhone(customerPhone);
      setResults(data);
    } catch (error) {
      setResults(null);
      setErrorMessage(
        error instanceof Error ? error.message : '预约查询失败，请稍后再试',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="orders-page">
      <div className="shell">
        <nav className="topbar">
          <a className="brand-mark" href="/">
            YJMF
          </a>
          <div className="nav-links">
            <a href="/">首页</a>
            <a href="/book">预约</a>
            <a href="/orders">查预约</a>
          </div>
        </nav>

        <header className="booking-header orders-header">
          <p className="eyebrow">预约查询</p>
          <h1 className="page-title">查询我的预约</h1>
          <p className="booking-header__text">
            输入预约时填写的手机号，查看到店时间、订单状态和门店取消原因。
          </p>
        </header>

        <section className="lookup-panel lookup-panel--page">
          <div className="lookup-panel__intro">
            <p className="eyebrow">Order status</p>
            <h2>手机号查单</h2>
            <p>订单状态会与门店后台同步，取消预约时的原因会在这里显示。</p>
          </div>
          <form className="lookup-form" onSubmit={handleLookup}>
            <input
              className="input"
              inputMode="numeric"
              maxLength={11}
              pattern="\d{11}"
              value={phone}
              onChange={(event) =>
                setPhone(normalizePhoneInput(event.target.value))
              }
              placeholder="请输入 11 位手机号"
            />
            <button className="button secondary" disabled={loading} type="submit">
              {loading ? '查询中...' : '查询订单'}
            </button>
          </form>

          {errorMessage ? (
            <p className="feedback feedback--error">{errorMessage}</p>
          ) : null}

          {results ? (
            results.length > 0 ? (
              <div className="lookup-results">
                {results.map((appointment) => (
                  <article className="lookup-row" key={appointment.id}>
                    <div>
                      <strong>{appointment.serviceNameSnapshot}</strong>
                      <span>{formatDateTime(appointment.startAt)}</span>
                    </div>
                    <div>
                      <span>{appointment.staffNameSnapshot}</span>
                      <span>{formatPrice(appointment.servicePriceCentsSnapshot)}</span>
                    </div>
                    <StatusPill status={appointment.status} />
                    {appointment.cancelReason ? (
                      <p>取消原因：{appointment.cancelReason}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="未查到预约"
                description="请确认手机号是否与预约时填写的一致。"
              />
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
