import { useId, useState } from "react";
import { Input, Textarea } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { getErrorMessage } from "@/lib/api/client";
import { formatDateOnly, utcTodayDate } from "@/lib/format";
import { canonicalPositiveMoney, formatMoneyAmount } from "@/lib/money";
import { validateDate, validatePositiveMoney } from "@/lib/validation";

const referenceLimit = 120;
const remarksLimit = 500;

export function RecordDisbursementDialog({
  facilityNumber,
  facilityDate,
  currencyCode,
  remainingAuthorizedAmount,
  busy,
  onSubmit,
  onClose,
}: {
  facilityNumber: string;
  facilityDate: string;
  currencyCode: string;
  remainingAuthorizedAmount: string;
  busy: boolean;
  onSubmit: (input: {
    amount: string;
    disbursementDate: string;
    reference?: string;
    remarks?: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const formId = useId();
  const [amount, setAmount] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = utcTodayDate();
  const amountError = attempted
    ? validatePositiveMoney(amount, "Disbursement amount")
    : undefined;
  const dateError = attempted ? disbursementDateError(disbursementDate, facilityDate, today) : undefined;
  const referenceError =
    reference.trim().length > referenceLimit
      ? `Reference must be at most ${referenceLimit} characters.`
      : undefined;
  const remarksError =
    remarks.trim().length > remarksLimit
      ? `Remarks must be at most ${remarksLimit} characters.`
      : undefined;
  const dirty =
    amount.trim().length > 0 ||
    disbursementDate.length > 0 ||
    reference.trim().length > 0 ||
    remarks.trim().length > 0;

  async function submit() {
    if (busy) return;
    setAttempted(true);
    setError(null);
    const nextAmountError = validatePositiveMoney(amount, "Disbursement amount");
    const nextDateError = disbursementDateError(disbursementDate, facilityDate, today);
    const nextReferenceError =
      reference.trim().length > referenceLimit
        ? `Reference must be at most ${referenceLimit} characters.`
        : undefined;
    const nextRemarksError =
      remarks.trim().length > remarksLimit
        ? `Remarks must be at most ${remarksLimit} characters.`
        : undefined;
    if (nextAmountError || nextDateError || nextReferenceError || nextRemarksError) {
      const focusId = nextAmountError
        ? `${formId}-amount`
        : nextDateError
          ? `${formId}-date`
          : nextReferenceError
            ? `${formId}-reference`
            : `${formId}-remarks`;
      document.getElementById(focusId)?.focus();
      return;
    }
    const canonical = canonicalPositiveMoney(amount);
    if (!canonical) return;
    const trimmedReference = reference.trim();
    const trimmedRemarks = remarks.trim();
    try {
      await onSubmit({
        amount: canonical,
        disbursementDate,
        ...(trimmedReference ? { reference: trimmedReference } : {}),
        ...(trimmedRemarks ? { remarks: trimmedRemarks } : {}),
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  return (
    <Modal
      open
      size="md"
      title={`Record disbursement for ${facilityNumber}`}
      description="Records a disbursement against the remaining authorized amount. The server confirms the amount available at the time of recording."
      busy={busy}
      dirty={dirty}
      onClose={onClose}
      formId={formId}
      submitLabel="Record disbursement"
      loadingLabel="Recording…"
    >
      <form
        id={formId}
        className="stack-sm"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="field__hint">
          Remaining authorized amount: {formatMoneyAmount(remainingAuthorizedAmount, currencyCode)}
        </p>
        <FormField
          id={`${formId}-amount`}
          label="Amount"
          required
          hint={`Positive amount in ${currencyCode}, with up to 2 decimal places.`}
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
        <FormField
          id={`${formId}-date`}
          label="Disbursement date"
          required
          hint={`Cannot be earlier than the facility date (${formatDateOnly(facilityDate)}) or later than today (UTC).`}
          error={dateError}
        >
          <Input
            type="date"
            value={disbursementDate}
            min={facilityDate}
            max={facilityDate <= today ? today : undefined}
            disabled={busy}
            onChange={(event) => setDisbursementDate(event.target.value)}
          />
        </FormField>
        <FormField
          id={`${formId}-reference`}
          label="Reference"
          hint={`${reference.trim().length} / ${referenceLimit} characters. Optional.`}
          error={referenceError}
        >
          <Input
            value={reference}
            maxLength={referenceLimit}
            autoComplete="off"
            disabled={busy}
            onChange={(event) => setReference(event.target.value)}
          />
        </FormField>
        <FormField
          id={`${formId}-remarks`}
          label="Remarks"
          hint={`${remarks.trim().length} / ${remarksLimit} characters. Optional.`}
          error={remarksError}
        >
          <Textarea
            value={remarks}
            rows={3}
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

function disbursementDateError(value: string, facilityDate: string, today: string): string | undefined {
  const invalid = validateDate(value, true);
  if (invalid) return invalid;
  if (value < facilityDate) return "Disbursement date cannot be earlier than the facility date.";
  if (value > today) return "Disbursement date cannot be later than today (UTC).";
  return undefined;
}
