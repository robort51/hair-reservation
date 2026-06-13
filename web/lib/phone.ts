export const customerPhonePattern = /^\d{11}$/;

export function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}
