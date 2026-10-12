import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  FolderTree,
  HandCoins,
  Layers,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Panel } from "@/components/PageHeader";
import { usePageMeta } from "@/components/pageMeta";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge, ApplicationStatusBadge, FacilityStatusBadge } from "@/components/StatusBadge";
import { listBorrowers } from "@/lib/api/borrowers";
import {
  borrowerKeys,
  categoryKeys,
  gradeKeys,
  loanApplicationKeys,
  loanFacilityKeys,
  productKeys,
} from "@/lib/api/keys";
import { listGrades } from "@/lib/api/grades";
import { listLoanApplications } from "@/lib/api/loan-applications";
import { listLoanFacilities } from "@/lib/api/loan-facilities";
import { listCategories, listProducts } from "@/lib/api/products";
import { formatTimestamp, fullName } from "@/lib/format";
import { formatMoneyAmount } from "@/lib/money";
import type { LoanApplicationStatus, LoanFacility } from "@/lib/api/types";

const pipelineStatuses: { status: LoanApplicationStatus; segment: string }[] = [
  { status: "DRAFT", segment: "draft" },
  { status: "SUBMITTED", segment: "submitted" },
  { status: "UNDER_REVIEW", segment: "review" },
  { status: "APPROVED", segment: "approved" },
  { status: "REJECTED", segment: "rejected" },
];

/** Sort order for statuses the facility API currently returns. Other returned values still appear. */
const knownFacilityStatusOrder = ["PENDING_DISBURSEMENT", "ACTIVE"] as const;

function facilityStatusCounts(facilities: LoanFacility[]): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const facility of facilities) {
    const status = facility.status;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => {
      const leftRank = knownFacilityStatusOrder.indexOf(
        left as (typeof knownFacilityStatusOrder)[number],
      );
      const rightRank = knownFacilityStatusOrder.indexOf(
        right as (typeof knownFacilityStatusOrder)[number],
      );
      const leftOrder = leftRank === -1 ? knownFacilityStatusOrder.length : leftRank;
      const rightOrder = rightRank === -1 ? knownFacilityStatusOrder.length : rightRank;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.localeCompare(right);
    })
    .map(([status, count]) => ({ status, count }));
}

function relatedName(
  query: { isPending: boolean; isError: boolean },
  label: string | undefined,
): string {
  if (query.isPending) return "Loading";
  if (query.isError || !label) return "—";
  return label;
}

function initials(person: { firstName: string; lastName: string }): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

export function DashboardPage() {
  usePageMeta("Dashboard", [{ label: "Dashboard" }]);
  const borrowers = useQuery({
    queryKey: borrowerKeys.all,
    queryFn: ({ signal }) => listBorrowers(signal),
  });
  const categories = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => listCategories(signal),
  });
  const products = useQuery({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => listProducts(undefined, signal),
  });
  const grades = useQuery({
    queryKey: gradeKeys.all,
    queryFn: ({ signal }) => listGrades(signal),
  });
  const applications = useQuery({
    queryKey: loanApplicationKeys.list({}),
    queryFn: ({ signal }) => listLoanApplications({}, signal),
  });
  const facilities = useQuery({
    queryKey: loanFacilityKeys.list({}),
    queryFn: ({ signal }) => listLoanFacilities({}, signal),
  });

  const allFailed =
    borrowers.isError &&
    categories.isError &&
    products.isError &&
    grades.isError &&
    applications.isError &&
    facilities.isError;
  const allLoaded =
    borrowers.isSuccess &&
    categories.isSuccess &&
    products.isSuccess &&
    grades.isSuccess &&
    applications.isSuccess &&
    facilities.isSuccess;
  const allEmpty =
    allLoaded &&
    borrowers.data.length === 0 &&
    categories.data.length === 0 &&
    products.data.length === 0 &&
    grades.data.length === 0 &&
    applications.data.length === 0 &&
    facilities.data.length === 0;

  const recentBorrowers = [...(borrowers.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
  const recentApplications = [...(applications.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
  const recentFacilities = [...(facilities.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
  const facilityCounts = facilityStatusCounts(facilities.data ?? []);
  const borrowerNames = new Map(
    (borrowers.data ?? []).map((borrower) => [borrower.id, fullName(borrower)]),
  );
  const productNames = new Map(
    (products.data ?? []).map((product) => [product.id, `${product.name} (${product.code})`]),
  );
  const categoryNames = new Map((categories.data ?? []).map((item) => [item.id, item.name]));
  const recentProducts = [...(products.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Counts of borrowers, loan applications, loan facilities, product configuration, and grades currently stored. This view does not show approval rates, loan balances, or repayments."
        actions={<ButtonLink to="/loan-applications/new">New application</ButtonLink>}
      />
      {allFailed ? (
        <Panel>
          <div className="error-state" role="alert">
            <h2>Workspace data could not be loaded</h2>
            <p>Check that the API is running, then try again.</p>
            <Button
              variant="secondary"
              onClick={() => {
                void borrowers.refetch();
                void categories.refetch();
                void products.refetch();
                void grades.refetch();
                void applications.refetch();
                void facilities.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Panel>
      ) : (
        <section className="metric-strip" aria-label="Record counts">
          <Metric
            label="Borrowers"
            icon={Users}
            value={borrowers.data?.length}
            hint={
              borrowers.data
                ? `${borrowers.data.filter((borrower) => borrower.isActive).length} active`
                : undefined
            }
            to="/borrowers"
            isLoading={borrowers.isPending}
            isError={borrowers.isError}
            onRetry={() => void borrowers.refetch()}
          />
          <Metric
            label="Active borrowers"
            icon={UserCheck}
            value={borrowers.data?.filter((borrower) => borrower.isActive).length}
            hint="Status on the borrower record"
            to="/borrowers"
            isLoading={borrowers.isPending}
            isError={borrowers.isError}
            onRetry={() => void borrowers.refetch()}
          />
          <Metric
            label="Loan applications"
            icon={ClipboardList}
            value={applications.data?.length}
            hint={
              applications.data
                ? `${applications.data.filter((item) => item.status === "DRAFT").length} draft`
                : undefined
            }
            to="/loan-applications"
            isLoading={applications.isPending}
            isError={applications.isError}
            onRetry={() => void applications.refetch()}
          />
          <Metric
            label="Categories"
            icon={FolderTree}
            value={categories.data?.length}
            hint={
              categories.data
                ? `${categories.data.filter((category) => category.isActive).length} active`
                : undefined
            }
            to="/product-categories"
            isLoading={categories.isPending}
            isError={categories.isError}
            onRetry={() => void categories.refetch()}
          />
          <Metric
            label="Loan products"
            icon={Layers}
            value={products.data?.length}
            hint={
              products.data
                ? `${products.data.filter((product) => product.isActive).length} active`
                : undefined
            }
            to="/products"
            isLoading={products.isPending}
            isError={products.isError}
            onRetry={() => void products.refetch()}
          />
          <Metric
            label="Grades"
            icon={BadgeCheck}
            value={grades.data?.length}
            hint={
              grades.data
                ? `${grades.data.filter((grade) => grade.isActive).length} active`
                : undefined
            }
            to="/grades"
            isLoading={grades.isPending}
            isError={grades.isError}
            onRetry={() => void grades.refetch()}
          />
          <Metric
            label="Total loan facilities"
            icon={HandCoins}
            value={facilities.data?.length}
            to="/loan-facilities"
            isLoading={facilities.isPending}
            isError={facilities.isError}
            onRetry={() => void facilities.refetch()}
          />
        </section>
      )}

      {allEmpty ? (
        <Panel>
          <div className="empty-state">
            <h2>No records yet</h2>
            <p>
              The database does not contain borrowers, loan applications, loan facilities,
              categories, loan products, or grades. Add the records you need from the sections
              below.
            </p>
            <div className="cluster">
              <ButtonLink to="/borrowers">Add a borrower</ButtonLink>
              <ButtonLink to="/product-categories" variant="secondary">
                Add a category
              </ButtonLink>
              <ButtonLink to="/grades" variant="secondary">
                Add a grade
              </ButtonLink>
            </div>
          </div>
        </Panel>
      ) : null}

      {!allFailed && !allEmpty ? (
        <>
          <div className="dashboard-grid">
            <Panel
              title="Recent loan applications"
              description="Newest applications by creation date."
              actions={
                <ButtonLink to="/loan-applications" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
              flush
            >
              {applications.isPending ? null : applications.isError ? (
                <p className="muted panel__body">Loan applications could not be loaded.</p>
              ) : recentApplications.length === 0 ? (
                <div className="empty-state">
                  <h2>No loan applications yet</h2>
                  <p>Applications will appear here after a draft is created.</p>
                  <ButtonLink to="/loan-applications/new" variant="secondary">
                    New application
                  </ButtonLink>
                </div>
              ) : (
                <ul className="record-list">
                  {recentApplications.map((application) => (
                    <li key={application.id}>
                      <Link className="record-row" to={`/loan-applications/${application.id}`}>
                        <span
                          className="record-row__avatar record-row__avatar--square"
                          aria-hidden="true"
                        >
                          <ClipboardList size={18} strokeWidth={1.75} />
                        </span>
                        <span className="record-row__body">
                          <span className="record-row__title record-number">
                            {application.applicationNumber}
                          </span>
                          <span className="record-row__meta">
                            {fullName(application.borrower)} · {application.loanProduct.name}
                          </span>
                        </span>
                        <span className="record-row__end">
                          <ApplicationStatusBadge status={application.status} />
                          <time dateTime={application.createdAt}>
                            {formatTimestamp(application.createdAt)}
                          </time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel
              title="Applications by status"
              description="Current status of every stored application."
            >
              {applications.isPending ? null : applications.isError ? (
                <p className="muted">Loan applications could not be loaded.</p>
              ) : (
                <>
                  {applications.data.length > 0 ? (
                    <div className="pipeline__bar" aria-hidden="true">
                      {pipelineStatuses.map(({ status, segment }) => {
                        const count = applications.data.filter(
                          (item) => item.status === status,
                        ).length;
                        return count > 0 ? (
                          <span
                            key={status}
                            className={`pipeline__seg pipeline__seg--${segment}`}
                            style={{ flexGrow: count }}
                          />
                        ) : null;
                      })}
                    </div>
                  ) : null}
                  <ul className="pipeline__list">
                    {pipelineStatuses.map(({ status }) => (
                      <li key={status} className="pipeline__item">
                        <ApplicationStatusBadge status={status} />
                        <span className="pipeline__count">
                          {applications.data.filter((item) => item.status === status).length}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>
          <div className="dashboard-grid">
            <Panel
              title="Recent loan facilities"
              description="Newest facilities by creation date."
              actions={
                <ButtonLink to="/loan-facilities" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
              flush
            >
              <QueryState
                isLoading={facilities.isPending}
                isError={facilities.isError && facilities.data === undefined}
                error={facilities.error}
                onRetry={() => void facilities.refetch()}
                loadingLabel="Loading loan facilities"
                isEmpty={facilities.isSuccess && recentFacilities.length === 0}
                empty={
                  <div className="empty-state">
                    <h2>No loan facilities yet</h2>
                    <p>Facilities appear here after one is created from an approved application.</p>
                    <ButtonLink to="/loan-facilities" variant="secondary">
                      Go to loan facilities
                    </ButtonLink>
                  </div>
                }
              >
                <DataTable
                  caption="Recent loan facilities"
                  minWidth={760}
                  rows={recentFacilities}
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
                      cell: (facility) =>
                        relatedName(borrowers, borrowerNames.get(facility.borrowerId)),
                    },
                    {
                      id: "product",
                      header: "Loan product",
                      cell: (facility) =>
                        relatedName(products, productNames.get(facility.loanProductId)),
                    },
                    {
                      id: "status",
                      header: "Facility status",
                      cell: (facility) => <FacilityStatusBadge status={facility.status} />,
                    },
                    {
                      id: "authorized",
                      header: "Authorized amount",
                      align: "numeric",
                      cell: (facility) =>
                        formatMoneyAmount(
                          facility.authorizedPrincipalAmount,
                          facility.currencyCode,
                        ),
                    },
                    {
                      id: "created",
                      header: "Creation date",
                      cell: (facility) => (
                        <time dateTime={facility.createdAt}>
                          {formatTimestamp(facility.createdAt)}
                        </time>
                      ),
                    },
                  ]}
                />
              </QueryState>
            </Panel>
            <Panel
              title="Facilities by status"
              description="Counts from the facility list, grouped by each returned status."
            >
              <QueryState
                isLoading={facilities.isPending}
                isError={facilities.isError && facilities.data === undefined}
                error={facilities.error}
                onRetry={() => void facilities.refetch()}
                loadingLabel="Loading facility statuses"
                isEmpty={facilities.isSuccess && facilityCounts.length === 0}
                empty={
                  <div className="empty-state">
                    <h2>No facility statuses yet</h2>
                    <p>Status counts appear after a facility is stored.</p>
                  </div>
                }
              >
                <ul className="pipeline__list">
                  {facilityCounts.map(({ status, count }) => (
                    <li key={status} className="pipeline__item">
                      <FacilityStatusBadge status={status} />
                      <span className="pipeline__count">{count}</span>
                    </li>
                  ))}
                </ul>
              </QueryState>
            </Panel>
          </div>
          <div className="dashboard-pair">
            <Panel
              title="Recent borrowers"
              description="Newest records from the borrower list."
              actions={
                <ButtonLink to="/borrowers" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
              flush
            >
              {borrowers.isPending ? null : borrowers.isError ? (
                <p className="muted panel__body">Borrowers could not be loaded.</p>
              ) : recentBorrowers.length === 0 ? (
                <div className="empty-state">
                  <h2>No borrowers yet</h2>
                  <p>Borrower records will appear here after they are added.</p>
                  <ButtonLink to="/borrowers" variant="secondary">
                    Go to borrowers
                  </ButtonLink>
                </div>
              ) : (
                <ul className="record-list">
                  {recentBorrowers.map((borrower) => (
                    <li key={borrower.id}>
                      <Link className="record-row" to={`/borrowers/${borrower.id}`}>
                        <span className="record-row__avatar" aria-hidden="true">
                          {initials(borrower)}
                        </span>
                        <span className="record-row__body">
                          <span className="record-row__title">{fullName(borrower)}</span>
                          <span className="record-row__meta">
                            {borrower.email ?? borrower.phone ?? "No contact details recorded"}
                          </span>
                        </span>
                        <span className="record-row__end">
                          <ActiveBadge active={borrower.isActive} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel
              title="Loan products"
              description="Newest products from the catalogue."
              actions={
                <ButtonLink to="/products" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
              flush
            >
              {products.isPending ? null : products.isError ? (
                <p className="muted panel__body">Loan products could not be loaded.</p>
              ) : recentProducts.length === 0 ? (
                <div className="empty-state">
                  <h2>No loan products yet</h2>
                  <p>Create a category first, then add a loan product.</p>
                  <ButtonLink to="/products" variant="secondary">
                    Go to loan products
                  </ButtonLink>
                </div>
              ) : (
                <ul className="record-list">
                  {recentProducts.map((product) => (
                    <li key={product.id}>
                      <Link className="record-row" to={`/products/${product.id}`}>
                        <span
                          className="record-row__avatar record-row__avatar--square"
                          aria-hidden="true"
                        >
                          <Layers size={18} strokeWidth={1.75} />
                        </span>
                        <span className="record-row__body">
                          <span className="record-row__title">{product.name}</span>
                          <span className="record-row__meta">
                            <span className="mono">{product.code}</span>
                            {categoryNames.get(product.categoryId)
                              ? ` · ${categoryNames.get(product.categoryId)}`
                              : ""}
                          </span>
                        </span>
                        <span className="record-row__end">
                          <ActiveBadge active={product.isActive} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  icon: Icon,
  value,
  hint,
  to,
  isLoading,
  isError,
  onRetry,
}: {
  label: string;
  icon: LucideIcon;
  value: number | undefined;
  hint?: string;
  to: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const body = (
    <>
      <span className="metric__head">
        <span className="metric__label">{label}</span>
        <span className="metric__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </span>
      {isLoading ? <span className="skeleton skeleton--value" /> : null}
      {!isLoading && isError ? <span className="metric__hint">Unavailable</span> : null}
      {!isLoading && !isError ? <span className="metric__value">{value ?? 0}</span> : null}
      {!isLoading && !isError && hint ? <span className="metric__hint">{hint}</span> : null}
      {isError ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </>
  );

  if (isLoading || isError) return <div className="metric">{body}</div>;
  return (
    <Link className="metric" to={to}>
      {body}
    </Link>
  );
}
