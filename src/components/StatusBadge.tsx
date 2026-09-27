import type { ReactNode } from "react";
import type { ProductVersionStatus } from "@/lib/api/types";

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
