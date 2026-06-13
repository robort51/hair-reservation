'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  createDateOptions,
  formatDuration,
  formatPrice,
  formatTime,
} from '@/lib/format';
import { customerPhonePattern, normalizePhoneInput } from '@/lib/phone';
import type {
  Appointment,
  AvailabilityResponse,
  ServiceItem,
  Staff,
} from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';

type BookingStep = 1 | 2 | 3 | 4;

type SlotChoice = {
  key: string;
  staffId: number;
  staffName: string;
  priceCents: number;
  startAt: string;
  endAt: string;
};

const bookingSteps = [
  { number: 1, label: '员工' },
  { number: 2, label: '服务' },
  { number: 3, label: '日期时段' },
  { number: 4, label: '信息' },
];

function getStaffServicePrice(
  staffList: Staff[],
  serviceItemId: number,
  staffId: number,
  fallbackPriceCents: number,
) {
  const staff = staffList.find((item) => item.id === staffId);
  return (
    staff?.staffServices?.find((item) => item.serviceItemId === serviceItemId)
      ?.priceCents ?? fallbackPriceCents
  );
}

function staffSupportsService(staff: Staff, serviceItemId: number) {
  return staff.staffServices?.some((item) => item.serviceItemId === serviceItemId);
}

function getStaffServiceOptions(staff: Staff | null, services: ServiceItem[]) {
  if (!staff) {
    return [];
  }

  return services
    .filter((service) => service.isActive && staffSupportsService(staff, service.id))
    .map((service) => ({
      service,
      priceCents:
        staff.staffServices?.find((item) => item.serviceItemId === service.id)
          ?.priceCents ?? service.priceCents,
    }));
}

function buildSlotChoices(
  availability: AvailabilityResponse | null,
  staffList: Staff[],
  selectedStaffId: number | null,
  selectedService: ServiceItem | null,
): SlotChoice[] {
  if (!availability || !selectedService) {
    return [];
  }

  const choices =
    availability.staff?.flatMap((group) =>
      group.slots.map((slot) => ({
        key: `${group.staffId}-${slot.startAt}`,
        staffId: group.staffId,
        staffName: group.staffName,
        priceCents: getStaffServicePrice(
          staffList,
          selectedService.id,
          group.staffId,
          selectedService.priceCents,
        ),
        startAt: slot.startAt,
        endAt: slot.endAt,
      })),
    ) ??
    availability.slots?.map((slot) => {
      const staff = staffList.find((item) => item.id === selectedStaffId);
      const staffId = selectedStaffId ?? 0;
      return {
        key: `${staffId}-${slot.startAt}`,
        staffId,
        staffName: staff?.name ?? '指定员工',
        priceCents: getStaffServicePrice(
          staffList,
          selectedService.id,
          staffId,
          selectedService.priceCents,
        ),
        startAt: slot.startAt,
        endAt: slot.endAt,
      };
    }) ??
    [];

  return choices.sort(
    (left, right) =>
      new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );
}

export function BookingFlow() {
  const dateOptions = useMemo(() => createDateOptions(7), []);
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null,
  );
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value ?? '');
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState<Appointment | null>(null);

  const activeServices = useMemo(
    () => services.filter((item) => item.isActive),
    [services],
  );

  const activeStaff = useMemo(
    () => staffList.filter((item) => item.isActive),
    [staffList],
  );

  const selectedStaff = useMemo(
    () => activeStaff.find((item) => item.id === selectedStaffId) ?? null,
    [activeStaff, selectedStaffId],
  );

  const selectedStaffServices = useMemo(
    () => getStaffServiceOptions(selectedStaff, activeServices),
    [activeServices, selectedStaff],
  );

  const selectedServiceOption = useMemo(
    () =>
      selectedStaffServices.find(
        (item) => item.service.id === selectedServiceId,
      ) ?? null,
    [selectedServiceId, selectedStaffServices],
  );

  const selectedService = selectedServiceOption?.service ?? null;

  const slotChoices = useMemo(
    () =>
      buildSlotChoices(
        availability,
        staffList,
        selectedStaffId,
        selectedService,
      ),
    [availability, selectedService, selectedStaffId, staffList],
  );

  const selectedSlot =
    slotChoices.find((item) => item.key === selectedSlotKey) ?? null;

  const summaryPriceCents =
    selectedSlot?.priceCents ??
    selectedServiceOption?.priceCents;

  useEffect(() => {
    let disposed = false;

    async function loadInitialData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [serviceData, staffData] = await Promise.all([
          api.listServiceItems(),
          api.listStaff(),
        ]);

        if (disposed) {
          return;
        }

        setServices(serviceData);
        setStaffList(staffData);
      } catch (error) {
        if (!disposed) {
          setErrorMessage(
            error instanceof Error ? error.message : '初始化预约信息失败',
          );
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    setSelectedSlotKey(null);
    setSuccess(null);
  }, [selectedServiceId, selectedStaffId, selectedDate]);

  useEffect(() => {
    if (
      selectedServiceId &&
      !selectedStaffServices.some((item) => item.service.id === selectedServiceId)
    ) {
      setSelectedServiceId(null);
    }
  }, [selectedServiceId, selectedStaffServices]);

  useEffect(() => {
    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      setAvailability(null);
      return;
    }

    const serviceItemId = selectedServiceId;
    const staffId = selectedStaffId;
    let disposed = false;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setErrorMessage('');

      try {
        const data = await api.getAvailability({
          serviceItemId,
          date: selectedDate,
          staffId,
        });

        if (!disposed) {
          setAvailability(data);
        }
      } catch (error) {
        if (!disposed) {
          setAvailability(null);
          setErrorMessage(
            error instanceof Error ? error.message : '可预约时间加载失败',
          );
        }
      } finally {
        if (!disposed) {
          setAvailabilityLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      disposed = true;
    };
  }, [selectedDate, selectedServiceId, selectedStaffId]);

  async function refreshAvailability() {
    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      return;
    }

    const data = await api.getAvailability({
      serviceItemId: selectedServiceId,
      date: selectedDate,
      staffId: selectedStaffId,
    });
    setAvailability(data);
  }

  function selectStaff(staffId: number) {
    setSelectedStaffId(staffId);
    setSelectedServiceId(null);
    setSelectedSlotKey(null);
    setSuccess(null);
  }

  function selectService(serviceId: number) {
    setSelectedServiceId(serviceId);
    setSelectedSlotKey(null);
    setSuccess(null);
  }

  function selectSlot(slotKey: string) {
    setSelectedSlotKey(slotKey);
    setSlotDialogOpen(false);
    setCurrentStep(4);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !selectedSlot) {
      setErrorMessage('请先选择服务和可预约时间');
      return;
    }
    if (!customerPhonePattern.test(customerPhone.trim())) {
      setErrorMessage('请输入 11 位数字手机号');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccess(null);

    try {
      const appointment = await api.createAppointment({
        serviceItemId: selectedService.id,
        staffId: selectedSlot.staffId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startAt: selectedSlot.startAt,
        remark: remark.trim() || undefined,
      });

      setSuccess(appointment);
      setSelectedSlotKey(null);
      setRemark('');
      setCurrentStep(1);
      await refreshAvailability();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '提交预约失败，请稍后重试',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    Boolean(selectedService && selectedSlot && customerName.trim()) &&
    customerPhonePattern.test(customerPhone.trim()) &&
    !submitting;

  return (
    <>
      <main className="booking-page">
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

          <header className="booking-header">
            <p className="eyebrow">在线预约</p>
            <h1 className="page-title">选择你的到店时间</h1>
            <p className="booking-header__text">
              先选择发型师，再从这位员工可做的服务里挑项目，最后选择日期和时段。
            </p>
          </header>

          <form className="booking-layout" onSubmit={handleSubmit}>
            <div className="booking-main">
              <section className="booking-section booking-step-panel">
                <div className="booking-progress" aria-label="预约步骤">
                  {bookingSteps.map((step) => (
                    <span
                      className={
                        currentStep === step.number
                          ? 'is-current'
                          : step.number === 3 && selectedSlot
                            ? 'is-complete'
                            : currentStep > step.number
                              ? 'is-complete'
                              : ''
                      }
                      key={step.number}
                    >
                      <small>{step.number}</small>
                      {step.label}
                    </span>
                  ))}
                </div>

                {currentStep === 1 ? (
                  <>
                    <div className="step-heading">
                      <span>01</span>
                      <h2>选择员工</h2>
                    </div>

                    {loading ? (
                      <div className="skeleton-block">正在加载员工...</div>
                    ) : activeStaff.length > 0 ? (
                      <div className="staff-choice-grid">
                        {activeStaff.map((staff) => {
                          const staffServices = getStaffServiceOptions(
                            staff,
                            activeServices,
                          );
                          return (
                            <button
                              className={`staff-choice-card ${
                                staff.id === selectedStaffId ? 'is-selected' : ''
                              }`}
                              key={staff.id}
                              type="button"
                              onClick={() => selectStaff(staff.id)}
                            >
                              <span className="choice-card__category">
                                {staff.title ?? '发型师'}
                              </span>
                              <strong>{staff.name}</strong>
                              <span className="staff-service-preview">
                                {staffServices.length > 0
                                  ? staffServices
                                      .slice(0, 4)
                                      .map(
                                        (item) =>
                                          `${item.service.name} ${formatPrice(
                                            item.priceCents,
                                          )}`,
                                      )
                                      .join(' · ')
                                  : '暂无可预约服务'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        title="暂无可预约员工"
                        description="请先在后端维护员工和员工服务。"
                      />
                    )}

                    <div className="step-actions">
                      <button
                        className="button"
                        disabled={!selectedStaff}
                        type="button"
                        onClick={() => setCurrentStep(2)}
                      >
                        下一步
                      </button>
                    </div>
                  </>
                ) : null}

                {currentStep === 2 ? (
                  <>
                    <div className="step-heading">
                      <span>02</span>
                      <h2>选择服务</h2>
                    </div>

                    {selectedStaff ? (
                      <p className="step-context">
                        {selectedStaff.name} 当前可预约 {selectedStaffServices.length}{' '}
                        项服务。
                      </p>
                    ) : null}

                    {selectedStaffServices.length > 0 ? (
                      <div className="choice-grid service-grid">
                        {selectedStaffServices.map(({ service, priceCents }) => (
                          <button
                            className={`choice-card ${
                              service.id === selectedServiceId ? 'is-selected' : ''
                            }`}
                            key={service.id}
                            type="button"
                            onClick={() => selectService(service.id)}
                          >
                            <span className="choice-card__category">
                              {service.category?.name ?? '服务'}
                            </span>
                            <strong>{service.name}</strong>
                            <span className="choice-card__meta">
                              {formatDuration(service.durationMinutes)} ·{' '}
                              {formatPrice(priceCents)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="暂无可预约服务"
                        description="这位员工当前没有开放服务项目。"
                      />
                    )}

                    <div className="step-actions">
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => setCurrentStep(1)}
                      >
                        上一步
                      </button>
                      <button
                        className="button"
                        disabled={!selectedService}
                        type="button"
                        onClick={() => setCurrentStep(3)}
                      >
                        下一步
                      </button>
                    </div>
                  </>
                ) : null}

                {currentStep === 3 ? (
                  <>
                    <div className="step-heading">
                      <span>03</span>
                      <h2>日期与时段</h2>
                    </div>

                    <div className="date-strip">
                      {dateOptions.map((date) => (
                        <button
                          className={`date-chip ${
                            date.value === selectedDate ? 'is-selected' : ''
                          }`}
                          key={date.value}
                          type="button"
                          onClick={() => setSelectedDate(date.value)}
                        >
                          <span>{date.label}</span>
                          <small>{date.value.slice(5)}</small>
                        </button>
                      ))}
                    </div>

                    {selectedSlot ? (
                      <div className="selected-slot-card">
                        <span>已选时段</span>
                        <strong>
                          {formatTime(selectedSlot.startAt)} · {selectedSlot.staffName}
                        </strong>
                        <small>{formatPrice(selectedSlot.priceCents)}</small>
                      </div>
                    ) : null}

                    <div className="step-actions">
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => setCurrentStep(2)}
                      >
                        上一步
                      </button>
                      <button
                        className="button"
                        disabled={
                          !selectedService || !selectedStaff || availabilityLoading
                        }
                        type="button"
                        onClick={() => setSlotDialogOpen(true)}
                      >
                        {availabilityLoading ? '刷新时段中...' : '选择可预约时段'}
                      </button>
                      {selectedSlot ? (
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => setCurrentStep(4)}
                        >
                          填写预约信息
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {currentStep === 4 ? (
                  <>
                    <div className="step-heading">
                      <span>04</span>
                      <h2>预约人信息</h2>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>姓名</span>
                        <input
                          className="input"
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          placeholder="请输入姓名"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>手机号</span>
                        <input
                          className="input"
                          inputMode="numeric"
                          maxLength={11}
                          pattern="\d{11}"
                          value={customerPhone}
                          onChange={(event) =>
                            setCustomerPhone(
                              normalizePhoneInput(event.target.value),
                            )
                          }
                          placeholder="11 位数字手机号"
                          required
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>备注</span>
                      <textarea
                        className="textarea"
                        value={remark}
                        onChange={(event) => setRemark(event.target.value)}
                        placeholder="例如：想修刘海、头皮敏感、希望靠窗座位"
                      />
                    </label>

                    <div className="step-actions">
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => setCurrentStep(2)}
                      >
                        上一步
                      </button>
                    </div>
                  </>
                ) : null}
              </section>
            </div>

            <aside className="summary-panel panel">
              <p className="eyebrow">预约单</p>
              <h2>YJMF</h2>
              <div className="summary-list">
                <div>
                  <span>服务</span>
                  <strong>{selectedService?.name ?? '待选择'}</strong>
                </div>
                <div>
                  <span>员工</span>
                  <strong>{selectedSlot?.staffName ?? selectedStaff?.name ?? '待选择'}</strong>
                </div>
                <div>
                  <span>日期</span>
                  <strong>{selectedDate || '待选择'}</strong>
                </div>
                <div>
                  <span>时间</span>
                  <strong>
                    {selectedSlot ? formatTime(selectedSlot.startAt) : '待选择'}
                  </strong>
                </div>
                <div>
                  <span>价格</span>
                  <strong>
                    {summaryPriceCents !== undefined
                      ? formatPrice(summaryPriceCents)
                      : '待选择'}
                  </strong>
                </div>
              </div>

              {errorMessage ? (
                <p className="feedback feedback--error">{errorMessage}</p>
              ) : null}
              {success ? (
                <p className="feedback feedback--success">
                  预约已提交：{success.serviceNameSnapshot}，
                  {formatTime(success.startAt)} 到店。
                </p>
              ) : null}

              <button className="button" disabled={!canSubmit} type="submit">
                {submitting ? '提交中...' : '提交预约'}
              </button>
            </aside>
          </form>
        </div>
      </main>

      {slotDialogOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="slot-dialog-title"
            aria-modal="true"
            className="slot-dialog"
            role="dialog"
          >
            <div className="cancel-dialog__header">
              <p className="eyebrow">可预约时段</p>
              <h2 id="slot-dialog-title">
                {selectedStaff?.name ?? '员工'} · {selectedService?.name ?? '服务'} ·{' '}
                {selectedDate}
              </h2>
              <p>选择一个到店时间，价格会按该员工的服务价格计算。</p>
            </div>

            {availabilityLoading ? (
              <div className="skeleton-block">正在刷新可预约时间...</div>
            ) : slotChoices.length > 0 ? (
              <div className="slot-grid slot-grid--dialog">
                {slotChoices.map((slot) => (
                  <button
                    className={`slot-button ${
                      slot.key === selectedSlotKey ? 'is-selected' : ''
                    }`}
                    key={slot.key}
                    type="button"
                    onClick={() => selectSlot(slot.key)}
                  >
                    <strong>{formatTime(slot.startAt)}</strong>
                    <span>{slot.staffName}</span>
                    <small>{formatPrice(slot.priceCents)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="当前没有空闲时段"
                description="可以换一天，或返回重新选择员工。"
              />
            )}

            <div className="dialog-actions">
              <button
                className="button ghost"
                type="button"
                onClick={() => setSlotDialogOpen(false)}
              >
                返回
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
