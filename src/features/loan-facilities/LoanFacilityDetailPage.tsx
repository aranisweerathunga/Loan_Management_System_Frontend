import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DefinitionList } from "@/components/Breadcrumbs";
import { DataTable } from "@/components/DataTable";
import { Panel } from "@/components/PageHeader";
import { EmptyState, QueryState } from "@/components/QueryState";
import { FacilityStatusBadge, VersionBadge, facilityStatusLabel } from "@/components/StatusBadge";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";
import { usePageMeta } from "@/components/pageMeta";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { loanApplicationKeys, loanFacilityKeys } from "@/lib/api/keys";
import { getLoanApplication } from "@/lib/api/loan-applications";
import {
  createLoanDisbursement,
  getLoanFacility,
  listLoanDisbursements,
  listLoanTransactions,
} from "@/lib/api/loan-facilities";
import type { CreateLoanDisbursementInput, LoanDisbursement, LoanTransaction } from "@/lib/api/types";
import { displayText, formatDateOnly, formatTimestamp, fullName } from "@/lib/format";
import { formatMoneyAmount, isZeroMoney } from "@/lib/money";
import { versionSummary } from "@/features/loan-applications/presentation";
import { RecordDisbursementDialog } from "@/features/loan-facilities/RecordDisbursementDialog";

export function LoanFacilityDetailPage() {
  const { facilityId = "" } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [recording, setRecording] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const facility = useQuery({
    queryKey: loanFacilityKeys.detail(facilityId),
    queryFn: ({ signal }) => getLoanFacility(facilityId, signal),
    enabled: facilityId.length > 0,
  });
  const application = useQuery({
    queryKey: loanApplicationKeys.detail(facility.data?.loanApplicationId ?? "none"),
    queryFn: ({ signal }) => getLoanApplication(facility.data?.loanApplicationId ?? "", signal),
    enabled: Boolean(facility.data?.loanApplicationId),
  });
  const disbursements = useQuery({
    queryKey: loanFacilityKeys.disbursements(facilityId),
    queryFn: ({ signal }) => listLoanDisbursements(facilityId, signal),
    enabled: facility.isSuccess,
  });
  const transactions = useQuery({
    queryKey: loanFacilityKeys.transactions(facilityId),
    queryFn: ({ signal }) => listLoanTransactions(facilityId, signal),
    enabled: facility.isSuccess,
  });

  const missing =
    facility.isError &&
    facility.error instanceof ApiError &&
    (facility.error.status === 404 || facility.error.status === 400);
  const title = facility.data?.facilityNumber ?? (missing ? "Facility not found" : "Loan facility");
  usePageMeta(title, [
    { label: "Loan Management" },
    { label: "Loan Facilities", to: "/loan-facilities" },
    { label: title },
  ]);

  const canDisburse = Boolean(
    facility.data &&
      (facility.data.status === "PENDING_DISBURSEMENT" || facility.data.status === "ACTIVE") &&
      !isZeroMoney(facility.data.remainingAuthorizedAmount),
  );

  async function refreshFacility() {
    await queryClient.invalidateQueries({ queryKey: loanFacilityKeys.all });
  }

  async function recordDisbursement(input: CreateLoanDisbursementInput) {
    if (!facility.data || recordBusy) return;
    setRecordBusy(true);
    try {
      await createLoanDisbursement(facility.data.id, input);
      await refreshFacility();
      toast.success("Disbursement recorded.");
      setRecording(false);
      setTab("disbursements");
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        await refreshFacility();
      }
      throw error;
    } finally {
      setRecordBusy(false);
    }
  }

  if (missing) {
    return (
      <EmptyState
        title="Facility not found"
        description="This facility does not exist, or the address is not valid."
        action={
          <ButtonLink to="/loan-facilities" variant="secondary">
            Back to loan facilities
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <QueryState
        isLoading={facility.isPending}
        isError={facility.isError && facility.data === undefined}
        error={facility.error}
        onRetry={() => void facility.refetch()}
        loadingLabel="Loading loan facility"
      >
        {facility.data ? (
          <div className="stack">
            <header className="identity-header">
              <div>
                <p className="eyebrow">Loan facility</p>
                <div className="identity-header__title">
                  <h1 className="record-number">{facility.data.facilityNumber}</h1>
                  <FacilityStatusBadge status={facility.data.status} />
                </div>
                <ul className="identity-facts">
                  <li>
                    {application.data && application.data.borrower.id === facility.data.borrowerId ? (
                      <Link to={`/borrowers/${application.data.borrower.id}`}>
                        {fullName(application.data.borrower)}
                      </Link>
                    ) : (
                      <Link to={`/borrowers/${facility.data.borrowerId}`}>Borrower</Link>
                    )}
                  </li>
                  <li>
                    {application.data &&
                    application.data.loanProduct.id === facility.data.loanProductId ? (
                      <Link to={`/products/${application.data.loanProduct.id}`}>
                        {application.data.loanProduct.name} ({application.data.loanProduct.code})
                      </Link>
                    ) : (
                      <Link to={`/products/${facility.data.loanProductId}`}>Loan product</Link>
                    )}
                  </li>
                  <li>
                    {application.data ? (
                      <Link to={`/loan-applications/${application.data.id}`}>
                        {application.data.applicationNumber}
                      </Link>
                    ) : (
                      <Link to={`/loan-applications/${facility.data.loanApplicationId}`}>
                        Originating application
                      </Link>
                    )}
                  </li>
                </ul>
                {isZeroMoney(facility.data.remainingAuthorizedAmount) ? (
                  <p className="state-note">
                    Remaining authorization:{" "}
                    {formatMoneyAmount(
                      facility.data.remainingAuthorizedAmount,
                      facility.data.currencyCode,
                    )}
                    . The facility remains {facilityStatusLabel(facility.data.status)}.
                  </p>
                ) : null}
              </div>
              {canDisburse ? (
                <div className="page-header__actions">
                  <Button type="button" onClick={() => setRecording(true)} disabled={recordBusy}>
                    Record Disbursement
                  </Button>
                </div>
              ) : null}
            </header>

            <section className="metric-strip metric-strip--3" aria-label="Facility amounts">
              <div className="metric">
                <span className="metric__label">Authorized principal</span>
                <span className="metric__value">
                  {formatMoneyAmount(
                    facility.data.authorizedPrincipalAmount,
                    facility.data.currencyCode,
                  )}
                </span>
              </div>
              <div className="metric">
                <span className="metric__label">Total disbursed</span>
                <span className="metric__value">
                  {formatMoneyAmount(facility.data.totalDisbursed, facility.data.currencyCode)}
                </span>
              </div>
              <div className="metric">
                <span className="metric__label">Remaining authorization</span>
                <span className="metric__value">
                  {formatMoneyAmount(
                    facility.data.remainingAuthorizedAmount,
                    facility.data.currencyCode,
                  )}
                </span>
              </div>
            </section>

            <Tabs
              label="Facility sections"
              activeId={tab}
              onChange={setTab}
              tabs={[
                {
                  id: "overview",
                  label: "Overview",
                  panel: (
                    <Panel title="Overview">
                      <DefinitionList
                        items={[
                          { label: "Facility number", value: facility.data.facilityNumber },
                          {
                            label: "Facility date",
                            value: (
                              <time dateTime={facility.data.facilityDate}>
                                {formatDateOnly(facility.data.facilityDate)}
                              </time>
                            ),
                          },
                          {
                            label: "Status",
                            value: <FacilityStatusBadge status={facility.data.status} />,
                          },
                          { label: "Currency", value: facility.data.currencyCode },
                          {
                            label: "Borrower",
                            value:
                              application.data &&
                              application.data.borrower.id === facility.data.borrowerId ? (
                                <Link to={`/borrowers/${application.data.borrower.id}`}>
                                  {fullName(application.data.borrower)}
                                </Link>
                              ) : application.isPending ? (
                                "Loading…"
                              ) : (
                                <Link to={`/borrowers/${facility.data.borrowerId}`}>View borrower</Link>
                              ),
                          },
                          {
                            label: "Product",
                            value:
                              application.data &&
                              application.data.loanProduct.id === facility.data.loanProductId ? (
                                <Link to={`/products/${application.data.loanProduct.id}`}>
                                  {application.data.loanProduct.name} ({application.data.loanProduct.code})
                                </Link>
                              ) : application.isPending ? (
                                "Loading…"
                              ) : (
                                <Link to={`/products/${facility.data.loanProductId}`}>View product</Link>
                              ),
                          },
                          {
                            label: "Product version",
                            value:
                              application.data &&
                              application.data.productVersion.id === facility.data.productVersionId ? (
                                <span className="inline-status">
                                  <span>{versionSummary(application.data.productVersion)}</span>
                                  <VersionBadge status={application.data.productVersion.status} />
                                </span>
                              ) : application.isPending ? (
                                "Loading…"
                              ) : (
                                displayText(null)
                              ),
                          },
                          ...(facility.data.productPurposeId
                            ? [
                                {
                                  label: "Purpose",
                                  value:
                                    application.data?.productPurpose &&
                                    application.data.productPurpose.id === facility.data.productPurposeId ? (
                                      `${application.data.productPurpose.name} (${application.data.productPurpose.code})`
                                    ) : application.isPending ? (
                                      "Loading…"
                                    ) : (
                                      displayText(null)
                                    ),
                                },
                              ]
                            : []),
                          {
                            label: "Originating application",
                            value: application.data ? (
                              <Link to={`/loan-applications/${application.data.id}`}>
                                {application.data.applicationNumber}
                              </Link>
                            ) : application.isPending ? (
                              "Loading…"
                            ) : (
                              <Link to={`/loan-applications/${facility.data.loanApplicationId}`}>
                                View application
                              </Link>
                            ),
                          },
                          {
                            label: "Authorized principal",
                            value: formatMoneyAmount(
                              facility.data.authorizedPrincipalAmount,
                              facility.data.currencyCode,
                            ),
                          },
                        ]}
                      />
                      {application.isError ? (
                        <p className="state-note" role="alert">
                          {getErrorMessage(application.error)}{" "}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void application.refetch()}
                          >
                            Try again
                          </Button>
                        </p>
                      ) : null}
                    </Panel>
                  ),
                },
                {
                  id: "disbursements",
                  label: "Disbursements",
                  panel: (
                    <Panel title="Disbursements">
                      <HistoryState
                        isPending={disbursements.isPending}
                        isError={disbursements.isError}
                        error={disbursements.error}
                        onRetry={() => void disbursements.refetch()}
                        loadingLabel="Loading disbursements"
                        empty={disbursements.isSuccess && disbursements.data.length === 0}
                        emptyTitle="No disbursements"
                        emptyDescription="No funds have been disbursed for this facility yet."
                      >
                        <DataTable
                          caption="Disbursement history"
                          minWidth={760}
                          rows={disbursements.data ?? []}
                          getRowId={(row) => row.id}
                          columns={disbursementColumns(facility.data.currencyCode)}
                        />
                      </HistoryState>
                    </Panel>
                  ),
                },
                {
                  id: "transactions",
                  label: "Transaction history",
                  panel: (
                    <Panel
                      title="Loan transaction history"
                      description="Loan subledger for this facility."
                    >
                      <HistoryState
                        isPending={transactions.isPending}
                        isError={transactions.isError}
                        error={transactions.error}
                        onRetry={() => void transactions.refetch()}
                        loadingLabel="Loading loan transactions"
                        empty={transactions.isSuccess && transactions.data.length === 0}
                        emptyTitle="No loan transactions"
                        emptyDescription="No loan transactions have been recorded yet."
                      >
                        <DataTable
                          caption="Loan transaction history"
                          minWidth={760}
                          rows={transactions.data ?? []}
                          getRowId={(row) => row.id}
                          columns={transactionColumns(
                            facility.data.currencyCode,
                            disbursements.data ?? [],
                          )}
                        />
                      </HistoryState>
                    </Panel>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </QueryState>
      {recording && facility.data ? (
        <RecordDisbursementDialog
          facilityNumber={facility.data.facilityNumber}
          facilityDate={facility.data.facilityDate}
          currencyCode={facility.data.currencyCode}
          remainingAuthorizedAmount={facility.data.remainingAuthorizedAmount}
          busy={recordBusy}
          onSubmit={recordDisbursement}
          onClose={() => {
            if (!recordBusy) setRecording(false);
          }}
        />
      ) : null}
    </>
  );
}

function HistoryState({
  isPending,
  isError,
  error,
  onRetry,
  loadingLabel,
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  loadingLabel: string;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}) {
  return (
    <QueryState
      isLoading={isPending}
      isError={isError}
      error={error}
      onRetry={onRetry}
      isEmpty={empty}
      loadingLabel={loadingLabel}
      empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
    >
      {children}
    </QueryState>
  );
}

function disbursementColumns(currencyCode: string) {
  return [
    {
      id: "date",
      header: "Disbursement date",
      cell: (row: LoanDisbursement) => (
        <time dateTime={row.disbursementDate}>{formatDateOnly(row.disbursementDate)}</time>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "numeric" as const,
      cell: (row: LoanDisbursement) => formatMoneyAmount(row.amount, currencyCode),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (row: LoanDisbursement) => displayText(row.reference),
    },
    {
      id: "remarks",
      header: "Remarks",
      cell: (row: LoanDisbursement) => displayText(row.remarks),
    },
    {
      id: "recorded",
      header: "Recorded at",
      cell: (row: LoanDisbursement) => <time dateTime={row.createdAt}>{formatTimestamp(row.createdAt)}</time>,
    },
  ];
}

function transactionColumns(currencyCode: string, disbursements: LoanDisbursement[]) {
  return [
    {
      id: "date",
      header: "Transaction date",
      cell: (row: LoanTransaction) => (
        <time dateTime={row.transactionDate}>{formatDateOnly(row.transactionDate)}</time>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row: LoanTransaction) => (row.type === "DISBURSEMENT" ? "Disbursement" : row.type),
    },
    {
      id: "amount",
      header: "Principal amount",
      align: "numeric" as const,
      cell: (row: LoanTransaction) => formatMoneyAmount(row.principalAmount, currencyCode),
    },
    {
      id: "source",
      header: "Source",
      cell: (row: LoanTransaction) => disbursementSource(row, disbursements),
    },
    {
      id: "recorded",
      header: "Recorded at",
      cell: (row: LoanTransaction) => <time dateTime={row.createdAt}>{formatTimestamp(row.createdAt)}</time>,
    },
  ];
}

function disbursementSource(transaction: LoanTransaction, disbursements: LoanDisbursement[]): string {
  if (!transaction.loanDisbursementId) return "—";
  const match = disbursements.find((item) => item.id === transaction.loanDisbursementId);
  if (!match) return "Disbursement";
  const reference = match.reference?.trim();
  const dated = `Disbursement · ${formatDateOnly(match.disbursementDate)}`;
  return reference ? `${dated} · ${reference}` : dated;
}
