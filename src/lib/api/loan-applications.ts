import { request } from "@/lib/api/client";
import type {
  ApplicationStatusHistoryEntry,
  LoanApplication,
  LoanApplicationDetail,
  LoanApplicationListFilters,
  LoanApplicationWriteInput,
} from "@/lib/api/types";

export function listLoanApplications(
  filters: LoanApplicationListFilters = {},
  signal?: AbortSignal,
) {
  return request<LoanApplication[]>("/loan-applications", {
    signal,
    query: {
      borrowerId: filters.borrowerId,
      loanProductId: filters.loanProductId,
      status: filters.status,
    },
  });
}

export function getLoanApplication(applicationId: string, signal?: AbortSignal) {
  return request<LoanApplicationDetail>(`/loan-applications/${applicationId}`, { signal });
}

export function createLoanApplication(input: LoanApplicationWriteInput) {
  return request<LoanApplicationDetail>("/loan-applications", { method: "POST", body: input });
}

export function updateLoanApplication(applicationId: string, input: LoanApplicationWriteInput) {
  return request<LoanApplicationDetail>(`/loan-applications/${applicationId}`, {
    method: "PATCH",
    body: input,
  });
}

export function listApplicationStatusHistory(applicationId: string, signal?: AbortSignal) {
  return request<ApplicationStatusHistoryEntry[]>(
    `/loan-applications/${applicationId}/status-history`,
    { signal },
  );
}

export function submitLoanApplication(applicationId: string) {
  return request<LoanApplicationDetail>(`/loan-applications/${applicationId}/submit`, {
    method: "POST",
  });
}

export function startLoanApplicationReview(applicationId: string) {
  return request<LoanApplicationDetail>(`/loan-applications/${applicationId}/start-review`, {
    method: "POST",
  });
}
