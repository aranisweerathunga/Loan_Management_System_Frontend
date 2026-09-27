import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DefinitionList } from "@/components/Breadcrumbs";
import { EmptyState, QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { Tabs } from "@/components/Tabs";
import { usePageMeta } from "@/components/pageMeta";
import { getBorrower } from "@/lib/api/borrowers";
import { ApiError } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import { displayText, formatDateOnly, formatTimestamp, fullName } from "@/lib/format";
import { BorrowerFormModal } from "@/features/borrowers/BorrowerFormModal";
import { EmployeeProfileCallout } from "@/features/borrowers/EmployeeProfileCallout";
import { EmploymentPanel } from "@/features/borrowers/EmploymentPanel";
import { EpfBalancesPanel } from "@/features/borrowers/EpfBalancesPanel";
import { GradeHistoryPanel } from "@/features/borrowers/GradeHistoryPanel";
import { IdentifiersPanel } from "@/features/borrowers/IdentifiersPanel";

const tabs = ["overview", "identifiers", "employment", "grades", "epf"] as const;

export function BorrowerDetailPage() {
  const { borrowerId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const borrower = useQuery({
    queryKey: borrowerKeys.detail(borrowerId),
    queryFn: ({ signal }) => getBorrower(borrowerId, signal),
    enabled: borrowerId.length > 0,
  });
  const requested = params.get("tab") ?? "overview";
  const activeTab = tabs.includes(requested as (typeof tabs)[number]) ? requested : "overview";
  const name = borrower.data ? fullName(borrower.data) : "Borrower";

  usePageMeta(name, [{ label: "Borrowers", to: "/borrowers" }, { label: name }]);

  if (borrower.isError && borrower.error instanceof ApiError && borrower.error.status === 404) {
    return (
      <EmptyState
        title="Borrower not found"
        description="This borrower does not exist, or the address is incorrect."
        action={
          <ButtonLink to="/borrowers" variant="secondary">
            Back to borrowers
          </ButtonLink>
        }
      />
    );
  }

  return (
    <QueryState
      isLoading={borrower.isPending}
      isError={borrower.isError && borrower.data === undefined}
      error={borrower.error}
      onRetry={() => void borrower.refetch()}
      loadingLabel="Loading borrower"
    >
      {borrower.data ? (
        <div className="stack">
          <header className="identity-header">
            <div>
              <p className="eyebrow">Borrower</p>
              <div className="identity-header__title">
                <h1>{fullName(borrower.data)}</h1>
                <ActiveBadge active={borrower.data.isActive} />
              </div>
              <p className="muted mono">Record ID {borrower.data.id}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Edit borrower
            </Button>
          </header>
          <Tabs
            label="Borrower sections"
            activeId={activeTab}
            onChange={(id) => {
              const next = new URLSearchParams(params);
              if (id === "overview") next.delete("tab");
              else next.set("tab", id);
              setParams(next, { replace: true });
            }}
            tabs={[
              {
                id: "overview",
                label: "Overview",
                panel: (
                  <div className="stack">
                    <section className="panel">
                      <div className="panel__header">
                        <h2>Personal information</h2>
                      </div>
                      <div className="panel__body">
                        <DefinitionList
                          items={[
                            { label: "First name", value: borrower.data.firstName },
                            { label: "Middle name", value: displayText(borrower.data.middleName) },
                            { label: "Last name", value: borrower.data.lastName },
                            {
                              label: "Date of birth",
                              value: formatDateOnly(borrower.data.dateOfBirth),
                            },
                            {
                              label: "Borrower status",
                              value: <ActiveBadge active={borrower.data.isActive} />,
                            },
                            { label: "Created", value: formatTimestamp(borrower.data.createdAt) },
                          ]}
                        />
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel__header">
                        <h2>Contact information</h2>
                      </div>
                      <div className="panel__body">
                        <DefinitionList
                          items={[
                            { label: "Email", value: displayText(borrower.data.email) },
                            { label: "Phone", value: displayText(borrower.data.phone) },
                          ]}
                        />
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel__body">
                        <EmployeeProfileCallout
                          borrowerId={borrower.data.id}
                          profile={borrower.data.employeeProfile}
                        />
                      </div>
                    </section>
                  </div>
                ),
              },
              {
                id: "identifiers",
                label: "Identifiers",
                panel: <IdentifiersPanel borrowerId={borrower.data.id} />,
              },
              {
                id: "employment",
                label: "Employment",
                panel: (
                  <EmploymentPanel
                    borrowerId={borrower.data.id}
                    profile={borrower.data.employeeProfile}
                  />
                ),
              },
              {
                id: "grades",
                label: "Grade History",
                panel: (
                  <GradeHistoryPanel
                    borrowerId={borrower.data.id}
                    profile={borrower.data.employeeProfile}
                  />
                ),
              },
              {
                id: "epf",
                label: "EPF Balances",
                panel: (
                  <EpfBalancesPanel
                    borrowerId={borrower.data.id}
                    borrowerName={fullName(borrower.data)}
                    profile={borrower.data.employeeProfile}
                  />
                ),
              },
            ]}
          />
          {editing ? (
            <BorrowerFormModal borrower={borrower.data} onClose={() => setEditing(false)} />
          ) : null}
        </div>
      ) : null}
    </QueryState>
  );
}
