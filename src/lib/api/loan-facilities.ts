import { request } from "@/lib/api/client";
import type {
  CreateLoanDisbursementInput,
  CreateLoanFacilityInput,
  LoanDisbursement,
  LoanFacility,
  LoanFacilityListFilters,
  LoanTransaction,
} from "@/lib/api/types";

export function listLoanFacilities(filters: LoanFacilityListFilters = {}, signal?: AbortSignal) {
  return request<LoanFacility[]>("/loan-facilities", {
    signal,
    query: {
      status: filters.status,
      borrowerId: filters.borrowerId,
      loanProductId: filters.loanProductId,
    },
  });
}

export function getLoanFacility(facilityId: string, signal?: AbortSignal) {
  return request<LoanFacility>(`/loan-facilities/${facilityId}`, { signal });
}

export function createLoanFacility(applicationId: string, input: CreateLoanFacilityInput) {
  return request<LoanFacility>(`/loan-applications/${applicationId}/facility`, {
    method: "POST",
    body: input,
  });
}

export function listLoanDisbursements(facilityId: string, signal?: AbortSignal) {
  return request<LoanDisbursement[]>(`/loan-facilities/${facilityId}/disbursements`, { signal });
}

export function getLoanDisbursement(
  facilityId: string,
  disbursementId: string,
  signal?: AbortSignal,
) {
  return request<LoanDisbursement>(
    `/loan-facilities/${facilityId}/disbursements/${disbursementId}`,
    { signal },
  );
}

export function createLoanDisbursement(facilityId: string, input: CreateLoanDisbursementInput) {
  return request<LoanDisbursement>(`/loan-facilities/${facilityId}/disbursements`, {
    method: "POST",
    body: input,
  });
}

export function listLoanTransactions(facilityId: string, signal?: AbortSignal) {
  return request<LoanTransaction[]>(`/loan-facilities/${facilityId}/transactions`, { signal });
}

export function getLoanTransaction(
  facilityId: string,
  transactionId: string,
  signal?: AbortSignal,
) {
  return request<LoanTransaction>(`/loan-facilities/${facilityId}/transactions/${transactionId}`, {
    signal,
  });
}
