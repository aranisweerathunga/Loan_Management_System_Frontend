import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { PageHeader, Panel } from "@/components/PageHeader";
import { usePageMeta } from "@/components/pageMeta";
import { listBorrowers } from "@/lib/api/borrowers";
import {
  borrowerKeys,
  categoryKeys,
  gradeKeys,
  loanApplicationKeys,
  productKeys,
} from "@/lib/api/keys";
import { listGrades } from "@/lib/api/grades";
import { listLoanApplications } from "@/lib/api/loan-applications";
import { listCategories, listProducts } from "@/lib/api/products";
import { fullName } from "@/lib/format";

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

  const allFailed =
    borrowers.isError &&
    categories.isError &&
    products.isError &&
    grades.isError &&
    applications.isError;
  const allLoaded =
    borrowers.isSuccess &&
    categories.isSuccess &&
    products.isSuccess &&
    grades.isSuccess &&
    applications.isSuccess;
  const allEmpty =
    allLoaded &&
    borrowers.data.length === 0 &&
    categories.data.length === 0 &&
    products.data.length === 0 &&
    grades.data.length === 0 &&
    applications.data.length === 0;

  const recentBorrowers = [...(borrowers.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
  const recentProducts = [...(products.data ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  return (
    <div className="stack">
      <PageHeader
        title="Dashboard"
        description="Counts of borrowers, loan applications, product configuration, and grades currently stored. This view does not show approval rates, loan balances, or repayments."
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
            value={borrowers.data?.filter((borrower) => borrower.isActive).length}
            hint="Status on the borrower record"
            to="/borrowers"
            isLoading={borrowers.isPending}
            isError={borrowers.isError}
            onRetry={() => void borrowers.refetch()}
          />
          <Metric
            label="Loan applications"
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
        </section>
      )}

      {allEmpty ? (
        <Panel>
          <div className="empty-state">
            <h2>No records yet</h2>
            <p>
              The database does not contain borrowers, loan applications, categories, loan products,
              or grades. Add the records you need from the sections below.
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
        <div className="dashboard-grid">
          <Panel
            title="Recent borrowers"
            description="Newest records from the borrower list."
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
              <div className="link-list">
                {recentBorrowers.map((borrower) => (
                  <Link key={borrower.id} to={`/borrowers/${borrower.id}`}>
                    <span>{fullName(borrower)}</span>
                    <span className="muted">{borrower.isActive ? "Active" : "Inactive"}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Loan products" description="Newest products from the catalogue." flush>
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
              <div className="link-list">
                {recentProducts.map((product) => (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <span>{product.name}</span>
                    <span className="muted">{product.isActive ? "Active" : "Inactive"}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  to,
  isLoading,
  isError,
  onRetry,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  to: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const body = (
    <>
      <span className="metric__label">{label}</span>
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
