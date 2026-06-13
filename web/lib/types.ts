export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export type ServiceCategory = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceItem = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  originalPriceCents: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: ServiceCategory;
  staffServices?: StaffServiceLink[];
};

export type StaffServiceLink = {
  id: number;
  staffId: number;
  serviceItemId: number;
  priceCents: number;
  sortOrder: number;
  createdAt: string;
  serviceItem?: ServiceItem;
  staff?: Staff;
};

export type Staff = {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  staffServices?: StaffServiceLink[];
};

export type ServiceItemPayload = {
  categoryId: number;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  originalPriceCents?: number;
  sortOrder: number;
  isActive: boolean;
};

export type StaffPayload = {
  name: string;
  title?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  isActive: boolean;
};

export type StaffServiceAssignmentPayload = {
  serviceItemId: number;
  priceCents: number;
};

export type WeeklySchedule = {
  id?: number;
  staffId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WeeklySchedulePayload = {
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isWorking: boolean;
  }>;
};

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
};

export type StaffAvailability = {
  staffId: number;
  staffName: string;
  slots: AvailabilitySlot[];
};

export type AvailabilityResponse = {
  date: string;
  serviceItemId: number;
  staffId?: number;
  slots?: AvailabilitySlot[];
  staff?: StaffAvailability[];
};

export type AppointmentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELED'
  | 'EXPIRED';

export type Appointment = {
  id: number;
  customerId: number;
  serviceItemId: number;
  staffId: number;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  serviceNameSnapshot: string;
  serviceDurationMinutesSnapshot: number;
  servicePriceCentsSnapshot: number;
  staffNameSnapshot: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  remark: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAppointmentPayload = {
  serviceItemId: number;
  staffId: number;
  customerName: string;
  customerPhone: string;
  startAt: string;
  remark?: string;
};
