import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckField, FormField } from "@/components/FormField";
import { Input } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { createBorrower, updateBorrower } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import type { Borrower, BorrowerInput } from "@/lib/api/types";
import {
  emptyToNull,
  hasFieldErrors,
  mapServerFieldErrors,
  validateDate,
  validateName,
  validateOptionalEmail,
  validateOptionalPhone,
} from "@/lib/validation";

type Values = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const fieldNames = [
  "firstName",
  "middleName",
  "lastName",
  "dateOfBirth",
  "email",
  "phone",
] as const;

function fromBorrower(borrower?: Borrower): Values {
  return {
    firstName: borrower?.firstName ?? "",
    middleName: borrower?.middleName ?? "",
    lastName: borrower?.lastName ?? "",
    dateOfBirth: borrower?.dateOfBirth ?? "",
    email: borrower?.email ?? "",
    phone: borrower?.phone ?? "",
    isActive: borrower?.isActive ?? true,
  };
}

export function BorrowerFormModal({
  borrower,
  onCreated,
  onClose,
}: {
  borrower?: Borrower;
  onCreated?: (borrowerId: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState(() => fromBorrower(borrower));
  const [errors, setErrors] = useState<Partial<Record<(typeof fieldNames)[number], string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = {
      firstName: validateName(values.firstName, "First name"),
      middleName:
        values.middleName.trim().length > 120
          ? "Middle name must be at most 120 characters."
          : undefined,
      lastName: validateName(values.lastName, "Last name"),
      dateOfBirth: validateDate(values.dateOfBirth, false),
      email: validateOptionalEmail(values.email),
      phone: validateOptionalPhone(values.phone),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const input: BorrowerInput = {
      firstName: values.firstName.trim(),
      middleName: emptyToNull(values.middleName),
      lastName: values.lastName.trim(),
      dateOfBirth: emptyToNull(values.dateOfBirth),
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      isActive: values.isActive,
    };

    setBusy(true);
    setFormError(null);
    try {
      const saved = borrower
        ? await updateBorrower(borrower.id, input)
        : await createBorrower(input);
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.all });
      setDirty(false);
      toast.success(borrower ? "Borrower updated." : "Borrower created.");
      onCreated?.(saved.id);
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, fieldNames));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={borrower ? "Edit borrower" : "Add borrower"}
      description="Only the fields stored for a borrower are collected here."
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      formId="borrower-form"
      submitLabel={borrower ? "Save changes" : "Save borrower"}
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="borrower-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField id="borrower-first-name" label="First name" required error={errors.firstName}>
          <Input
            data-autofocus
            autoComplete="given-name"
            maxLength={120}
            value={values.firstName}
            onChange={(event) => update("firstName", event.target.value)}
          />
        </FormField>
        <FormField
          id="borrower-middle-name"
          label="Middle name"
          error={errors.middleName}
          hint="Optional."
        >
          <Input
            autoComplete="additional-name"
            maxLength={120}
            value={values.middleName}
            onChange={(event) => update("middleName", event.target.value)}
          />
        </FormField>
        <FormField id="borrower-last-name" label="Last name" required error={errors.lastName}>
          <Input
            autoComplete="family-name"
            maxLength={120}
            value={values.lastName}
            onChange={(event) => update("lastName", event.target.value)}
          />
        </FormField>
        <FormField
          id="borrower-dob"
          label="Date of birth"
          error={errors.dateOfBirth}
          hint="Optional."
        >
          <Input
            type="date"
            autoComplete="bday"
            value={values.dateOfBirth}
            onChange={(event) => update("dateOfBirth", event.target.value)}
          />
        </FormField>
        <FormField id="borrower-email" label="Email" error={errors.email} hint="Optional.">
          <Input
            type="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </FormField>
        <FormField id="borrower-phone" label="Phone" error={errors.phone} hint="Optional.">
          <Input
            type="tel"
            autoComplete="tel"
            maxLength={32}
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </FormField>
        <div className="is-wide">
          <CheckField
            label="Active"
            hint="Clear this to mark the borrower inactive."
            checked={values.isActive}
            disabled={busy}
            onChange={(checked) => update("isActive", checked)}
          />
        </div>
      </form>
    </Modal>
  );
}
