import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckField, FormField } from "@/components/FormField";
import { Input, Textarea } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/api/client";
import type { CodedRecordInput } from "@/lib/api/types";
import {
  emptyToNull,
  hasFieldErrors,
  mapServerFieldErrors,
  validateCode,
  validateDescription,
  validateName,
} from "@/lib/validation";

export type CodedRecordValues = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

export const emptyCodedRecord: CodedRecordValues = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};

const fields = ["code", "name", "description", "isActive"] as const;

function validate(values: CodedRecordValues) {
  return {
    code: validateCode(values.code),
    name: validateName(values.name),
    description: validateDescription(values.description),
  };
}

export function CodedRecordDialog({
  open,
  title,
  description,
  initial,
  activeHint,
  submitLabel,
  invalidateKey,
  successMessage,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  initial: CodedRecordValues;
  activeHint: string;
  submitLabel: string;
  invalidateKey: readonly unknown[];
  successMessage: string;
  onSubmit: (input: CodedRecordInput) => Promise<void>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<(typeof fields)[number], string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof CodedRecordValues>(key: K, value: CodedRecordValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    setBusy(true);
    setFormError(null);
    try {
      await onSubmit({
        code: values.code.trim(),
        name: values.name.trim(),
        description: emptyToNull(values.description),
        isActive: values.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: invalidateKey });
      setDirty(false);
      toast.success(successMessage);
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, fields));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      dirty={dirty}
      busy={busy}
      formId="coded-record-form"
      submitLabel={submitLabel}
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="coded-record-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField id="record-code" label="Code" required error={errors.code}>
          <Input
            data-autofocus
            value={values.code}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => update("code", event.target.value)}
          />
        </FormField>
        <FormField id="record-name" label="Name" required error={errors.name}>
          <Input
            value={values.name}
            maxLength={120}
            onChange={(event) => update("name", event.target.value)}
          />
        </FormField>
        <FormField
          id="record-description"
          className="is-wide"
          label="Description"
          error={errors.description}
          hint="Optional. Up to 500 characters."
        >
          <Textarea
            value={values.description}
            maxLength={500}
            onChange={(event) => update("description", event.target.value)}
          />
        </FormField>
        <div className="is-wide">
          <CheckField
            label="Active"
            hint={activeHint}
            checked={values.isActive}
            disabled={busy}
            onChange={(checked) => update("isActive", checked)}
          />
        </div>
      </form>
    </Modal>
  );
}
