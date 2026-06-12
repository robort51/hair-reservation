export type AvailabilitySlot = {
  startAt: Date;
  endAt: Date;
};

export type StaffAvailability = {
  staffId: number;
  staffName: string;
  slots: AvailabilitySlot[];
};