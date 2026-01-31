const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return emailRegex.test(value);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isOptionalNonEmpty(value: unknown): value is string {
  return value === undefined || value === null || isNonEmpty(value);
}
