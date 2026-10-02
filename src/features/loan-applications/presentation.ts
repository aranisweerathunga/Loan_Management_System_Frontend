import type { ApplicationStatusHistoryEntry, ProductVersionStatus } from "@/lib/api/types";
import { applicationStatusLabel } from "@/components/StatusBadge";
import { formatDateOnly } from "@/lib/format";

export function versionChoiceLabel(version: {
  versionNumber: number;
  status: ProductVersionStatus;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}): string {
  const status =
    version.status === "ACTIVE" ? "Active" : version.status === "DRAFT" ? "Draft" : "Retired";
  const parts = [`Version ${version.versionNumber}`, status];
  if (version.effectiveFrom) {
    parts.push(
      version.effectiveTo
        ? `${formatDateOnly(version.effectiveFrom)} – ${formatDateOnly(version.effectiveTo)}`
        : `From ${formatDateOnly(version.effectiveFrom)}`,
    );
  }
  return parts.join(" · ");
}

export function versionSummary(version: {
  versionNumber: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}): string {
  if (!version.effectiveFrom) return `Version ${version.versionNumber}`;
  if (!version.effectiveTo) {
    return `Version ${version.versionNumber} · From ${formatDateOnly(version.effectiveFrom)}`;
  }
  return `Version ${version.versionNumber} · ${formatDateOnly(version.effectiveFrom)} – ${formatDateOnly(version.effectiveTo)}`;
}

export function historyCopy(entry: ApplicationStatusHistoryEntry): {
  title: string;
  detail: string;
} {
  if (entry.fromStatus === null && entry.toStatus === "DRAFT") {
    return { title: "Draft", detail: "Created" };
  }
  if (entry.fromStatus === "DRAFT" && entry.toStatus === "SUBMITTED") {
    return { title: "Submitted", detail: "Submitted" };
  }
  if (entry.fromStatus === "SUBMITTED" && entry.toStatus === "UNDER_REVIEW") {
    return { title: "Under review", detail: "Review started" };
  }
  if (entry.fromStatus === "UNDER_REVIEW" && entry.toStatus === "APPROVED") {
    return { title: "Approved", detail: "Application approved" };
  }
  if (entry.fromStatus === "UNDER_REVIEW" && entry.toStatus === "REJECTED") {
    return { title: "Rejected", detail: "Application rejected" };
  }
  return {
    title: applicationStatusLabel(entry.toStatus),
    detail: "Status changed",
  };
}
