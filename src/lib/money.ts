/**
 * EPF amounts stay decimal strings. Grouping and padding never pass through Number.
 */
const MONEY_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function canonicalizeMoney(amount: string): string | null {
  const match = MONEY_PATTERN.exec(amount.trim());
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return `${match[1]}.${fraction}`;
}

const MAX_WHOLE_DIGITS = 16;

export function formatMoney(amount: string): string {
  const canonical = canonicalizeMoney(amount);
  if (!canonical) return amount.trim();
  const [whole, fraction] = canonical.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction}`;
}

export function formatMoneyAmount(amount: string, currencyCode: string): string {
  return `${currencyCode} ${formatMoney(amount)}`;
}

export function isZeroMoney(amount: string): boolean {
  return canonicalizeMoney(amount) === "0.00";
}

/** Positive decimal string with at most 16 digits before the decimal point. Never uses Number. */
export function canonicalPositiveMoney(amount: string): string | null {
  const canonical = canonicalizeMoney(amount);
  if (!canonical || canonical === "0.00") return null;
  if (canonical.slice(0, -3).length > MAX_WHOLE_DIGITS) return null;
  return canonical;
}
