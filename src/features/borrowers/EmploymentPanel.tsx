import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { useToast } from "@/components/Toast";
import { createEmploymentHistory, listEmploymentHistory } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import type { EmployeeProfile, EmploymentHistoryInput } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/format";
import {
  hasFieldErrors,
  mapServerFieldErrors,
  validateDate,
  validateDateOrder,
  validateToken,
} from "@/lib/validation";
import { EmployeeProfileCallout } from "@/features/borrowers/EmployeeProfileCallout";

export function EmploymentPanel({
  borrowerId,
  profile,
}: {
  borrowerId: string;
  profile: EmployeeProfile | null;
}) {
  const history = useQuery({
    queryKey: borrowerKeys.employment(borrowerId),
    queryFn: ({ signal }) => listEmploymentHistory(borrowerId, signal),
    enabled: profile !== null,
  });
  const [creating, setCreating] = useState(false);

  if (!profile) {
    return (
      <Panel title="Employment">
        <EmployeeProfileCallout borrowerId={borrowerId} profile={null} />
      </Panel>
    );
  }

  return (
    <Panel
      title="Employment history"
      description="Listed from the earliest effective date. Adding a record does not change earlier periods, and overlapping dates are not checked. Records cannot be edited or deleted."
      flush
      actions={
        <Button type="button" onClick={() => setCreating(true)}>
          Add employment record
        </Button>
      }
    >
      <QueryState
        isLoading={history.isPending}
        isError={history.isError && history.data === undefined}
        error={history.error}
        onRetry={() => void history.refetch()}
        isEmpty={history.isSuccess && history.data.length === 0}
        empty={
          <div className="empty-state">
            <h2>No employment history</h2>
            <p>Add a status and the dates it applies.</p>
            <Button type="button" onClick={() => setCreating(true)}>
              Add employment record
            </Button>
          </div>
        }
      >
        <DataTable
          caption="Employment history"
          rows={history.data ?? []}
          getRowId={(record) => record.id}
          minWidth={560}
          columns={[
            {
              id: "status",
              header: "Status",
              cell: (record) => <span className="mono">{record.status}</span>,
            },
            {
              id: "from",
              header: "Effective from",
              cell: (record) => formatDateOnly(record.effectiveFrom),
            },
            {
              id: "to",
              header: "Effective to",
              cell: (record) => (record.effectiveTo ? formatDateOnly(record.effectiveTo) : "Open"),
            },
          ]}
        />
      </QueryState>
      {creating ? (
        <EmploymentDialog borrowerId={borrowerId} onClose={() => setCreating(false)} />
      ) : null}
    </Panel>
  );
}

function EmploymentDialog({ borrowerId, onClose }: { borrowerId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState({ status: "", effectiveFrom: "", effectiveTo: "" });
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
      status: validateToken(values.status, "Status", 32),
      effectiveFrom: validateDate(values.effectiveFrom, true),
      effectiveTo:
        validateDate(values.effectiveTo, false) ??
        validateDateOrder(values.effectiveFrom, values.effectiveTo),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    const input: EmploymentHistoryInput = {
      status: values.status.trim(),
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || null,
    };
    setBusy(true);
    setFormError(null);
    try {
      await createEmploymentHistory(borrowerId, input);
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.employment(borrowerId) });
      setDirty(false);
      toast.success("Employment record added.");
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, ["status", "effectiveFrom", "effectiveTo"]));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Add employment record"
      description="This adds a new history row. It does not close or replace an existing period."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="employment-form"
      submitLabel="Save record"
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="employment-form" className="stack-sm" onSubmit={handleSubmit} noValidate>
        <FormField
          id="employment-status"
          label="Status"
          required
          error={errors.status}
          hint="2–32 characters: letters, numbers, underscores, and hyphens."
        >
          <Input
            data-autofocus
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            value={values.status}
            onChange={(event) => update("status", event.target.value)}
          />
        </FormField>
        <FormField
          id="employment-from"
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
          id="employment-to"
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
