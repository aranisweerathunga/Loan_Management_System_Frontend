import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { CheckField, FormField } from "@/components/FormField";
import { Input } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { createIdentifier, listIdentifiers, updateIdentifier } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import type { BorrowerIdentifier, IdentifierInput } from "@/lib/api/types";
import {
  hasFieldErrors,
  mapServerFieldErrors,
  validateRequiredText,
  validateToken,
} from "@/lib/validation";

export function IdentifiersPanel({ borrowerId }: { borrowerId: string }) {
  const identifiers = useQuery({
    queryKey: borrowerKeys.identifiers(borrowerId),
    queryFn: ({ signal }) => listIdentifiers(borrowerId, signal),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BorrowerIdentifier | null>(null);

  return (
    <Panel
      title="Identifiers"
      description="More than one identifier can be marked primary. The system does not enforce a single primary identifier."
      flush
      actions={
        <Button type="button" onClick={() => setCreating(true)}>
          Add identifier
        </Button>
      }
    >
      <QueryState
        isLoading={identifiers.isPending}
        isError={identifiers.isError && identifiers.data === undefined}
        error={identifiers.error}
        onRetry={() => void identifiers.refetch()}
        isEmpty={identifiers.isSuccess && identifiers.data.length === 0}
        empty={
          <div className="empty-state">
            <h2>No identifiers yet</h2>
            <p>Add an identifier type and value for this borrower.</p>
            <Button type="button" onClick={() => setCreating(true)}>
              Add identifier
            </Button>
          </div>
        }
      >
        <DataTable
          caption="Borrower identifiers"
          rows={identifiers.data ?? []}
          getRowId={(identifier) => identifier.id}
          minWidth={640}
          columns={[
            {
              id: "type",
              header: "Type",
              cell: (identifier) => <span className="mono">{identifier.type}</span>,
            },
            { id: "value", header: "Value", cell: (identifier) => identifier.value },
            {
              id: "primary",
              header: "Primary",
              cell: (identifier) =>
                identifier.isPrimary ? <StatusBadge tone="info">Primary</StatusBadge> : "No",
            },
            {
              id: "actions",
              header: "Actions",
              align: "end",
              cell: (identifier) => (
                <div className="cell-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(identifier)}
                  >
                    Edit
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </QueryState>
      {creating ? (
        <IdentifierDialog
          title="Add identifier"
          borrowerId={borrowerId}
          submitLabel="Save identifier"
          successMessage="Identifier added."
          onSubmit={(input) => createIdentifier(borrowerId, input)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <IdentifierDialog
          title="Edit identifier"
          borrowerId={borrowerId}
          initial={editing}
          submitLabel="Save changes"
          successMessage="Identifier updated."
          onSubmit={(input) => updateIdentifier(borrowerId, editing.id, input)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}

function IdentifierDialog({
  title,
  borrowerId,
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  borrowerId: string;
  initial?: BorrowerIdentifier;
  submitLabel: string;
  successMessage: string;
  onSubmit: (input: IdentifierInput) => Promise<unknown>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState(initial?.type ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false);
  const [errors, setErrors] = useState<Partial<Record<"type" | "value", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = {
      type: validateToken(type, "Type", 32),
      value: validateRequiredText(value, "Value", 64),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    setBusy(true);
    setFormError(null);
    try {
      await onSubmit({ type: type.trim(), value: value.trim(), isPrimary });
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.identifiers(borrowerId) });
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.detail(borrowerId) });
      setDirty(false);
      toast.success(successMessage);
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, ["type", "value", "isPrimary"]));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      description="Primary is a flag only. Saving this does not clear the flag on other identifiers."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="identifier-form"
      submitLabel={submitLabel}
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="identifier-form" className="stack-sm" onSubmit={handleSubmit} noValidate>
        <FormField
          id="identifier-type"
          label="Identifier type"
          required
          error={errors.type}
          hint="2–32 characters: letters, numbers, underscores, and hyphens."
        >
          <Input
            data-autofocus
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <FormField id="identifier-value" label="Identifier value" required error={errors.value}>
          <Input
            maxLength={64}
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <CheckField
          label="Primary identifier"
          checked={isPrimary}
          disabled={busy}
          onChange={(checked) => {
            setIsPrimary(checked);
            setDirty(true);
          }}
        />
      </form>
    </Modal>
  );
}
