'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatDuration, formatPrice } from '@/lib/format';
import type {
  ServiceCategory,
  ServiceItem,
  ServiceItemPayload,
} from '@/lib/types';

type ServiceFormState = {
  id: number | null;
  categoryId: number;
  name: string;
  description: string;
  durationMinutes: string;
  priceYuan: string;
  sortOrder: string;
  isActive: boolean;
};

function createEmptyServiceForm(categoryId = 1): ServiceFormState {
  return {
    id: null,
    categoryId,
    name: '',
    description: '',
    durationMinutes: '60',
    priceYuan: '68',
    sortOrder: '0',
    isActive: true,
  };
}

function toServicePayload(form: ServiceFormState): ServiceItemPayload {
  return {
    categoryId: Number(form.categoryId),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    durationMinutes: Number(form.durationMinutes),
    priceCents: Math.round(Number(form.priceYuan) * 100),
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive,
  };
}

export function ServicesManager() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [form, setForm] = useState<ServiceFormState>(createEmptyServiceForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const [categoryData, serviceData] = await Promise.all([
        api.listServiceCategories(),
        api.listServiceItems(),
      ]);
      setCategories(categoryData);
      setServices(serviceData);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categoryData[0]?.id || 1,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '服务加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('service');
    setMessage('');
    setErrorMessage('');

    try {
      const payload = toServicePayload(form);
      if (form.id) {
        await api.updateServiceItem(form.id, payload);
      } else {
        await api.createServiceItem(payload);
      }
      await loadData();
      setForm(createEmptyServiceForm(categories[0]?.id ?? 1));
      setMessage('服务已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '服务保存失败');
    } finally {
      setSaving('');
    }
  }

  function editService(service: ServiceItem) {
    setForm({
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description ?? '',
      durationMinutes: String(service.durationMinutes),
      priceYuan: String(service.priceCents / 100),
      sortOrder: String(service.sortOrder),
      isActive: service.isActive,
    });
  }

  async function toggleService(service: ServiceItem) {
    setSaving(`service-${service.id}`);
    setErrorMessage('');
    try {
      await api.updateServiceItemStatus(service.id, !service.isActive);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '状态更新失败');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="settings-page">
      <div className="shell admin-shell">
        <AdminNav />

        <header className="admin-header">
          <div>
            <p className="eyebrow">Services</p>
            <h1 className="section-title">服务管理</h1>
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
            <label className="field">
              <span>服务名称</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="洗剪吹"
                required
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>分类</span>
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: Number(event.target.value),
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>排序</span>
                <input
                  className="input"
                  min="0"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>服务时长（分钟）</span>
                <input
                  className="input"
                  min="1"
                  type="number"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>价格（元）</span>
                <input
                  className="input"
                  min="0"
                  step="1"
                  type="number"
                  value={form.priceYuan}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priceYuan: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>描述</span>
              <textarea
                className="textarea"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
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
              <span>对客户开放预约</span>
            </label>

            <div className="form-actions">
              <button className="button" disabled={saving === 'service'} type="submit">
                {form.id ? '保存服务' : '新增服务'}
              </button>
              {form.id ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    setForm(createEmptyServiceForm(categories[0]?.id ?? 1))
                  }
                >
                  取消编辑
                </button>
              ) : null}
            </div>
          </form>

          <div className="management-list">
            {loading ? (
              <div className="skeleton-block">正在加载服务...</div>
            ) : services.length > 0 ? (
              services.map((service) => (
                <article className="management-row" key={service.id}>
                  <div>
                    <strong>{service.name}</strong>
                    <p className="muted">
                      {service.category?.name ?? '未分类'} ·{' '}
                      {formatDuration(service.durationMinutes)} ·{' '}
                      {formatPrice(service.priceCents)}
                    </p>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => editService(service)}
                    >
                      编辑
                    </button>
                    <button
                      className="button secondary"
                      disabled={saving === `service-${service.id}`}
                      type="button"
                      onClick={() => toggleService(service)}
                    >
                      {service.isActive ? '停用' : '启用'}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="暂无服务" description="先新增一个服务项目。" />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
