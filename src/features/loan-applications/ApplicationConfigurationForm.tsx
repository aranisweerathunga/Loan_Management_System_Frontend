import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useBlocker } from "react-router-dom";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { borrowerKeys, productKeys } from "@/lib/api/keys";
import { listBorrowers } from "@/lib/api/borrowers";
import { listProducts, listPurposes, listVersions } from "@/lib/api/products";
import type {
  LoanApplicationBorrowerSummary,
  LoanApplicationProductSummary,
  LoanApplicationPurposeSummary,
  LoanApplicationVersionSummary,
  LoanApplicationWriteInput,
  ProductPurpose,
  ProductVersion,
  ProductVersionStatus,
} from "@/lib/api/types";
import { fullName } from "@/lib/format";
import { hasFieldErrors, mapServerFieldErrors } from "@/lib/validation";
import { versionChoiceLabel } from "@/features/loan-applications/presentation";

export type ApplicationFormValues = {
  borrowerId: string;
  loanProductId: string;
  productVersionId: string;
  productPurposeId: string;
};

type CurrentSelection = {
  borrower: LoanApplicationBorrowerSummary;
  loanProduct: LoanApplicationProductSummary;
  productVersion: LoanApplicationVersionSummary;
  productPurpose: LoanApplicationPurposeSummary | null;
};

type VersionChoice = {
  id: string;
  versionNumber: number;
  status: ProductVersionStatus;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

type PurposeChoice = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type FieldKey = keyof ApplicationFormValues;

const emptyValues: ApplicationFormValues = {
  borrowerId: "",
  loanProductId: "",
  productVersionId: "",
  productPurposeId: "",
};

function sameValues(left: ApplicationFormValues, right: ApplicationFormValues): boolean {
  return (
    left.borrowerId === right.borrowerId &&
    left.loanProductId === right.loanProductId &&
    left.productVersionId === right.productVersionId &&
    left.productPurposeId === right.productPurposeId
  );
}

function inactiveSuffix(active: boolean): string {
  return active ? "" : " (inactive)";
}

function inferFieldError(error: unknown): Partial<Record<FieldKey, string>> {
  if (!(error instanceof ApiError)) return {};
  const message = error.message.toLowerCase();
  if (message.includes("borrower")) return { borrowerId: error.message };
  if (message.includes("purpose")) return { productPurposeId: error.message };
  if (message.includes("version")) return { productVersionId: error.message };
  if (message.includes("product")) return { loanProductId: error.message };
  return {};
}

export function ApplicationConfigurationForm({
  formId,
  initial = emptyValues,
  current,
  submitLabel,
  submittingLabel,
  requireChanges = false,
  onSubmit,
  onComplete,
  onCancel,
}: {
  formId: string;
  initial?: ApplicationFormValues;
  current?: CurrentSelection;
  submitLabel: string;
  submittingLabel: string;
  requireChanges?: boolean;
  onSubmit: (input: LoanApplicationWriteInput) => Promise<void>;
  onComplete?: () => void;
  onCancel: () => void;
}) {
  const [baseline] = useState(initial);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const allowLeave = useRef(false);
  const dirty = !sameValues(values, baseline);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeave.current && dirty && !busy && currentLocation.pathname !== nextLocation.pathname,
  );

  const borrowers = useQuery({
    queryKey: borrowerKeys.all,
    queryFn: ({ signal }) => listBorrowers(signal),
  });
  const products = useQuery({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => listProducts(undefined, signal),
  });
  const versions = useQuery({
    queryKey: productKeys.versions(values.loanProductId),
    queryFn: ({ signal }) => listVersions(values.loanProductId, signal),
    enabled: values.loanProductId.length > 0,
  });
  const purposes = useQuery({
    queryKey: productKeys.purposes(values.loanProductId),
    queryFn: ({ signal }) => listPurposes(values.loanProductId, signal),
    enabled: values.loanProductId.length > 0,
  });

  const borrowerOptions = mergePeople(borrowers.data ?? [], current, values.borrowerId);
  const productOptions = mergeProducts(products.data ?? [], current, values.loanProductId);
  const versionOptions = mergeVersions(versions.data ?? [], current, values);
  const purposeOptions = mergePurposes(purposes.data ?? [], current, values);
  const activeBorrowerCount = (borrowers.data ?? []).filter((borrower) => borrower.isActive).length;
  const activeProductCount = (products.data ?? []).filter((product) => product.isActive).length;
  const referencesPending =
    borrowers.isPending ||
    products.isPending ||
    (values.loanProductId.length > 0 && (versions.isPending || purposes.isPending));
  const referencesFailed =
    borrowers.isError ||
    products.isError ||
    (values.loanProductId.length > 0 && (versions.isError || purposes.isError));

  const ids = {
    borrowerId: `${formId}-borrower`,
    loanProductId: `${formId}-product`,
    productVersionId: `${formId}-version`,
    productPurposeId: `${formId}-purpose`,
  } as const;

  function update(patch: Partial<ApplicationFormValues>) {
    setValues((currentValues) => ({ ...currentValues, ...patch }));
    setFormError(null);
    setNotice(null);
    setErrors((currentErrors) => {
      const next = { ...currentErrors };
      for (const key of Object.keys(patch) as FieldKey[]) delete next[key];
      return next;
    });
  }

  function validate(): Partial<Record<FieldKey, string>> {
    const next: Partial<Record<FieldKey, string>> = {};
    if (borrowers.isPending) next.borrowerId = "Borrowers are still loading.";
    else if (borrowers.isError) next.borrowerId = "Borrowers could not be loaded.";
    else if (!values.borrowerId) next.borrowerId = "Borrower is required.";
    else {
      const borrower = borrowerOptions.find((item) => item.id === values.borrowerId);
      if (!borrower) next.borrowerId = "Select a borrower.";
      else if (!borrower.isActive) next.borrowerId = "Select an active borrower.";
    }

    if (products.isPending) next.loanProductId = "Loan products are still loading.";
    else if (products.isError) next.loanProductId = "Loan products could not be loaded.";
    else if (!values.loanProductId) next.loanProductId = "Loan product is required.";
    else {
      const product = productOptions.find((item) => item.id === values.loanProductId);
      if (!product) next.loanProductId = "Select a loan product.";
      else if (!product.isActive) next.loanProductId = "Select an active loan product.";
    }

    if (!values.loanProductId) {
      next.productVersionId = "Select a loan product before choosing a version.";
    } else if (versions.isPending) {
      next.productVersionId = "Product versions are still loading.";
    } else if (versions.isError) {
      next.productVersionId = "Product versions could not be loaded.";
    } else if (!values.productVersionId) {
      next.productVersionId = "Product version is required.";
    } else {
      const version = versionOptions.find((item) => item.id === values.productVersionId);
      if (!version) next.productVersionId = "Select a version for this loan product.";
      else if (version.status !== "ACTIVE") {
        next.productVersionId = "Select an active product version.";
      }
    }

    if (values.loanProductId && purposes.isPending) {
      next.productPurposeId = "Product purposes are still loading.";
    } else if (values.loanProductId && purposes.isError) {
      next.productPurposeId = "Product purposes could not be loaded.";
    } else if (values.productPurposeId) {
      const purpose = purposeOptions.find((item) => item.id === values.productPurposeId);
      if (!purpose) {
        next.productPurposeId = "Select a purpose for this loan product, or leave it empty.";
      } else if (!purpose.isActive) {
        next.productPurposeId = "Select an active purpose, or leave the purpose empty.";
      }
    }

    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (requireChanges && !dirty) {
      setNotice("There are no changes to save.");
      setFormError(null);
      return;
    }
    const nextErrors = validate();
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) {
      const first = (Object.keys(ids) as FieldKey[]).find((key) => nextErrors[key]);
      if (first) {
        requestAnimationFrame(() => document.getElementById(ids[first])?.focus());
      }
      return;
    }

    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await onSubmit({
        borrowerId: values.borrowerId,
        loanProductId: values.loanProductId,
        productVersionId: values.productVersionId,
        productPurposeId: values.productPurposeId || null,
      });
      allowLeave.current = true;
      setBusy(false);
      onComplete?.();
    } catch (error) {
      const fieldErrors = {
        ...inferFieldError(error),
        ...mapServerFieldErrors(error, [
          "borrowerId",
          "loanProductId",
          "productVersionId",
          "productPurposeId",
        ]),
      };
      setErrors(fieldErrors);
      setFormError(getErrorMessage(error));
      setBusy(false);
      const first = (Object.keys(ids) as FieldKey[]).find((key) => fieldErrors[key]);
      if (first) {
        requestAnimationFrame(() => document.getElementById(ids[first])?.focus());
      }
    }
  }

  function requestCancel() {
    if (busy) return;
    if (dirty) {
      setAskDiscard(true);
      return;
    }
    onCancel();
  }

  function confirmLeave() {
    if (blocker.state === "blocked") {
      allowLeave.current = true;
      blocker.proceed();
      return;
    }
    allowLeave.current = true;
    setAskDiscard(false);
    onCancel();
  }

  function stay() {
    setAskDiscard(false);
    if (blocker.state === "blocked") blocker.reset();
  }

  const versionHint = !values.loanProductId
    ? "Select a loan product first."
    : versions.isPending
      ? "Loading versions for the selected product."
      : versionOptions.every((version) => version.status !== "ACTIVE")
        ? "No active version is available for this product."
        : "Required. Choose the version that will stay with this application.";

  const purposeHint = !values.loanProductId
    ? "Select a loan product first."
    : purposes.isPending
      ? "Loading purposes for the selected product."
      : purposeOptions.filter((purpose) => purpose.isActive).length === 0
        ? "Optional. This product has no active purpose."
        : "Optional.";

  return (
    <>
      {borrowers.isError || products.isError ? (
        <div className="form-banner" role="alert">
          <p>{getErrorMessage(borrowers.error ?? products.error)}</p>
          <div className="cluster">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void borrowers.refetch();
                void products.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : null}
      {formError ? (
        <p className="form-banner" role="alert">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p className="callout" role="status">
          {notice}
        </p>
      ) : null}
      {borrowers.isSuccess && activeBorrowerCount === 0 ? (
        <p className="callout">
          An active borrower is required. <Link to="/borrowers">Go to borrowers</Link>
        </p>
      ) : null}
      {products.isSuccess && activeProductCount === 0 ? (
        <p className="callout">
          An active loan product is required. <Link to="/products">Go to loan products</Link>
        </p>
      ) : null}
      <form id={formId} className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormField
          id={ids.borrowerId}
          label="Borrower"
          required
          error={errors.borrowerId}
          hint="Only an active borrower can be saved on an application."
        >
          <Select
            value={values.borrowerId}
            disabled={busy || borrowers.isPending}
            onChange={(event) => update({ borrowerId: event.target.value })}
          >
            <option value="">
              {borrowers.isPending ? "Loading borrowers…" : "Select a borrower"}
            </option>
            {borrowerOptions.map((borrower) => (
              <option key={borrower.id} value={borrower.id}>
                {fullName(borrower)}
                {inactiveSuffix(borrower.isActive)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id={ids.loanProductId}
          label="Loan product"
          required
          error={errors.loanProductId}
          hint="Only an active loan product can be saved on an application."
        >
          <Select
            value={values.loanProductId}
            disabled={busy || products.isPending}
            onChange={(event) =>
              update({
                loanProductId: event.target.value,
                productVersionId: "",
                productPurposeId: "",
              })
            }
          >
            <option value="">
              {products.isPending ? "Loading products…" : "Select a loan product"}
            </option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code}){inactiveSuffix(product.isActive)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id={ids.productVersionId}
          label="Product version"
          required
          error={
            errors.productVersionId ??
            (versions.isError ? "Product versions could not be loaded." : undefined)
          }
          hint={versionHint}
        >
          <Select
            value={values.productVersionId}
            disabled={busy || !values.loanProductId || versions.isPending}
            onChange={(event) => update({ productVersionId: event.target.value })}
          >
            <option value="">
              {!values.loanProductId
                ? "Select a loan product first"
                : versions.isPending
                  ? "Loading versions…"
                  : "Select a version"}
            </option>
            {versionOptions.map((version) => (
              <option key={version.id} value={version.id}>
                {versionChoiceLabel(version)}
                {version.status === "ACTIVE" ? "" : " · not available"}
              </option>
            ))}
          </Select>
        </FormField>
        {values.loanProductId && versions.isError ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void versions.refetch()}>
            Retry versions
          </Button>
        ) : null}
        <FormField
          id={ids.productPurposeId}
          label="Purpose"
          error={
            errors.productPurposeId ??
            (purposes.isError ? "Product purposes could not be loaded." : undefined)
          }
          hint={purposeHint}
        >
          <Select
            value={values.productPurposeId}
            disabled={busy || !values.loanProductId || purposes.isPending}
            onChange={(event) => update({ productPurposeId: event.target.value })}
          >
            <option value="">
              {!values.loanProductId
                ? "Select a loan product first"
                : purposes.isPending
                  ? "Loading purposes…"
                  : "No purpose"}
            </option>
            {purposeOptions.map((purpose) => (
              <option key={purpose.id} value={purpose.id}>
                {purpose.name} ({purpose.code}){inactiveSuffix(purpose.isActive)}
              </option>
            ))}
          </Select>
        </FormField>
        {values.loanProductId && purposes.isError ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void purposes.refetch()}>
            Retry purposes
          </Button>
        ) : null}
        <div className="cluster">
          <Button
            type="submit"
            loading={busy}
            loadingLabel={submittingLabel}
            disabled={busy || referencesPending || referencesFailed}
          >
            {submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={requestCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={askDiscard || blocker.state === "blocked"}
        title="Discard unsaved changes?"
        description="The information in this form has not been saved."
        confirmLabel="Discard changes"
        tone="danger"
        onConfirm={confirmLeave}
        onClose={stay}
      />
    </>
  );
}

function mergePeople(
  borrowers: LoanApplicationBorrowerSummary[],
  current: CurrentSelection | undefined,
  selectedId: string,
): LoanApplicationBorrowerSummary[] {
  const active = borrowers
    .filter((borrower) => borrower.isActive)
    .sort((left, right) => fullName(left).localeCompare(fullName(right)));
  if (!current || current.borrower.id !== selectedId || current.borrower.isActive) return active;
  if (active.some((borrower) => borrower.id === current.borrower.id)) return active;
  return [current.borrower, ...active];
}

function mergeProducts(
  products: LoanApplicationProductSummary[],
  current: CurrentSelection | undefined,
  selectedId: string,
): LoanApplicationProductSummary[] {
  const active = products
    .filter((product) => product.isActive)
    .sort((left, right) => left.name.localeCompare(right.name));
  if (!current || current.loanProduct.id !== selectedId || current.loanProduct.isActive) {
    return active;
  }
  if (active.some((product) => product.id === current.loanProduct.id)) return active;
  return [current.loanProduct, ...active];
}

function mergeVersions(
  versions: ProductVersion[],
  current: CurrentSelection | undefined,
  values: ApplicationFormValues,
): VersionChoice[] {
  const active: VersionChoice[] = versions
    .filter((version) => version.status === "ACTIVE")
    .sort((left, right) => left.versionNumber - right.versionNumber)
    .map(toVersionChoice);
  const sameProduct = current && current.loanProduct.id === values.loanProductId;
  if (!sameProduct || !current) return active;
  if (values.productVersionId !== current.productVersion.id) return active;
  if (active.some((version) => version.id === current.productVersion.id)) return active;
  const fromList = versions.find((version) => version.id === current.productVersion.id);
  const currentChoice = fromList
    ? toVersionChoice(fromList)
    : {
        id: current.productVersion.id,
        versionNumber: current.productVersion.versionNumber,
        status: current.productVersion.status,
      };
  return [currentChoice, ...active];
}

function mergePurposes(
  purposes: ProductPurpose[],
  current: CurrentSelection | undefined,
  values: ApplicationFormValues,
): PurposeChoice[] {
  const active = purposes
    .filter((purpose) => purpose.isActive)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(toPurposeChoice);
  const sameProduct = current && current.loanProduct.id === values.loanProductId;
  if (!sameProduct || !current?.productPurpose) return active;
  if (values.productPurposeId !== current.productPurpose.id) return active;
  if (active.some((purpose) => purpose.id === current.productPurpose?.id)) return active;
  return [current.productPurpose, ...active];
}

function toVersionChoice(version: ProductVersion): VersionChoice {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    effectiveFrom: version.effectiveFrom,
    effectiveTo: version.effectiveTo,
  };
}

function toPurposeChoice(purpose: ProductPurpose): PurposeChoice {
  return {
    id: purpose.id,
    code: purpose.code,
    name: purpose.name,
    isActive: purpose.isActive,
  };
}
