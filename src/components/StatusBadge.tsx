import type { ReactNode } from "react";
import type { LoanApplicationStatus, ProductVersionStatus } from "@/lib/api/types";

type Tone = "success" | "neutral" | "info" | "warning" | "danger" | "draft" | "retired";

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__mark" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ActiveBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return active ? (
    <StatusBadge tone="success">{activeLabel}</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">{inactiveLabel}</StatusBadge>
  );
}

export function VersionBadge({ status }: { status: ProductVersionStatus }) {
  if (status === "ACTIVE") return <StatusBadge tone="success">Active</StatusBadge>;
  if (status === "RETIRED") return <StatusBadge tone="retired">Retired</StatusBadge>;
  return <StatusBadge tone="draft">Draft</StatusBadge>;
}

const applicationStatusLabels: Record<LoanApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
};

export function applicationStatusLabel(status: LoanApplicationStatus): string {
  return applicationStatusLabels[status];
}

export function ApplicationStatusBadge({ status }: { status: LoanApplicationStatus }) {
  const tone: Tone = status === "DRAFT" ? "draft" : status === "SUBMITTED" ? "info" : "warning";
  return <StatusBadge tone={tone}>{applicationStatusLabel(status)}</StatusBadge>;
}
