export function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [person.firstName, person.middleName, person.lastName]
    .filter((part) => part && part.trim().length > 0)
    .join(" ");
}

export function displayText(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return "—";
  return value;
}

export function utcTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return "";
  }
}
