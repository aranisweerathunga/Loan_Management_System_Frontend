import { useId, useState } from "react";
import { Input } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { getErrorMessage } from "@/lib/api/client";
import { validateDate } from "@/lib/validation";

export function CreateFacilityDialog({
  applicationNumber,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  applicationNumber: string;
  busy: boolean;
  error: string | null;
  onSubmit: (facilityDate: string) => Promise<void>;
  onClose: () => void;
}) {
  const formId = useId();
  const [facilityDate, setFacilityDate] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dateError = attempted ? validateDate(facilityDate, true) : undefined;

  async function submit() {
    if (busy) return;
    setAttempted(true);
    setLocalError(null);
    if (validateDate(facilityDate, true)) {
      document.getElementById(`${formId}-date`)?.focus();
      return;
    }
    try {
      await onSubmit(facilityDate);
    } catch (submitError) {
      setLocalError(getErrorMessage(submitError));
    }
  }

  return (
    <Modal
      open
      size="md"
      title={`Create facility for ${applicationNumber}`}
      description="Creates a facility from this approved application. The authorized principal comes from the approval. Creating the facility does not disburse funds."
      busy={busy}
      dirty={facilityDate.length > 0}
      onClose={onClose}
      formId={formId}
      submitLabel="Create facility"
      loadingLabel="Creating…"
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
        <FormField id={`${formId}-date`} label="Facility date" required error={dateError}>
          <Input
            data-autofocus
            type="date"
            value={facilityDate}
            disabled={busy}
            onChange={(event) => setFacilityDate(event.target.value)}
          />
        </FormField>
        <FormField
          id={`${formId}-currency`}
          label="Currency"
          hint="LKR is the only currency supported for a facility."
        >
          <Input value="LKR" readOnly />
        </FormField>
        {localError || error ? (
          <p className="form-banner" role="alert">
            {localError || error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
