import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { Select } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { PageHeader, Panel } from "@/components/PageHeader";
import { EmptyState, QueryState } from "@/components/QueryState";
import { FacilityStatusBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { listBorrowers } from "@/lib/api/borrowers";
import { borrowerKeys, loanFacilityKeys, productKeys } from "@/lib/api/keys";
import { listLoanFacilities } from "@/lib/api/loan-facilities";
import { listProducts } from "@/lib/api/products";
import type { LoanFacilityListFilters, LoanFacilityStatus } from "@/lib/api/types";
import { formatDateOnly, fullName } from "@/lib/format";
import { formatMoneyAmount } from "@/lib/money";

const statuses: { value: LoanFacilityStatus; label: string }[] = [
  { value: "PENDING_DISBURSEMENT", label: "Pending Disbursement" },
  { value: "ACTIVE", label: "Active" },
];

export function LoanFacilitiesPage() {
  usePageMeta("Loan Facilities", [
    { label: "Loan Management" },
    { label: "Loan Facilities" },
  ]);
  const [status, setStatus] = useState<"" | LoanFacilityStatus>("");
  const [borrowerId, setBorrowerId] = useState("");
  const [loanProductId, setLoanProductId] = useState("");
  const filters = useMemo<LoanFacilityListFilters>(
    () => ({
      status: status || undefined,
      borrowerId: borrowerId || undefined,
      loanProductId: loanProductId || undefined,
    }),
    [borrowerId, loanProductId, status],
  );
  const filtersActive = Boolean(status || borrowerId || loanProductId);
  const facilities = useQuery({
    queryKey: loanFacilityKeys.list(filters),
    queryFn: ({ signal }) => listLoanFacilities(filters, signal),
    placeholderData: keepPreviousData,
  });
  const borrowers = useQuery({
    queryKey: borrowerKeys.all,
    queryFn: ({ signal }) => listBorrowers(signal),
  });
  const products = useQuery({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => listProducts(undefined, signal),
  });
  const borrowerNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const borrower of borrowers.data ?? []) names.set(borrower.id, fullName(borrower));
    return names;
  }, [borrowers.data]);
  const productNames = useMemo(() => {
    const names = new Map<string, { name: string; code: string }>();
    for (const product of products.data ?? []) {
      names.set(product.id, { name: product.name, code: product.code });
    }
    return names;
  }, [products.data]);
  const borrowerOptions = useMemo(
    () =>
      [...(borrowers.data ?? [])].sort((left, right) =>
        fullName(left).localeCompare(fullName(right)),
      ),
    [borrowers.data],
  );
  const productOptions = useMemo(
    () => [...(products.data ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [products.data],
  );
  const settled = facilities.isSuccess && !facilities.isPlaceholderData;
  const noFacilities = settled && !filtersActive && facilities.data.length === 0;
  const noMatches = settled && filtersActive && facilities.data.length === 0;

  function clearFilters() {
    setStatus("");
    setBorrowerId("");
    setLoanProductId("");
  }

  return (
    <div className="stack">
      <PageHeader
        title="Loan Facilities"
        description="Facilities are created from approved loan applications. Amounts shown are the values returned for each facility."
      />
      <div className="filters">
        <FormField id="facility-status-filter" className="field--narrow" label="Status">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | LoanFacilityStatus)}
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="facility-borrower-filter" label="Borrower">
          <Select
            value={borrowerId}
            disabled={borrowers.isPending || borrowers.isError}
            onChange={(event) => setBorrowerId(event.target.value)}
          >
            <option value="">{borrowers.isPending ? "Loading borrowers…" : "All borrowers"}</option>
            {borrowerOptions.map((borrower) => (
              <option key={borrower.id} value={borrower.id}>
                {fullName(borrower)}
                {borrower.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="facility-product-filter" label="Loan product">
          <Select
            value={loanProductId}
            disabled={products.isPending || products.isError}
            onChange={(event) => setLoanProductId(event.target.value)}
          >
            <option value="">{products.isPending ? "Loading products…" : "All loan products"}</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code}){product.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>
        {filtersActive ? (
          <div className="filters__clear">
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {settled
          ? `${facilities.data.length} ${facilities.data.length === 1 ? "facility" : "facilities"}.`
          : ""}
      </p>
      <Panel flush>
        <QueryState
          isLoading={facilities.isPending}
          isError={facilities.isError}
          error={facilities.error}
          onRetry={() => void facilities.refetch()}
          isEmpty={noFacilities}
          loadingLabel="Loading loan facilities"
          empty={
            <EmptyState
              title="No facilities yet"
              description="Facilities are created from approved loan applications."
              action={
                <ButtonLink to="/loan-applications" variant="secondary">
                  View loan applications
                </ButtonLink>
              }
            />
          }
        >
          {noMatches ? (
            <EmptyState
              title="No facilities match these filters"
              description="No facilities match the current status, borrower, or loan product."
              action={
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={facilities.isPlaceholderData ? "is-refreshing" : undefined}>
              <DataTable
                caption="Loan facilities"
                minWidth={1080}
                rows={facilities.data ?? []}
                getRowId={(facility) => facility.id}
                columns={[
                  {
                    id: "facility",
                    header: "Facility number",
                    cell: (facility) => (
                      <Link className="record-number" to={`/loan-facilities/${facility.id}`}>
                        {facility.facilityNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "borrower",
                    header: "Borrower",
                    cell: (facility) => borrowerNames.get(facility.borrowerId) ?? "—",
                  },
                  {
                    id: "product",
                    header: "Product",
                    cell: (facility) => {
                      const product = productNames.get(facility.loanProductId);
                      if (!product) return "—";
                      return (
                        <span>
                          {product.name} <span className="muted">({product.code})</span>
                        </span>
                      );
                    },
                  },
                  {
                    id: "date",
                    header: "Facility date",
                    cell: (facility) => (
                      <time dateTime={facility.facilityDate}>{formatDateOnly(facility.facilityDate)}</time>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: (facility) => <FacilityStatusBadge status={facility.status} />,
                  },
                  {
                    id: "authorized",
                    header: "Authorized principal",
                    align: "numeric",
                    cell: (facility) =>
                      formatMoneyAmount(facility.authorizedPrincipalAmount, facility.currencyCode),
                  },
                  {
                    id: "disbursed",
                    header: "Total disbursed",
                    align: "numeric",
                    cell: (facility) => formatMoneyAmount(facility.totalDisbursed, facility.currencyCode),
                  },
                  {
                    id: "remaining",
                    header: "Remaining authorization",
                    align: "numeric",
                    cell: (facility) =>
                      formatMoneyAmount(facility.remainingAuthorizedAmount, facility.currencyCode),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "end",
                    cell: (facility) => (
                      <div className="cell-actions">
                        <ButtonLink to={`/loan-facilities/${facility.id}`} variant="ghost" size="sm">
                          Open
                        </ButtonLink>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </QueryState>
      </Panel>
    </div>
  );
}
