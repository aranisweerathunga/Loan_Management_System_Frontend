import { request } from "@/lib/api/client";
import type { CodedRecordInput, Grade } from "@/lib/api/types";

export function listGrades(signal?: AbortSignal) {
  return request<Grade[]>("/grades", { signal });
}

export function createGrade(input: CodedRecordInput) {
  return request<Grade>("/grades", { method: "POST", body: input });
}

export function updateGrade(gradeId: string, input: CodedRecordInput) {
  return request<Grade>(`/grades/${gradeId}`, { method: "PATCH", body: input });
}
