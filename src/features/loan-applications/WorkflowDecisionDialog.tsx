import { useId, useState } from "react";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";

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
  onApprove: (remarks?: string) => void;
  onReject: (remarks: string) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [remarks, setRemarks] = useState("");
  const [attempted, setAttempted] = useState(false);
  const trimmed = remarks.trim();
  const tooLong = trimmed.length > remarksLimit;
  const missingReason = mode === "reject" && trimmed.length === 0;
  const validationMessage = tooLong
    ? "Remarks must be at most 500 characters."
    : attempted && missingReason
      ? "Enter a rejection reason."
      : null;

  function submit() {
    if (busy || mode === null || !canDecide) return;
    setAttempted(true);
    if (tooLong || (mode === "reject" && trimmed.length === 0)) {
      document.getElementById(`${formId}-remarks`)?.focus();
      return;
    }
    if (mode === "approve") {
      onApprove(trimmed.length > 0 ? trimmed : undefined);
      return;
    }
    onReject(trimmed);
  }

  return (
    <Modal
      open={mode !== null}
      size="md"
      title={
        mode === "reject"
          ? `Reject ${applicationNumber}?`
          : `Approve ${applicationNumber}?`
      }
      description={
        mode === "reject"
          ? "This records a Rejected workflow decision. The application becomes terminal in the current workflow."
          : "This records an Approved workflow decision. The application becomes terminal in the current workflow. This does not create a loan facility. Eligibility records remain unchanged."
      }
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {canDecide ? (
            <Button
              type="submit"
              form={formId}
              variant={mode === "reject" ? "danger" : "primary"}
              loading={busy}
              loadingLabel={mode === "reject" ? "Rejecting…" : "Approving…"}
              disabled={busy}
            >
              {mode === "reject" ? "Reject application" : "Approve application"}
            </Button>
          ) : null}
        </>
      }
    >
      <form
        id={formId}
        className="stack-sm"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <FormField
          id={`${formId}-remarks`}
          label={mode === "reject" ? "Rejection reason" : "Remarks"}
          required={mode === "reject"}
          hint={
            mode === "reject"
              ? `${trimmed.length} / ${remarksLimit} characters. Required.`
              : `${trimmed.length} / ${remarksLimit} characters. Optional.`
          }
          error={validationMessage ?? undefined}
        >
          <Textarea
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
