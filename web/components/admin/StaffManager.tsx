'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { ServiceItem, Staff, StaffPayload } from '@/lib/types';

type StaffServiceFormState = {
  serviceItemId: number;
  priceYuan: string;
};

type StaffFormState = {
  id: number | null;
  name: string;
  title: string;
  phone: string;
  bio: string;
  isActive: boolean;
  serviceAssignments: StaffServiceFormState[];
};

function createEmptyStaffForm(): StaffFormState {
  return {
    id: null,
    name: '',
    title: '',
    phone: '',
    bio: '',
    isActive: true,
    serviceAssignments: [],
  };
}

function toStaffPayload(form: StaffFormState): StaffPayload {
  return {
    name: form.name.trim(),
    title: form.title.trim() || undefined,
    phone: form.phone.trim() || undefined,
    bio: form.bio.trim() || undefined,
    isActive: form.isActive,
  };
}

function toPriceYuan(priceCents: number) {
  return String(priceCents / 100);
}

function findServicePrice(service: ServiceItem, staffId: number | null) {
  if (!staffId) {
    return service.priceCents;
  }

  return (
    service.staffServices?.find((item) => item.staffId === staffId)?.priceCents ??
    service.priceCents
  );
}

function toServicePayload(form: StaffFormState) {
  return form.serviceAssignments.map((item) => ({
    serviceItemId: item.serviceItemId,
    priceCents: Math.round(Number(item.priceYuan) * 100),
  }));
}

export function StaffManager() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [form, setForm] = useState<StaffFormState>(createEmptyStaffForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive),
    [services],
  );

  async function loadData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const [serviceData, staffData] = await Promise.all([
        api.listServiceItems(),
        api.listStaff(),
      ]);
      setServices(serviceData);
      setStaffList(staffData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '员工加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('staff');
    setMessage('');
    setErrorMessage('');

    try {
      const payload = toStaffPayload(form);
      const staff = form.id
        ? await api.updateStaff(form.id, payload)
        : await api.createStaff(payload);
      await api.replaceStaffServices(staff.id, toServicePayload(form));
      await loadData();
      setForm(createEmptyStaffForm());
      setMessage('员工已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '员工保存失败');
    } finally {
      setSaving('');
    }
  }

  function editStaff(staff: Staff) {
    setForm({
      id: staff.id,
      name: staff.name,
      title: staff.title ?? '',
      phone: staff.phone ?? '',
      bio: staff.bio ?? '',
      isActive: staff.isActive,
      serviceAssignments:
        staff.staffServices?.map((item) => ({
          serviceItemId: item.serviceItemId,
          priceYuan: toPriceYuan(item.priceCents),
        })) ?? [],
    });
  }

  async function toggleStaff(staff: Staff) {
    setSaving(`staff-${staff.id}`);
    setErrorMessage('');
    try {
      await api.updateStaffStatus(staff.id, !staff.isActive);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '状态更新失败');
    } finally {
      setSaving('');
    }
  }

  function toggleStaffService(service: ServiceItem) {
    setForm((current) => {
      const exists = current.serviceAssignments.some(
        (item) => item.serviceItemId === service.id,
      );
      return {
        ...current,
        serviceAssignments: exists
          ? current.serviceAssignments.filter(
              (item) => item.serviceItemId !== service.id,
            )
          : [
              ...current.serviceAssignments,
              {
                serviceItemId: service.id,
                priceYuan: toPriceYuan(findServicePrice(service, current.id)),
              },
            ],
      };
    });
  }

  function updateStaffServicePrice(serviceId: number, priceYuan: string) {
    setForm((current) => ({
      ...current,
      serviceAssignments: current.serviceAssignments.map((item) =>
        item.serviceItemId === serviceId ? { ...item, priceYuan } : item,
      ),
    }));
  }

  function getServiceAssignment(serviceId: number) {
    return form.serviceAssignments.find(
      (item) => item.serviceItemId === serviceId,
    );
  }

  return (
    <main className="settings-page">
      <div className="shell admin-shell">
        <AdminNav />

        <header className="admin-header">
          <div>
            <p className="eyebrow">Team</p>
            <h1 className="section-title">员工管理</h1>
          </div>
          <button className="button ghost" type="button" onClick={loadData}>
            刷新
          </button>
        </header>

        {message ? <p className="feedback feedback--success">{message}</p> : null}
        {errorMessage ? (
          <p className="feedback feedback--error">{errorMessage}</p>
        ) : null}

        <section className="settings-panel panel">
          <form className="compact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>员工姓名</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Tony"
                  required
                />
              </label>
              <label className="field">
                <span>职称</span>
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="资深发型师"
                />
              </label>
            </div>

            <label className="field">
              <span>手机号</span>
              <input
                className="input"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="门店内部使用"
              />
            </label>

            <div className="service-price-grid">
              {activeServices.map((service) => (
                <div className="service-price-card" key={service.id}>
                  <label className="switch-line">
                    <input
                      checked={Boolean(getServiceAssignment(service.id))}
                      type="checkbox"
                      onChange={() => toggleStaffService(service)}
                    />
                    <span>{service.name}</span>
                  </label>
                  <input
                    className="input"
                    disabled={!getServiceAssignment(service.id)}
                    min="0"
                    step="1"
                    type="number"
                    value={getServiceAssignment(service.id)?.priceYuan ?? ''}
                    onChange={(event) =>
                      updateStaffServicePrice(service.id, event.target.value)
                    }
                    placeholder={formatPrice(service.priceCents)}
                  />
                </div>
              ))}
            </div>

            <label className="field">
              <span>简介</span>
              <textarea
                className="textarea"
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                placeholder="可选"
              />
            </label>

            <label className="switch-line">
              <input
                checked={form.isActive}
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              <span>允许客户预约</span>
            </label>

            <div className="form-actions">
              <button className="button" disabled={saving === 'staff'} type="submit">
                {form.id ? '保存员工' : '新增员工'}
              </button>
              {form.id ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setForm(createEmptyStaffForm())}
                >
                  取消编辑
                </button>
              ) : null}
            </div>
          </form>

          <div className="management-list">
            {loading ? (
              <div className="skeleton-block">正在加载员工...</div>
            ) : staffList.length > 0 ? (
              staffList.map((staff) => (
                <article className="management-row" key={staff.id}>
                  <div>
                    <strong>{staff.name}</strong>
                    <p className="muted">
                      {staff.title ?? '发型师'} ·{' '}
                      {staff.staffServices?.length ?? 0} 项服务
                    </p>
                    {staff.staffServices?.length ? (
                      <p className="muted service-price-summary">
                        {staff.staffServices
                          .slice(0, 3)
                          .map(
                            (item) =>
                              `${item.serviceItem?.name ?? '服务'} ${formatPrice(
                                item.priceCents,
                              )}`,
                          )
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => editStaff(staff)}
                    >
                      编辑
                    </button>
                    <button
                      className="button secondary"
                      disabled={saving === `staff-${staff.id}`}
                      type="button"
                      onClick={() => toggleStaff(staff)}
                    >
                      {staff.isActive ? '停用' : '启用'}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="暂无员工" description="先新增一位员工。" />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
