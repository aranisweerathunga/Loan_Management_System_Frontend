import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DefinitionList } from "@/components/Breadcrumbs";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Panel } from "@/components/PageHeader";
import { EmptyState, QueryState } from "@/components/QueryState";
import { ApplicationStatusBadge, VersionBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { usePageMeta } from "@/components/pageMeta";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { loanApplicationKeys, productKeys } from "@/lib/api/keys";
import {
  getLoanApplication,
  listApplicationStatusHistory,
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
import { historyCopy, versionSummary } from "@/features/loan-applications/presentation";

type HistoryQuery = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: ApplicationStatusHistoryEntry[] | undefined;
  refetch: () => Promise<unknown>;
};

export function LoanApplicationDetailPage() {
  const { applicationId = "" } = useParams();
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
  const [pendingAction, setPendingAction] = useState<"submit" | "review" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

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

  async function runAction() {
    if (!pendingAction || actionBusy || !application.data) return;
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
            history={history}
          />
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={pendingAction !== null}
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
  history: HistoryQuery;
}) {
  const version = versionDates ?? application.productVersion;
  const stateNote =
    application.status === "SUBMITTED"
      ? "Configuration is read-only after submission."
      : application.status === "UNDER_REVIEW"
        ? "Under review. No further action is available in this workflow."
        : null;

  return (
    <div className="stack">
      <header className="identity-header">
        <div>
          <p className="eyebrow">Loan application</p>
          <div className="identity-header__title">
            <h1 className="record-number">{application.applicationNumber}</h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <ul className="identity-facts">
            <li>
              <Link to={`/borrowers/${application.borrower.id}`}>
                {fullName(application.borrower)}
              </Link>
            </li>
            <li>
              <Link to={`/products/${application.loanProduct.id}`}>
                {application.loanProduct.name} ({application.loanProduct.code})
              </Link>
            </li>
            <li>{versionSummary(version)}</li>
            {application.productPurpose ? (
              <li>
                {application.productPurpose.name} ({application.productPurpose.code})
              </li>
            ) : null}
            <li>
              Created{" "}
              <time dateTime={application.createdAt}>{formatTimestamp(application.createdAt)}</time>
            </li>
            {application.submittedAt ? (
              <li>
                Submitted{" "}
                <time dateTime={application.submittedAt}>
                  {formatTimestamp(application.submittedAt)}
                </time>
              </li>
            ) : null}
          </ul>
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
          <Panel title="Eligibility">
            {application.eligibilityAssessments.length === 0 ? (
              <p>Eligibility has not been assessed yet.</p>
            ) : (
              <ul className="assessment-list">
                {application.eligibilityAssessments.map((assessment) => (
                  <li key={assessment.id}>
                    <strong>{assessment.status === "PENDING" ? "Pending" : "Completed"}</strong>
                    <span className="muted">
                      {assessment.assessedAt ? (
                        <>
                          Assessed{" "}
                          <time dateTime={assessment.assessedAt}>
                            {formatTimestamp(assessment.assessedAt)}
                          </time>
                        </>
                      ) : (
                        <>
                          Recorded{" "}
                          <time dateTime={assessment.createdAt}>
                            {formatTimestamp(assessment.createdAt)}
                          </time>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
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
