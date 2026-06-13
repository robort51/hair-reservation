import type {
  AdminLoginResponse,
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
import {
  clearAdminToken,
  getAdminToken,
  redirectToAdminLogin,
} from './admin-auth';

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

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { admin?: boolean },
): Promise<T> {
  const token = options?.admin ? getAdminToken() : null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiRequestError('无法连接预约服务，请确认后端已启动');
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    if (payload.error?.code === 'ADMIN_UNAUTHORIZED') {
      clearAdminToken();
      redirectToAdminLogin();
    }
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
  adminLogin(payload: { username: string; password: string }) {
    return request<AdminLoginResponse>('/admin-auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

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
    }, { admin: true });
  },

  updateServiceItem(id: number, payload: Partial<ServiceItemPayload>) {
    return request<ServiceItem>(`/service-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, { admin: true });
  },

  updateServiceItemStatus(id: number, isActive: boolean) {
    return request<ServiceItem>(`/service-items/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, { admin: true });
  },

  listStaff() {
    return request<Staff[]>('/staff');
  },

  createStaff(payload: StaffPayload) {
    return request<Staff>('/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { admin: true });
  },

  updateStaff(id: number, payload: Partial<StaffPayload>) {
    return request<Staff>(`/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, { admin: true });
  },

  updateStaffStatus(id: number, isActive: boolean) {
    return request<Staff>(`/staff/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, { admin: true });
  },

  replaceStaffServices(
    staffId: number,
    services: StaffServiceAssignmentPayload[],
  ) {
    return request<Staff>(`/staff/${staffId}/services`, {
      method: 'PUT',
      body: JSON.stringify({ services }),
    }, { admin: true });
  },

  listWeeklySchedules(staffId: number) {
    return request<WeeklySchedule[]>(
      `/staff/${staffId}/weekly-schedules`,
      undefined,
      { admin: true },
    );
  },

  replaceWeeklySchedules(staffId: number, payload: WeeklySchedulePayload) {
    return request<WeeklySchedule[]>(`/staff/${staffId}/weekly-schedules`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, { admin: true });
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
    return request<Appointment[]>('/appointments', undefined, { admin: true });
  },

  listAppointmentsByPhone(customerPhone: string) {
    const search = new URLSearchParams({ customerPhone });
    return request<Appointment[]>(`/appointments?${search.toString()}`);
  },

  completeAppointment(id: number) {
    return request<Appointment>(`/appointments/${id}/complete`, {
      method: 'PATCH',
    }, { admin: true });
  },

  cancelAppointment(id: number, cancelReason?: string) {
    return request<Appointment>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancelReason }),
    }, { admin: true });
  },
};

export { ApiRequestError };
