import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckField, FormField } from "@/components/FormField";
import { Input, Select, Textarea } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/api/client";
import { productKeys } from "@/lib/api/keys";
import type { LoanProduct, ProductCategory, ProductInput } from "@/lib/api/types";
import {
  emptyToNull,
  hasFieldErrors,
  mapServerFieldErrors,
  validateCode,
  validateDescription,
  validateName,
} from "@/lib/validation";

export function ProductFormDialog({
  title,
  categories,
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onCreated,
  onClose,
}: {
  title: string;
  categories: ProductCategory[];
  initial?: LoanProduct;
  submitLabel: string;
  successMessage: string;
  onSubmit: (input: ProductInput) => Promise<LoanProduct>;
  onCreated?: (productId: string) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState({
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = {
      categoryId: values.categoryId ? undefined : "Category is required.",
      code: validateCode(values.code),
      name: validateName(values.name),
      description: validateDescription(values.description),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    setBusy(true);
    setFormError(null);
    try {
      const saved = await onSubmit({
        categoryId: values.categoryId,
        code: values.code.trim(),
        name: values.name.trim(),
        description: emptyToNull(values.description),
        isActive: values.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      setDirty(false);
      toast.success(successMessage);
      onCreated?.(saved.id);
      onClose();
    } catch (error) {
      setErrors(mapServerFieldErrors(error, ["categoryId", "code", "name", "description"]));
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      description="The product starts as a catalogue record. Purposes and versions are added on the product page."
      onClose={onClose}
      dirty={dirty}
      busy={busy}
      formId="product-form"
      submitLabel={submitLabel}
    >
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      <form id="product-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField
          id="product-category"
          className="is-wide"
          label="Category"
          required
          error={errors.categoryId}
        >
          <Select
            data-autofocus
            value={values.categoryId}
            onChange={(event) => update("categoryId", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="product-code" label="Code" required error={errors.code}>
          <Input
            value={values.code}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => update("code", event.target.value)}
          />
        </FormField>
        <FormField id="product-name" label="Name" required error={errors.name}>
          <Input
            value={values.name}
            maxLength={120}
            onChange={(event) => update("name", event.target.value)}
          />
        </FormField>
        <FormField
          id="product-description"
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
            hint="Clear this to deactivate the product."
            checked={values.isActive}
            disabled={busy}
            onChange={(checked) => update("isActive", checked)}
          />
        </div>
      </form>
    </Modal>
  );
}
