import type { JsonValue } from "@/lib/api/types";

export type AssessmentResultView = {
  outcome: string | null;
  reasonCodes: string[];
  summary: string | null;
  rules: RuleResultView[];
};

export type RuleResultView = {
  index: number;
  type: string;
  outcome: string | null;
  reasonCodes: string[];
  summary: string | null;
  calculated: Array<{ key: string; value: string }>;
};

const reasonLabels: Record<string, string> = {
  NO_ELIGIBILITY_RULES_CONFIGURED: "No eligibility rules are configured for this product version.",
};

export function reasonText(code: string): string {
  return reasonLabels[code] ?? code;
}

export function assessmentStatusLabel(status: string): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "PENDING") return "Pending";
  return status;
}

export function ruleOutcomeLabel(outcome: string): string {
  if (outcome === "PASSED") return "Passed";
  if (outcome === "FAILED") return "Failed";
  if (outcome === "REVIEW_REQUIRED") return "Review required";
  return outcome;
}

function isRecord(value: unknown): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function readAssessmentResult(snapshot: JsonValue | null): AssessmentResultView {
  if (!isRecord(snapshot)) {
    return { outcome: null, reasonCodes: [], summary: null, rules: [] };
  }
  const rulesValue = snapshot.rules;
  const rules = Array.isArray(rulesValue)
    ? rulesValue.flatMap((rule, index) => {
        const view = readRuleResult(rule, index);
        return view ? [view] : [];
      })
    : [];
  return {
    outcome: text(snapshot.outcome),
    reasonCodes: stringList(snapshot.reasonCodes),
    summary: text(snapshot.summary),
    rules,
  };
}

function readRuleResult(value: unknown, fallbackIndex: number): RuleResultView | null {
  if (!isRecord(value)) return null;
  const calculatedValue = value.calculated;
  const calculated = isRecord(calculatedValue)
    ? Object.entries(calculatedValue).flatMap(([key, entry]) =>
        typeof entry === "string" ? [{ key, value: entry }] : [],
      )
    : [];
  return {
    index: typeof value.index === "number" ? value.index : fallbackIndex,
    type: text(value.type) ?? "Rule",
    outcome: text(value.outcome),
    reasonCodes: stringList(value.reasonCodes),
    summary: text(value.summary),
    calculated,
  };
}

export type InputContextView = {
  applicationNumber: string | null;
  applicationStatus: string | null;
  borrowerName: string | null;
  productName: string | null;
  versionNumber: number | null;
  versionStatus: string | null;
  purposeName: string | null;
};

export function readInputContext(snapshot: JsonValue): InputContextView {
  const root = isRecord(snapshot) ? snapshot : null;
  const application = root && isRecord(root.application) ? root.application : null;
  const borrower = root && isRecord(root.borrower) ? root.borrower : null;
  const product = root && isRecord(root.loanProduct) ? root.loanProduct : null;
  const version = root && isRecord(root.productVersion) ? root.productVersion : null;
  const purpose = root && isRecord(root.productPurpose) ? root.productPurpose : null;
  const name = [text(borrower?.firstName), text(borrower?.middleName), text(borrower?.lastName)]
    .filter((part): part is string => part !== null)
    .join(" ");
  const productName = text(product?.name);
  const productCode = text(product?.code);
  const purposeName = text(purpose?.name);
  const purposeCode = text(purpose?.code);
  return {
    applicationNumber: text(application?.applicationNumber),
    applicationStatus: text(application?.status),
    borrowerName: name.length > 0 ? name : null,
    productName: productName ? (productCode ? `${productName} (${productCode})` : productName) : null,
    versionNumber: typeof version?.versionNumber === "number" ? version.versionNumber : null,
    versionStatus: text(version?.status),
    purposeName: purposeName && purposeCode ? `${purposeName} (${purposeCode})` : purposeName ?? purposeCode,
  };
}

export type ConfiguredRuleView = {
  type: string;
  fields: Array<{ label: string; value: string }>;
};

export function readConfiguredRules(snapshot: JsonValue): {
  state: "absent" | "empty" | "rules" | "unknown";
  rules: ConfiguredRuleView[];
} {
  if (!isRecord(snapshot) || !("eligibility" in snapshot)) {
    return { state: "unknown", rules: [] };
  }
  const eligibility = snapshot.eligibility;
  if (eligibility === null) return { state: "absent", rules: [] };
  if (!isRecord(eligibility) || !Array.isArray(eligibility.rules)) {
    return { state: "unknown", rules: [] };
  }
  if (eligibility.rules.length === 0) return { state: "empty", rules: [] };
  const rules = eligibility.rules.flatMap((rule) => {
    if (!isRecord(rule)) return [];
    const type = text(rule.type) ?? "Rule";
    const fields = Object.entries(rule).flatMap(([key, value]) => {
      if (key === "type") return [];
      const rendered = renderConfiguredValue(value);
      return rendered ? [{ label: key, value: rendered }] : [];
    });
    return [{ type, fields }];
  });
  return { state: "rules", rules };
}

function renderConfiguredValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (isRecord(value)) return JSON.stringify(value);
  return null;
}
