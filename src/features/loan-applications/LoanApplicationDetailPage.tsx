import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DefinitionList } from "@/components/Breadcrumbs";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Panel } from "@/components/PageHeader";
import { EmptyState, QueryState } from "@/components/QueryState";
import {
  ApplicationStatusBadge,
  FacilityStatusBadge,
  VersionBadge,
} from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { usePageMeta } from "@/components/pageMeta";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { loanApplicationKeys, loanFacilityKeys, productKeys } from "@/lib/api/keys";
import {
  approveLoanApplication,
  getLoanApplication,
  listApplicationStatusHistory,
  rejectLoanApplication,
  startLoanApplicationReview,
  submitLoanApplication,
  updateLoanApplication,
} from "@/lib/api/loan-applications";
import { listVersions } from "@/lib/api/products";
import type {
  ApplicationStatusHistoryEntry,
  LoanApplicationDetail,
  LoanApplicationWriteInput,
} from "@/lib/api/types";
import { displayText, formatTimestamp, fullName } from "@/lib/format";
import { ApplicationConfigurationForm } from "@/features/loan-applications/ApplicationConfigurationForm";
import { DecisionHistorySection } from "@/features/loan-applications/DecisionHistorySection";
import { EligibilitySection } from "@/features/loan-applications/EligibilitySection";
import { historyCopy, versionSummary } from "@/features/loan-applications/presentation";
import { WorkflowDecisionDialog } from "@/features/loan-applications/WorkflowDecisionDialog";
import { CreateFacilityDialog } from "@/features/loan-facilities/CreateFacilityDialog";
import { createLoanFacility } from "@/lib/api/loan-facilities";

type HistoryQuery = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: ApplicationStatusHistoryEntry[] | undefined;
  refetch: () => Promise<unknown>;
};

export function LoanApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const application = useQuery({
    queryKey: loanApplicationKeys.detail(applicationId),
    queryFn: ({ signal }) => getLoanApplication(applicationId, signal),
    enabled: applicationId.length > 0,
  });
  const history = useQuery({
    queryKey: loanApplicationKeys.history(applicationId),
    queryFn: ({ signal }) => listApplicationStatusHistory(applicationId, signal),
    enabled: application.isSuccess,
  });
  const versions = useQuery({
    queryKey: productKeys.versions(application.data?.loanProductId ?? "none"),
    queryFn: ({ signal }) => listVersions(application.data?.loanProductId ?? "", signal),
    enabled: Boolean(application.data?.loanProductId),
  });
  const [editing, setEditing] = useState(false);
  const [editSession, setEditSession] = useState(0);
  const [pendingAction, setPendingAction] = useState<
    "submit" | "review" | "approve" | "reject" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [facilityNotice, setFacilityNotice] = useState<string | null>(null);

  const missing =
    application.isError &&
    application.error instanceof ApiError &&
    (application.error.status === 404 || application.error.status === 400);
  const title =
    application.data?.applicationNumber ?? (missing ? "Application not found" : "Loan application");

  usePageMeta(title, [{ label: "Loan Applications", to: "/loan-applications" }, { label: title }]);

  async function saveDraft(input: LoanApplicationWriteInput) {
    if (!application.data) return;
    await updateLoanApplication(application.data.id, input);
    await queryClient.invalidateQueries({ queryKey: loanApplicationKeys.all });
    toast.success("Application saved.");
  }

  async function refreshWorkflow(applicationRecordId: string) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: loanApplicationKeys.detail(applicationRecordId),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: loanApplicationKeys.history(applicationRecordId),
      }),
      queryClient.invalidateQueries({
        queryKey: loanApplicationKeys.decisions(applicationRecordId),
      }),
      queryClient.invalidateQueries({ queryKey: ["loan-applications", "list"] }),
    ]);
  }

  async function runDecision(authorizedPrincipalAmount?: string, remarks?: string) {
    if (
      (pendingAction !== "approve" && pendingAction !== "reject") ||
      actionBusy ||
      !application.data
    ) {
      return;
    }
    if (pendingAction === "approve" && !authorizedPrincipalAmount) return;
    const applicationRecordId = application.data.id;
    setActionBusy(true);
    setActionError(null);
    try {
      if (pendingAction === "approve" && authorizedPrincipalAmount) {
        await approveLoanApplication(applicationRecordId, authorizedPrincipalAmount, remarks);
        toast.success("Application approved.");
      } else {
        await rejectLoanApplication(applicationRecordId, remarks ?? "");
        toast.success("Application rejected.");
      }
      await refreshWorkflow(applicationRecordId);
      setPendingAction(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        await refreshWorkflow(applicationRecordId);
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCreateFacility(facilityDate: string) {
    if (!application.data || createBusy) return;
    const applicationRecordId = application.data.id;
    setCreateBusy(true);
    try {
      const created = await createLoanFacility(applicationRecordId, {
        facilityDate,
        currencyCode: "LKR",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: loanApplicationKeys.detail(applicationRecordId),
        }),
        queryClient.invalidateQueries({ queryKey: loanFacilityKeys.all }),
      ]);
      toast.success(`Facility ${created.facilityNumber} created.`);
      setCreateOpen(false);
      navigate(`/loan-facilities/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        const latest = await queryClient.fetchQuery({
          queryKey: loanApplicationKeys.detail(applicationRecordId),
          queryFn: ({ signal }) => getLoanApplication(applicationRecordId, signal),
        });
        if (latest.facility) {
          setFacilityNotice(getErrorMessage(error));
          setCreateOpen(false);
          return;
        }
      }
      throw error;
    } finally {
      setCreateBusy(false);
    }
  }

  async function runAction() {
    if (
      (pendingAction !== "submit" && pendingAction !== "review") ||
      actionBusy ||
      !application.data
    ) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      if (pendingAction === "submit") {
        await submitLoanApplication(application.data.id);
        toast.success("Application submitted.");
      } else {
        await startLoanApplicationReview(application.data.id);
        toast.success("Review started.");
      }
      await queryClient.invalidateQueries({ queryKey: loanApplicationKeys.all });
      setPendingAction(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        await queryClient.invalidateQueries({ queryKey: loanApplicationKeys.all });
      }
    } finally {
      setActionBusy(false);
    }
  }

  if (missing) {
    return (
      <EmptyState
        title="Application not found"
        description="This application does not exist, or the address is not valid."
        action={
          <ButtonLink to="/loan-applications" variant="secondary">
            Back to loan applications
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <QueryState
        isLoading={application.isPending}
        isError={application.isError && application.data === undefined}
        error={application.error}
        onRetry={() => void application.refetch()}
        loadingLabel="Loading loan application"
      >
        {application.data ? (
          <ApplicationWorkspace
            application={application.data}
            versionDates={versions.data?.find(
              (version) => version.id === application.data?.productVersionId,
            )}
            editing={editing}
            editSession={editSession}
            onEdit={() => {
              setEditSession((session) => session + 1);
              setEditing(true);
            }}
            onStopEditing={() => setEditing(false)}
            onSave={saveDraft}
            onSubmit={() => {
              setActionError(null);
              setPendingAction("submit");
            }}
            onStartReview={() => {
              setActionError(null);
              setPendingAction("review");
            }}
            onApprove={() => {
              setActionError(null);
              setPendingAction("approve");
            }}
            onReject={() => {
              setActionError(null);
              setPendingAction("reject");
            }}
            decisionLocked={actionBusy || pendingAction === "approve" || pendingAction === "reject"}
            facilityNotice={facilityNotice}
            onCreateFacility={() => {
              setFacilityNotice(null);
              setCreateOpen(true);
            }}
            history={history}
          />
        ) : null}
      </QueryState>
      {pendingAction === "submit" || pendingAction === "review" ? (
        <ConfirmDialog
          open
          title={
            pendingAction === "review"
              ? `Start review for ${application.data?.applicationNumber ?? "this application"}?`
              : `Submit ${application.data?.applicationNumber ?? "this application"}?`
          }
          description={
            pendingAction === "review"
              ? "This moves the application from Submitted to Under review."
              : "After submission, the borrower, loan product, version, and purpose can no longer be edited in the current workflow."
          }
          confirmLabel={pendingAction === "review" ? "Start review" : "Submit application"}
          busy={actionBusy}
          error={actionError}
          onConfirm={() => void runAction()}
          onClose={() => {
            if (!actionBusy) setPendingAction(null);
          }}
        />
      ) : null}
      {pendingAction === "approve" || pendingAction === "reject" ? (
        <WorkflowDecisionDialog
          mode={pendingAction}
          applicationNumber={application.data?.applicationNumber ?? "this application"}
          busy={actionBusy}
          error={actionError}
          canDecide={application.data?.status === "UNDER_REVIEW"}
          onApprove={(amount, remarks) => void runDecision(amount, remarks)}
          onReject={(remarks) => void runDecision(undefined, remarks)}
          onClose={() => {
            if (!actionBusy) setPendingAction(null);
          }}
        />
      ) : null}
      {createOpen && application.data ? (
        <CreateFacilityDialog
          applicationNumber={application.data.applicationNumber}
          busy={createBusy}
          error={null}
          onSubmit={handleCreateFacility}
          onClose={() => {
            if (!createBusy) setCreateOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function ApplicationWorkspace({
  application,
  versionDates,
  editing,
  editSession,
  onEdit,
  onStopEditing,
  onSave,
  onSubmit,
  onStartReview,
  onApprove,
  onReject,
  decisionLocked,
  facilityNotice,
  onCreateFacility,
  history,
}: {
  application: LoanApplicationDetail;
  versionDates?: { versionNumber: number; effectiveFrom: string; effectiveTo: string | null };
  editing: boolean;
  editSession: number;
  onEdit: () => void;
  onStopEditing: () => void;
  onSave: (input: LoanApplicationWriteInput) => Promise<void>;
  onSubmit: () => void;
  onStartReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  decisionLocked: boolean;
  facilityNotice: string | null;
  onCreateFacility: () => void;
  history: HistoryQuery;
}) {
  const version = versionDates ?? application.productVersion;
  const stateNote =
    application.status === "SUBMITTED"
      ? "Configuration is read-only after submission."
      : application.status === "UNDER_REVIEW"
        ? "Under review. An eligibility assessment does not change the application status."
        : application.status === "APPROVED"
          ? application.facility
            ? `Application approved. Facility ${application.facility.facilityNumber} is linked to this application.`
            : "Application approved. Create a facility when funds should be authorized for disbursement. Approval does not disburse funds."
          : application.status === "REJECTED"
            ? "Application rejected. The recorded reason is in the decision history."
            : null;

  return (
    <div className="stack">
      {facilityNotice ? (
        <p className="callout" role="status">
          {facilityNotice}
        </p>
      ) : null}
      <header className="identity-header">
        <div>
          <p className="eyebrow">Loan application</p>
          <div className="identity-header__title">
            <h1 className="record-number">{application.applicationNumber}</h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <dl className="identity-stats">
            <div className="identity-stat">
              <dt>Borrower</dt>
              <dd>
                <Link to={`/borrowers/${application.borrower.id}`}>
                  {fullName(application.borrower)}
                </Link>
              </dd>
            </div>
            <div className="identity-stat">
              <dt>Loan product</dt>
              <dd>
                <Link to={`/products/${application.loanProduct.id}`}>
                  {application.loanProduct.name} ({application.loanProduct.code})
                </Link>
              </dd>
            </div>
            <div className="identity-stat">
              <dt>Product version</dt>
              <dd>{versionSummary(version)}</dd>
            </div>
            {application.productPurpose ? (
              <div className="identity-stat">
                <dt>Purpose</dt>
                <dd>
                  {application.productPurpose.name} ({application.productPurpose.code})
                </dd>
              </div>
            ) : null}
            {application.facility ? (
              <div className="identity-stat">
                <dt>Facility</dt>
                <dd className="inline-status">
                  <Link to={`/loan-facilities/${application.facility.id}`}>
                    {application.facility.facilityNumber}
                  </Link>
                  <FacilityStatusBadge status={application.facility.status} />
                </dd>
              </div>
            ) : null}
            <div className="identity-stat">
              <dt>Created</dt>
              <dd>
                <time dateTime={application.createdAt}>
                  {formatTimestamp(application.createdAt)}
                </time>
              </dd>
            </div>
            {application.submittedAt ? (
              <div className="identity-stat">
                <dt>Submitted</dt>
                <dd>
                  <time dateTime={application.submittedAt}>
                    {formatTimestamp(application.submittedAt)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
          {stateNote ? <p className="state-note">{stateNote}</p> : null}
        </div>
        {editing ? null : (
          <div className="page-header__actions">
            {application.status === "DRAFT" ? (
              <>
                <Button type="button" variant="secondary" onClick={onEdit}>
                  Edit draft
                </Button>
                <Button type="button" onClick={onSubmit}>
                  Submit application
                </Button>
              </>
            ) : null}
            {application.status === "SUBMITTED" ? (
              <Button type="button" onClick={onStartReview}>
                Start review
              </Button>
            ) : null}
            {application.status === "UNDER_REVIEW" ? (
              <>
                <Button type="button" onClick={onApprove} disabled={decisionLocked}>
                  Approve
                </Button>
                <Button type="button" variant="danger" onClick={onReject} disabled={decisionLocked}>
                  Reject
                </Button>
              </>
            ) : null}
            {application.status === "APPROVED" && application.facility === null ? (
              <Button type="button" onClick={onCreateFacility}>
                Create Facility
              </Button>
            ) : null}
            {application.facility ? (
              <ButtonLink to={`/loan-facilities/${application.facility.id}`}>
                View Facility
              </ButtonLink>
            ) : null}
          </div>
        )}
      </header>

      <div className="application-layout">
        <div className="stack">
          {editing && application.status === "DRAFT" ? (
            <Panel
              title="Edit draft"
              description="Changing the loan product clears the version and purpose so they can be chosen again."
            >
              <ApplicationConfigurationForm
                key={editSession}
                formId="edit-application-form"
                requireChanges
                submitLabel="Save"
                submittingLabel="Saving…"
                initial={{
                  borrowerId: application.borrowerId,
                  loanProductId: application.loanProductId,
                  productVersionId: application.productVersionId,
                  productPurposeId: application.productPurposeId ?? "",
                }}
                current={{
                  borrower: application.borrower,
                  loanProduct: application.loanProduct,
                  productVersion: application.productVersion,
                  productPurpose: application.productPurpose,
                }}
                onSubmit={onSave}
                onComplete={onStopEditing}
                onCancel={onStopEditing}
              />
            </Panel>
          ) : (
            <Panel title="Overview">
              <DefinitionList
                items={[
                  {
                    label: "Borrower",
                    value: (
                      <Link to={`/borrowers/${application.borrower.id}`}>
                        {fullName(application.borrower)}
                      </Link>
                    ),
                  },
                  {
                    label: "Loan product",
                    value: (
                      <Link to={`/products/${application.loanProduct.id}`}>
                        {application.loanProduct.name} ({application.loanProduct.code})
                      </Link>
                    ),
                  },
                  {
                    label: "Product version",
                    value: (
                      <span className="inline-status">
                        <span>{versionSummary(version)}</span>
                        <VersionBadge status={application.productVersion.status} />
                      </span>
                    ),
                  },
                  {
                    label: "Purpose",
                    value: application.productPurpose
                      ? `${application.productPurpose.name} (${application.productPurpose.code})`
                      : "None",
                  },
                  {
                    label: "Created",
                    value: (
                      <time dateTime={application.createdAt}>
                        {formatTimestamp(application.createdAt)}
                      </time>
                    ),
                  },
                  {
                    label: "Submitted",
                    value: application.submittedAt ? (
                      <time dateTime={application.submittedAt}>
                        {formatTimestamp(application.submittedAt)}
                      </time>
                    ) : (
                      displayText(null)
                    ),
                  },
                ]}
              />
            </Panel>
          )}
        </div>
        <div className="stack">
          <Panel title="Status history">
            <StatusHistory history={history} />
          </Panel>
          <DecisionHistorySection applicationId={application.id} />
        </div>
      </div>
      <EligibilitySection
        applicationId={application.id}
        applicationNumber={application.applicationNumber}
        status={application.status}
      />
    </div>
  );
}

function StatusHistory({ history }: { history: HistoryQuery }) {
  if (history.isPending) {
    return (
      <div className="panel-loading" role="status">
        <span className="visually-hidden">Loading status history</span>
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--short" />
      </div>
    );
  }

  if (history.isError) {
    return (
      <div className="stack-sm" role="alert">
        <p>{getErrorMessage(history.error)}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void history.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!history.data || history.data.length === 0) {
    return <p className="muted">No status history is recorded.</p>;
  }

  return (
    <ol className="timeline">
      {history.data.map((entry) => {
        const copy = historyCopy(entry);
        return (
          <li key={entry.id} className="timeline__item">
            <span className="timeline__marker" aria-hidden="true" />
            <div>
              <p className="timeline__title">{copy.title}</p>
              <p className="timeline__meta">
                {copy.detail} ·{" "}
                <time dateTime={entry.changedAt}>{formatTimestamp(entry.changedAt)}</time>
              </p>
              {entry.note?.trim() ? <p className="timeline__meta">{entry.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
