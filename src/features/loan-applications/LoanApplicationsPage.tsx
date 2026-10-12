import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { Select } from "@/components/Fields";
import { FormField } from "@/components/FormField";
import { PageHeader, Panel } from "@/components/PageHeader";
import { EmptyState, QueryState } from "@/components/QueryState";
import { ApplicationStatusBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { listBorrowers } from "@/lib/api/borrowers";
import { borrowerKeys, loanApplicationKeys, productKeys } from "@/lib/api/keys";
import { listLoanApplications } from "@/lib/api/loan-applications";
import { listProducts } from "@/lib/api/products";
import type { LoanApplicationListFilters, LoanApplicationStatus } from "@/lib/api/types";
import { formatTimestamp, fullName } from "@/lib/format";

const statuses: { value: LoanApplicationStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export function LoanApplicationsPage() {
  usePageMeta("Loan Applications", [{ label: "Loan Applications" }]);
  const [status, setStatus] = useState<"" | LoanApplicationStatus>("");
  const [borrowerId, setBorrowerId] = useState("");
  const [loanProductId, setLoanProductId] = useState("");
  const filters = useMemo<LoanApplicationListFilters>(
    () => ({
      status: status || undefined,
      borrowerId: borrowerId || undefined,
      loanProductId: loanProductId || undefined,
    }),
    [borrowerId, loanProductId, status],
  );
  const filtersActive = Boolean(status || borrowerId || loanProductId);
  const applications = useQuery({
    queryKey: loanApplicationKeys.list(filters),
    queryFn: ({ signal }) => listLoanApplications(filters, signal),
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
  const settled = applications.isSuccess && !applications.isPlaceholderData;
  const noApplications = settled && !filtersActive && applications.data.length === 0;
  const noMatches = settled && filtersActive && applications.data.length === 0;

  function clearFilters() {
    setStatus("");
    setBorrowerId("");
    setLoanProductId("");
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Loan Management"
        title="Loan Applications"
        description="Draft, submitted, under review, approved, and rejected applications."
        actions={<ButtonLink to="/loan-applications/new">New Application</ButtonLink>}
      />
      <div className="filters">
        <FormField id="application-status-filter" className="field--narrow" label="Status">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | LoanApplicationStatus)}
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="application-borrower-filter" label="Borrower">
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
        <FormField id="application-product-filter" label="Loan product">
          <Select
            value={loanProductId}
            disabled={products.isPending || products.isError}
            onChange={(event) => setLoanProductId(event.target.value)}
          >
            <option value="">
              {products.isPending ? "Loading products…" : "All loan products"}
            </option>
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
          ? `${applications.data.length} ${applications.data.length === 1 ? "application" : "applications"}.`
          : ""}
      </p>
      <Panel flush>
        <QueryState
          isLoading={applications.isPending}
          isError={applications.isError}
          error={applications.error}
          onRetry={() => void applications.refetch()}
          isEmpty={noApplications}
          loadingLabel="Loading loan applications"
          empty={
            <EmptyState
              title="No applications yet"
              description="Create a draft when a borrower is ready to apply for a loan product."
              action={<ButtonLink to="/loan-applications/new">New Application</ButtonLink>}
            />
          }
        >
          {noMatches ? (
            <EmptyState
              title="No applications match these filters"
              description="No applications match the current status, borrower, or loan product."
              action={
                <Button type="button" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className={applications.isPlaceholderData ? "is-refreshing" : undefined}>
              <DataTable
                caption="Loan applications"
                minWidth={920}
                rows={applications.data ?? []}
                getRowId={(application) => application.id}
                columns={[
                  {
                    id: "application",
                    header: "Application",
                    cell: (application) => (
                      <Link className="record-number" to={`/loan-applications/${application.id}`}>
                        {application.applicationNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "borrower",
                    header: "Borrower",
                    cell: (application) => fullName(application.borrower),
                  },
                  {
                    id: "product",
                    header: "Loan product",
                    cell: (application) => (
                      <span>
                        {application.loanProduct.name}{" "}
                        <span className="muted">({application.loanProduct.code})</span>
                      </span>
                    ),
                  },
                  {
                    id: "purpose",
                    header: "Purpose",
                    cell: (application) => application.productPurpose?.name ?? "—",
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: (application) => <ApplicationStatusBadge status={application.status} />,
                  },
                  {
                    id: "date",
                    header: "Submitted / created",
                    cell: (application) =>
                      application.submittedAt ? (
                        <span className="date-stack">
                          <span className="date-stack__label">Submitted</span>
                          <time dateTime={application.submittedAt}>
                            {formatTimestamp(application.submittedAt)}
                          </time>
                        </span>
                      ) : (
                        <span className="date-stack">
                          <span className="date-stack__label">Created</span>
                          <time dateTime={application.createdAt}>
                            {formatTimestamp(application.createdAt)}
                          </time>
                        </span>
                      ),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "end",
                    cell: (application) => (
                      <div className="cell-actions">
                        <ButtonLink
                          to={`/loan-applications/${application.id}`}
                          variant="ghost"
                          size="sm"
                        >
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
