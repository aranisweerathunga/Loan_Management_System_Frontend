import { request } from "@/lib/api/client";
import type {
  Borrower,
  BorrowerDetail,
  BorrowerIdentifier,
  BorrowerInput,
  EmployeeProfile,
  EmploymentHistoryInput,
  EmploymentHistoryRecord,
  EpfBalanceInput,
  EpfBalanceRecord,
  GradeHistoryInput,
  GradeHistoryRecord,
  IdentifierInput,
} from "@/lib/api/types";

export function listBorrowers(signal?: AbortSignal) {
  return request<Borrower[]>("/borrowers", { signal });
}

export function getBorrower(borrowerId: string, signal?: AbortSignal) {
  return request<BorrowerDetail>(`/borrowers/${borrowerId}`, { signal });
}

export function createBorrower(input: BorrowerInput) {
  return request<Borrower>("/borrowers", { method: "POST", body: input });
}

export function updateBorrower(borrowerId: string, input: BorrowerInput) {
  return request<Borrower>(`/borrowers/${borrowerId}`, { method: "PATCH", body: input });
}

export function listIdentifiers(borrowerId: string, signal?: AbortSignal) {
  return request<BorrowerIdentifier[]>(`/borrowers/${borrowerId}/identifiers`, { signal });
}

export function createIdentifier(borrowerId: string, input: IdentifierInput) {
  return request<BorrowerIdentifier>(`/borrowers/${borrowerId}/identifiers`, {
    method: "POST",
    body: input,
  });
}

export function updateIdentifier(borrowerId: string, identifierId: string, input: IdentifierInput) {
  return request<BorrowerIdentifier>(`/borrowers/${borrowerId}/identifiers/${identifierId}`, {
    method: "PATCH",
    body: input,
  });
}

export function createEmployeeProfile(borrowerId: string, isActive = true) {
  return request<EmployeeProfile>(`/borrowers/${borrowerId}/employee-profile`, {
    method: "POST",
    body: { isActive },
  });
}

export function updateEmployeeProfile(borrowerId: string, isActive: boolean) {
  return request<EmployeeProfile>(`/borrowers/${borrowerId}/employee-profile`, {
    method: "PATCH",
    body: { isActive },
  });
}

export function listEmploymentHistory(borrowerId: string, signal?: AbortSignal) {
  return request<EmploymentHistoryRecord[]>(`/borrowers/${borrowerId}/employment-history`, {
    signal,
  });
}

export function createEmploymentHistory(borrowerId: string, input: EmploymentHistoryInput) {
  return request<EmploymentHistoryRecord>(`/borrowers/${borrowerId}/employment-history`, {
    method: "POST",
    body: input,
  });
}

export function listGradeHistory(borrowerId: string, signal?: AbortSignal) {
  return request<GradeHistoryRecord[]>(`/borrowers/${borrowerId}/grade-history`, { signal });
}

export function createGradeHistory(borrowerId: string, input: GradeHistoryInput) {
  return request<GradeHistoryRecord>(`/borrowers/${borrowerId}/grade-history`, {
    method: "POST",
    body: input,
  });
}

export function listEpfBalances(borrowerId: string, signal?: AbortSignal) {
  return request<EpfBalanceRecord[]>(`/borrowers/${borrowerId}/epf-balances`, { signal });
}

export function createEpfBalance(borrowerId: string, input: EpfBalanceInput) {
  return request<EpfBalanceRecord>(`/borrowers/${borrowerId}/epf-balances`, {
    method: "POST",
    body: input,
  });
}
