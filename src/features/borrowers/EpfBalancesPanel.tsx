import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input, Select } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { createEpfBalance, listEpfBalances } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import type { EmployeeProfile, EpfBalanceInput, EpfBalanceSource } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/format";
import { canonicalizeMoney, formatMoney } from "@/lib/money";
import {
  hasFieldErrors,
  mapServerFieldErrors,
  validateDate,
  validateMoney,
} from "@/lib/validation";
import { EmployeeProfileCallout } from "@/features/borrowers/EmployeeProfileCallout";

export function EpfBalancesPanel({
  borrowerId,
  borrowerName,
  profile,
}: {
  borrowerId: string;
  borrowerName: string;
  profile: EmployeeProfile | null;
}) {
  const balances = useQuery({
    queryKey: borrowerKeys.epf(borrowerId),
    queryFn: ({ signal }) => listEpfBalances(borrowerId, signal),
    enabled: profile !== null,
  });
  const [creating, setCreating] = useState(false);

  if (!profile) {
    return (
      <Panel title="EPF balances">
        <EmployeeProfileCallout borrowerId={borrowerId} profile={null} />
      </Panel>
    );
  }

  return (
    <Panel
      title="EPF balances"
      description="Listed from the newest as-of date. Amounts are stored as entered and are not used to calculate eligibility. Historical balances cannot be edited or deleted. File import is not available."
      flush
      actions={
        <Button type="button" onClick={() => setCreating(true)}>
          Add EPF balance
        </Button>
      }
    >
      <QueryState
        isLoading={balances.isPending}
        isError={balances.isError && balances.data === undefined}
        error={balances.error}
        onRetry={() => void balances.refetch()}
        isEmpty={balances.isSuccess && balances.data.length === 0}
        empty={
          <div className="empty-state">
            <h2>No EPF balances</h2>
            <p>Record a balance as of a date. Use Manual for amounts entered on this screen.</p>
            <Button type="button" onClick={() => setCreating(true)}>
              Add EPF balance
            </Button>
          </div>
        }
      >
        <DataTable
          caption="EPF balance history"
          rows={balances.data ?? []}
          getRowId={(record) => record.id}
          minWidth={560}
          columns={[
            {
              id: "asOf",
              header: "As-of date",
              cell: (record) => formatDateOnly(record.asOfDate),
            },
            {
              id: "balance",
              header: "EPF balance (LKR)",
              align: "numeric",
              cell: (record) => formatMoney(record.balance),
            },
            {
              id: "source",
              header: "Source",
              cell: (record) => (
                <StatusBadge tone="neutral">
                  {record.source === "IMPORT" ? "Import" : "Manual"}
                </StatusBadge>
              ),
            },
          ]}
        />
      </QueryState>
      {creating ? (
        <EpfDialog
          borrowerId={borrowerId}
          borrowerName={borrowerName}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </Panel>
  );
}

function EpfDialog({
  borrowerId,
  borrowerName,
  onClose,
}: {
  borrowerId: string;
  borrowerName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [asOfDate, setAsOfDate] = useState("");
  const [balance, setBalance] = useState("");
  const [source, setSource] = useState<EpfBalanceSource>("MANUAL");
  const [errors, setErrors] = useState<Partial<Record<"asOfDate" | "balance", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const canonical = canonicalizeMoney(balance);
    const nextErrors = {
      asOfDate: validateDate(asOfDate, true),
      balance: validateMoney(balance),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors) || !canonical) return;
    const input: EpfBalanceInput = {
      asOfDate,
      balance: canonical,
      source,
    };
    setBusy(true);
    setFormError(null);
    try {
      await createEpfBalance(borrowerId, input);
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.epf(borrowerId) });
      setDirty(false);
      toast.success("EPF balance added.");
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, ["asOfDate", "balance", "source"]));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Add EPF balance"
      description="The amount is saved as a decimal value. This screen does not calculate a loan amount from it."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="epf-form"
      submitLabel="Save balance"
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="epf-form" className="stack-sm" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <div className="field__label">Borrower / employee</div>
          <p>{borrowerName}</p>
        </div>
        <FormField id="epf-as-of" label="Balance as of" required error={errors.asOfDate}>
          <Input
            data-autofocus
            type="date"
            value={asOfDate}
            onChange={(event) => {
              setAsOfDate(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <FormField
          id="epf-balance"
          label="EPF balance (LKR)"
          required
          error={errors.balance}
          hint="Non-negative amount with up to 2 decimal places, such as 1500.00."
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={balance}
            onChange={(event) => {
              setBalance(event.target.value);
              setDirty(true);
            }}
          />
        </FormField>
        <FormField
          id="epf-source"
          label="Source"
          required
          hint="Manual is for amounts entered here. Import only records that source value. There is no file import."
        >
          <Select
            value={source}
            onChange={(event) => {
              setSource(event.target.value === "IMPORT" ? "IMPORT" : "MANUAL");
              setDirty(true);
            }}
          >
            <option value="MANUAL">Manual</option>
            <option value="IMPORT">Import</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
