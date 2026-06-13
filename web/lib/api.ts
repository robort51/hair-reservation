import type {
  ApiResponse,
  Appointment,
  AvailabilityResponse,
  CreateAppointmentPayload,
  ServiceCategory,
  ServiceItem,
  ServiceItemPayload,
  Staff,
  StaffPayload,
  StaffServiceAssignmentPayload,
  WeeklySchedule,
  WeeklySchedulePayload,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3001';

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code = 'REQUEST_FAILED',
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiRequestError('无法连接预约服务，请确认后端已启动');
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new ApiRequestError(
      payload.error?.message ?? '请求失败，请稍后再试',
      payload.error?.code,
    );
  }

  if (payload.data === null) {
    throw new ApiRequestError('接口没有返回数据');
  }

  return payload.data;
}

export const api = {
  listServiceCategories() {
    return request<ServiceCategory[]>('/service-categories');
  },

  listServiceItems() {
    return request<ServiceItem[]>('/service-items');
  },

  createServiceItem(payload: ServiceItemPayload) {
    return request<ServiceItem>('/service-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateServiceItem(id: number, payload: Partial<ServiceItemPayload>) {
    return request<ServiceItem>(`/service-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateServiceItemStatus(id: number, isActive: boolean) {
    return request<ServiceItem>(`/service-items/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  listStaff() {
    return request<Staff[]>('/staff');
  },

  createStaff(payload: StaffPayload) {
    return request<Staff>('/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStaff(id: number, payload: Partial<StaffPayload>) {
    return request<Staff>(`/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateStaffStatus(id: number, isActive: boolean) {
    return request<Staff>(`/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  replaceStaffServices(
    staffId: number,
    services: StaffServiceAssignmentPayload[],
  ) {
    return request<Staff>(`/staff/${staffId}/services`, {
      method: 'PUT',
      body: JSON.stringify({ services }),
    });
  },

  listWeeklySchedules(staffId: number) {
    return request<WeeklySchedule[]>(`/staff/${staffId}/weekly-schedules`);
  },

  replaceWeeklySchedules(staffId: number, payload: WeeklySchedulePayload) {
    return request<WeeklySchedule[]>(`/staff/${staffId}/weekly-schedules`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getAvailability(params: {
    serviceItemId: number;
    date: string;
    staffId?: number;
  }) {
    const search = new URLSearchParams({
      serviceItemId: String(params.serviceItemId),
      date: params.date,
    });
    if (params.staffId) {
      search.set('staffId', String(params.staffId));
    }
    return request<AvailabilityResponse>(`/availability?${search.toString()}`);
  },

  createAppointment(payload: CreateAppointmentPayload) {
    return request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listAppointments() {
    return request<Appointment[]>('/appointments');
  },

  listAppointmentsByPhone(customerPhone: string) {
    const search = new URLSearchParams({ customerPhone });
    return request<Appointment[]>(`/appointments?${search.toString()}`);
  },

  completeAppointment(id: number) {
    return request<Appointment>(`/appointments/${id}/complete`, {
      method: 'PATCH',
    });
  },

  cancelAppointment(id: number, cancelReason?: string) {
    return request<Appointment>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelReason }),
    });
  },
};

export { ApiRequestError };
