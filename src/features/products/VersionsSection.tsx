import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input, Textarea } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { VersionBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/api/client";
import { productKeys } from "@/lib/api/keys";
import {
  activateVersion,
  createVersion,
  listVersions,
  retireVersion,
  updateDraftVersion,
} from "@/lib/api/products";
import type { ProductVersion, ProductVersionInput } from "@/lib/api/types";
import { formatDateOnly, formatJson } from "@/lib/format";
import {
  hasFieldErrors,
  mapServerFieldErrors,
  parseConfigurationObject,
  validateDate,
  validateDateOrder,
  validatePositiveInteger,
} from "@/lib/validation";

type VersionValues = {
  versionNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  configuration: string;
};

export function VersionsSection({ productId }: { productId: string }) {
  const versions = useQuery({
    queryKey: productKeys.versions(productId),
    queryFn: ({ signal }) => listVersions(productId, signal),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductVersion | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    action: "activate" | "retire";
    version: ProductVersion;
  } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const rows = useMemo(
    () =>
      [...(versions.data ?? [])].sort((left, right) => left.versionNumber - right.versionNumber),
    [versions.data],
  );
  const nextNumber = rows.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;

  async function runConfirm() {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      if (confirm.action === "activate") await activateVersion(productId, confirm.version.id);
      else await retireVersion(productId, confirm.version.id);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(confirm.action === "activate" ? "Version activated." : "Version retired.");
      setConfirm(null);
    } catch (error) {
      setConfirmError(getErrorMessage(error));
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <Panel
      title="Versions"
      description="New versions are created as drafts. Activating a draft does not retire any other version. Active and retired versions cannot be edited."
      flush
      actions={
        <Button type="button" onClick={() => setCreating(true)}>
          Add version
        </Button>
      }
    >
      <QueryState
        isLoading={versions.isPending}
        isError={versions.isError && versions.data === undefined}
        error={versions.error}
        onRetry={() => void versions.refetch()}
        isEmpty={versions.isSuccess && rows.length === 0}
        empty={
          <div className="empty-state">
            <h2>No versions yet</h2>
            <p>Add a draft version when this product needs configuration.</p>
            <Button type="button" onClick={() => setCreating(true)}>
              Add version
            </Button>
          </div>
        }
      >
        <DataTable
          caption="Product versions"
          rows={rows}
          getRowId={(version) => version.id}
          minWidth={760}
          renderAfterRow={(version) =>
            expandedId === version.id ? (
              <div className="stack-sm">
                {version.status !== "DRAFT" ? (
                  <p className="muted">
                    This version is immutable. Configuration is shown for reference.
                  </p>
                ) : (
                  <p className="muted">
                    Draft configuration. It is stored as JSON and is not interpreted here.
                  </p>
                )}
                <pre className="json-block">{formatJson(version.configuration)}</pre>
              </div>
            ) : null
          }
          columns={[
            {
              id: "number",
              header: "Version",
              cell: (version) => <span className="numeric">{version.versionNumber}</span>,
            },
            {
              id: "status",
              header: "Status",
              cell: (version) => <VersionBadge status={version.status} />,
            },
            {
              id: "from",
              header: "Effective from",
              cell: (version) => formatDateOnly(version.effectiveFrom),
            },
            {
              id: "to",
              header: "Effective to",
              cell: (version) =>
                version.effectiveTo ? formatDateOnly(version.effectiveTo) : "Open-ended",
            },
            {
              id: "actions",
              header: "Actions",
              align: "end",
              cell: (version) => (
                <div className="cell-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={expandedId === version.id}
                    onClick={() =>
                      setExpandedId((current) => (current === version.id ? null : version.id))
                    }
                  >
                    {expandedId === version.id ? "Hide configuration" : "View configuration"}
                  </Button>
                  {version.status === "DRAFT" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(version)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {version.status === "DRAFT" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setConfirmError(null);
                        setConfirm({ action: "activate", version });
                      }}
                    >
                      Activate
                    </Button>
                  ) : null}
                  {version.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setConfirmError(null);
                        setConfirm({ action: "retire", version });
                      }}
                    >
                      Retire
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </QueryState>
      {creating ? (
        <VersionDialog
          title="Add product version"
          productId={productId}
          initial={{
            versionNumber: String(nextNumber),
            effectiveFrom: "",
            effectiveTo: "",
            configuration: "{}",
          }}
          submitLabel="Save draft"
          successMessage="Draft version created."
          onSubmit={(input) => createVersion(productId, input)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <VersionDialog
          title={`Edit draft version ${editing.versionNumber}`}
          productId={productId}
          initial={{
            versionNumber: String(editing.versionNumber),
            effectiveFrom: editing.effectiveFrom,
            effectiveTo: editing.effectiveTo ?? "",
            configuration: formatJson(editing.configuration),
          }}
          submitLabel="Save changes"
          successMessage="Draft version updated."
          onSubmit={(input) => updateDraftVersion(productId, editing.id, input)}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === "retire" ? "Retire this version?" : "Activate this version?"}
        description={
          confirm?.action === "retire"
            ? "This version will be marked Retired and can no longer be edited. No other version is changed."
            : "This draft will be marked Active and can no longer be edited. Other versions are left unchanged."
        }
        confirmLabel={confirm?.action === "retire" ? "Retire version" : "Activate version"}
        tone={confirm?.action === "retire" ? "danger" : "primary"}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={() => void runConfirm()}
        onClose={() => {
          if (confirmBusy) return;
          setConfirm(null);
        }}
      />
    </Panel>
  );
}

function VersionDialog({
  title,
  productId,
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  productId: string;
  initial: VersionValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: (input: ProductVersionInput) => Promise<unknown>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof VersionValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof VersionValues>(key: K, value: VersionValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const configuration = parseConfigurationObject(values.configuration);
    const nextErrors: Partial<Record<keyof VersionValues, string>> = {
      versionNumber: validatePositiveInteger(values.versionNumber),
      effectiveFrom: validateDate(values.effectiveFrom, true),
      effectiveTo:
        validateDate(values.effectiveTo, false) ??
        validateDateOrder(values.effectiveFrom, values.effectiveTo),
      configuration: configuration.ok ? undefined : configuration.message,
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors) || !configuration.ok) return;
    setBusy(true);
    setFormError(null);
    try {
      await onSubmit({
        versionNumber: Number(values.versionNumber.trim()),
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || null,
        configuration: configuration.value,
      });
      await queryClient.invalidateQueries({ queryKey: productKeys.versions(productId) });
      await queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      setDirty(false);
      toast.success(successMessage);
      onClose();
    } catch (error) {
      setErrors(
        mapServerFieldErrors(error, [
          "versionNumber",
          "effectiveFrom",
          "effectiveTo",
          "configuration",
        ]),
      );
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      size="lg"
      description="Configuration is version JSON. This screen does not turn it into loan rules. Creation always starts as Draft."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="version-form"
      submitLabel={submitLabel}
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="version-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField
          id="version-number"
          label="Version number"
          required
          error={errors.versionNumber}
          hint="Suggested from versions already stored. Change it if this draft should use another number."
        >
          <Input
            data-autofocus
            inputMode="numeric"
            value={values.versionNumber}
            onChange={(event) => update("versionNumber", event.target.value)}
          />
        </FormField>
        <FormField id="version-from" label="Effective from" required error={errors.effectiveFrom}>
          <Input
            type="date"
            value={values.effectiveFrom}
            onChange={(event) => update("effectiveFrom", event.target.value)}
          />
        </FormField>
        <FormField
          id="version-to"
          label="Effective to"
          error={errors.effectiveTo}
          hint="Leave blank when the version has no end date."
        >
          <Input
            type="date"
            value={values.effectiveTo}
            onChange={(event) => update("effectiveTo", event.target.value)}
          />
        </FormField>
        <FormField
          id="version-configuration"
          className="is-wide"
          label="Configuration JSON"
          required
          error={errors.configuration}
          hint="Must be a JSON object. Use {} when there is nothing to store yet."
        >
          <Textarea
            className="field-control--mono"
            rows={12}
            spellCheck={false}
            value={values.configuration}
            onChange={(event) => update("configuration", event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
