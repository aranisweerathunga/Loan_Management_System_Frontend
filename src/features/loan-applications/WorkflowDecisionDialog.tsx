import { useId, useState } from "react";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { canonicalPositiveMoney } from "@/lib/money";
import { validatePositiveMoney } from "@/lib/validation";

const remarksLimit = 500;

export function WorkflowDecisionDialog({
  mode,
  applicationNumber,
  busy,
  error,
  canDecide,
  onApprove,
  onReject,
  onClose,
}: {
  mode: "approve" | "reject" | null;
  applicationNumber: string;
  busy: boolean;
  error: string | null;
  canDecide: boolean;
  onApprove: (authorizedPrincipalAmount: string, remarks?: string) => void;
  onReject: (remarks: string) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attempted, setAttempted] = useState(false);
  const trimmed = remarks.trim();
  const tooLong = trimmed.length > remarksLimit;
  const missingReason = mode === "reject" && trimmed.length === 0;
  const amountError =
    mode === "approve" && attempted ? validatePositiveMoney(amount, "Authorized principal amount") : undefined;
  const remarksError = tooLong
    ? "Remarks must be at most 500 characters."
    : attempted && missingReason
      ? "Enter a rejection reason."
      : undefined;
  const dirty = amount.trim().length > 0 || trimmed.length > 0;

  function submit() {
    if (busy || mode === null || !canDecide) return;
    setAttempted(true);
    if (mode === "approve") {
      const amountMessage = validatePositiveMoney(amount, "Authorized principal amount");
      if (amountMessage || tooLong) {
        document.getElementById(amountMessage ? `${formId}-amount` : `${formId}-remarks`)?.focus();
        return;
      }
      const canonical = canonicalPositiveMoney(amount);
      if (!canonical) return;
      onApprove(canonical, trimmed.length > 0 ? trimmed : undefined);
      return;
    }
    if (tooLong || trimmed.length === 0) {
      document.getElementById(`${formId}-remarks`)?.focus();
      return;
    }
    onReject(trimmed);
  }

  return (
    <Modal
      open={mode !== null}
      size="md"
      title={mode === "reject" ? `Reject ${applicationNumber}?` : `Approve ${applicationNumber}?`}
      description={
        mode === "reject"
          ? "This records a Rejected workflow decision. The application becomes terminal in the current workflow."
          : "Enter the authorized principal for this approval. This is a human decision. It is not taken from eligibility, a requested amount, or an EPF percentage. Approval does not create a facility or disburse funds."
      }
      busy={busy}
      dirty={dirty}
      onClose={onClose}
      formId={canDecide ? formId : undefined}
      submitLabel={mode === "reject" ? "Reject application" : "Approve application"}
      submitVariant={mode === "reject" ? "danger" : "primary"}
      loadingLabel={mode === "reject" ? "Rejecting…" : "Approving…"}
      footer={
        canDecide ? undefined : (
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <form
        id={formId}
        className="stack-sm"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {mode === "approve" ? (
          <FormField
            id={`${formId}-amount`}
            label="Authorized principal amount"
            required
            hint="Formally authorized principal for the facility, in LKR. Example: 1000000.00."
            error={amountError}
          >
            <Input
              data-autofocus
              value={amount}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
        ) : null}
        <FormField
          id={`${formId}-remarks`}
          label={mode === "reject" ? "Rejection reason" : "Remarks"}
          required={mode === "reject"}
          hint={
            mode === "reject"
              ? `${trimmed.length} / ${remarksLimit} characters. Required.`
              : `${trimmed.length} / ${remarksLimit} characters. Optional.`
          }
          error={remarksError}
        >
          <Textarea
            data-autofocus={mode === "reject" ? true : undefined}
            value={remarks}
            rows={4}
            disabled={busy}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </FormField>
        {error ? (
          <p className="form-banner" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
