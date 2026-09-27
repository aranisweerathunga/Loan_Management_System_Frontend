import { ApiError } from "@/lib/api/client";
import { canonicalizeMoney } from "@/lib/money";

const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateCode(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 2) return "Code must be at least 2 characters.";
  if (trimmed.length > 32) return "Code must be at most 32 characters.";
  if (!CODE_PATTERN.test(trimmed)) {
    return "Use only letters, numbers, underscores, and hyphens.";
  }
  return undefined;
}

export function validateName(value: string, label = "Name"): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > 120) return `${label} must be at most 120 characters.`;
  return undefined;
}

export function validateDescription(value: string): string | undefined {
  if (value.trim().length > 500) return "Description must be at most 500 characters.";
  return undefined;
}

export function validateOptionalEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 254) return "Email must be at most 254 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validateOptionalPhone(value: string): string | undefined {
  if (value.trim().length > 32) return "Phone must be at most 32 characters.";
  return undefined;
}

export function validateDate(value: string, required: boolean): string | undefined {
  if (!value) return required ? "Date is required." : undefined;
  if (!DATE_PATTERN.test(value)) return "Enter a valid date.";
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "Enter a valid calendar date.";
  }
  return undefined;
}

export function validateDateOrder(effectiveFrom: string, effectiveTo: string): string | undefined {
  if (!effectiveTo || !effectiveFrom) return undefined;
  if (effectiveTo < effectiveFrom) return "End date cannot be earlier than the start date.";
  return undefined;
}

export function validateToken(value: string, label: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > max) return `${label} must be at most ${max} characters.`;
  if (!CODE_PATTERN.test(trimmed)) {
    return "Use only letters, numbers, underscores, and hyphens.";
  }
  return undefined;
}

export function validateRequiredText(
  value: string,
  label: string,
  max: number,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

export function validatePositiveInteger(value: string): string | undefined {
  if (!/^[1-9]\d*$/.test(value.trim())) return "Enter a positive whole number.";
  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed)) return "Enter a smaller whole number.";
  return undefined;
}

export function validateMoney(value: string): string | undefined {
  if (!canonicalizeMoney(value)) {
    return "Enter a non-negative amount with up to 2 decimal places, such as 1500.00.";
  }
  return undefined;
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapServerFieldErrors(
  error: unknown,
  fields: readonly string[],
): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const mapped: Record<string, string> = {};
  for (const part of error.message.split("; ")) {
    const separator = part.indexOf(": ");
    if (separator <= 0) continue;
    const field = part.slice(0, separator);
    if (fields.includes(field)) mapped[field] = part.slice(separator + 2);
  }
  return mapped;
}

export function hasFieldErrors(errors: object): boolean {
  return Object.values(errors).some((value) => typeof value === "string" && value.length > 0);
}

export function parseConfigurationObject(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: "Configuration is required. Use {} when there is nothing to store yet.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, message: "Configuration must be valid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      message: "Configuration must be a JSON object, not an array or a single value.",
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
