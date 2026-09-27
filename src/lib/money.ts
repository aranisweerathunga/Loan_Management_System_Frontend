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

export function formatMoney(amount: string): string {
  const canonical = canonicalizeMoney(amount);
  if (!canonical) return amount.trim();
  const [whole, fraction] = canonical.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction}`;
}
