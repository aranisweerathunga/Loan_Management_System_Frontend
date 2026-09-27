import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input, Select } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { createGradeHistory, listGradeHistory } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys, gradeKeys } from "@/lib/api/keys";
import { listGrades } from "@/lib/api/grades";
import type { EmployeeProfile, GradeHistoryInput } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/format";
import {
  hasFieldErrors,
  mapServerFieldErrors,
  validateDate,
  validateDateOrder,
} from "@/lib/validation";
import { EmployeeProfileCallout } from "@/features/borrowers/EmployeeProfileCallout";

export function GradeHistoryPanel({
  borrowerId,
  profile,
}: {
  borrowerId: string;
  profile: EmployeeProfile | null;
}) {
  const history = useQuery({
    queryKey: borrowerKeys.gradeHistory(borrowerId),
    queryFn: ({ signal }) => listGradeHistory(borrowerId, signal),
    enabled: profile !== null,
  });
  const grades = useQuery({
    queryKey: gradeKeys.all,
    queryFn: ({ signal }) => listGrades(signal),
    enabled: profile !== null,
  });
  const [creating, setCreating] = useState(false);
  const gradeOptions = useMemo(
    () => [...(grades.data ?? [])].sort((left, right) => left.code.localeCompare(right.code)),
    [grades.data],
  );

  if (!profile) {
    return (
      <Panel title="Grade history">
        <EmployeeProfileCallout borrowerId={borrowerId} profile={null} />
      </Panel>
    );
  }

  return (
    <Panel
      title="Grade history"
      description="Listed from the earliest effective date. Adding a record does not change earlier periods, and overlapping dates are not checked. Records cannot be edited or deleted."
      flush
      actions={
        <Button
          type="button"
          onClick={() => setCreating(true)}
          disabled={gradeOptions.length === 0}
        >
          Add grade history
        </Button>
      }
    >
      <QueryState
        isLoading={history.isPending || grades.isPending}
        isError={
          (history.isError && history.data === undefined) ||
          (grades.isError && grades.data === undefined)
        }
        error={history.error ?? grades.error}
        onRetry={() => {
          void history.refetch();
          void grades.refetch();
        }}
        isEmpty={history.isSuccess && history.data.length === 0 && gradeOptions.length === 0}
        empty={
          <div className="empty-state">
            <h2>No grades are configured</h2>
            <p>Create grades before recording grade history for this borrower.</p>
            <Link to="/grades">Go to grades</Link>
          </div>
        }
      >
        {history.isSuccess && history.data.length === 0 ? (
          <div className="empty-state">
            <h2>No grade history</h2>
            <p>
              Choose a configured grade and the dates it applies. Inactive grades are marked in the
              list.
            </p>
            <Button
              type="button"
              onClick={() => setCreating(true)}
              disabled={gradeOptions.length === 0}
            >
              Add grade history
            </Button>
          </div>
        ) : (
          <DataTable
            caption="Grade history"
            rows={history.data ?? []}
            getRowId={(record) => record.id}
            minWidth={680}
            columns={[
              {
                id: "grade",
                header: "Grade",
                cell: (record) => (
                  <span className="cluster">
                    <span>
                      {record.grade.name} <span className="mono">{record.grade.code}</span>
                    </span>
                    <ActiveBadge active={record.grade.isActive} />
                  </span>
                ),
              },
              {
                id: "from",
                header: "Effective from",
                cell: (record) => formatDateOnly(record.effectiveFrom),
              },
              {
                id: "to",
                header: "Effective to",
                cell: (record) =>
                  record.effectiveTo ? formatDateOnly(record.effectiveTo) : "Open",
              },
            ]}
          />
        )}
      </QueryState>
      {creating ? (
        <GradeHistoryDialog
          borrowerId={borrowerId}
          grades={gradeOptions}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </Panel>
  );
}

function GradeHistoryDialog({
  borrowerId,
  grades,
  onClose,
}: {
  borrowerId: string;
  grades: { id: string; code: string; name: string; isActive: boolean }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState({
    gradeId: grades.find((grade) => grade.isActive)?.id ?? grades[0]?.id ?? "",
    effectiveFrom: "",
    effectiveTo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = {
      gradeId: values.gradeId ? undefined : "Grade is required.",
      effectiveFrom: validateDate(values.effectiveFrom, true),
      effectiveTo:
        validateDate(values.effectiveTo, false) ??
        validateDateOrder(values.effectiveFrom, values.effectiveTo),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    const input: GradeHistoryInput = {
      gradeId: values.gradeId,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || null,
    };
    setBusy(true);
    setFormError(null);
    try {
      await createGradeHistory(borrowerId, input);
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.gradeHistory(borrowerId) });
      setDirty(false);
      toast.success("Grade history added.");
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, ["gradeId", "effectiveFrom", "effectiveTo"]));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Add grade history"
      description="Grades come from the grades list. Inactive grades can still be selected. This does not change existing history."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="grade-history-form"
      submitLabel="Save record"
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="grade-history-form" className="stack-sm" onSubmit={handleSubmit} noValidate>
        <FormField id="grade-history-grade" label="Grade" required error={errors.gradeId}>
          <Select
            data-autofocus
            value={values.gradeId}
            onChange={(event) => update("gradeId", event.target.value)}
          >
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.code} — {grade.name}
                {grade.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="grade-history-from"
          label="Effective from"
          required
          error={errors.effectiveFrom}
        >
          <Input
            type="date"
            value={values.effectiveFrom}
            onChange={(event) => update("effectiveFrom", event.target.value)}
          />
        </FormField>
        <FormField
          id="grade-history-to"
          label="Effective to"
          error={errors.effectiveTo}
          hint="Leave blank when the period is still open."
        >
          <Input
            type="date"
            value={values.effectiveTo}
            onChange={(event) => update("effectiveTo", event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
