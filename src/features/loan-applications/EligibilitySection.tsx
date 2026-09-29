import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import {
  ApplicationStatusBadge,
  EligibilityOutcomeBadge,
  VersionBadge,
  eligibilityOutcomeLabel,
} from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { loanApplicationKeys } from "@/lib/api/keys";
import {
  createEligibilityAssessment,
  getEligibilityAssessment,
  listEligibilityAssessments,
} from "@/lib/api/loan-applications";
import type { EligibilityAssessmentRecord, LoanApplicationStatus } from "@/lib/api/types";
import { displayText, formatTimestamp } from "@/lib/format";
import {
  assessmentStatusLabel,
  readAssessmentResult,
  readConfiguredRules,
  readInputContext,
  reasonText,
  ruleOutcomeLabel,
  type AssessmentResultView,
} from "@/features/loan-applications/eligibilityPresentation";

const ruleNotExecutableMessage =
  "This product version contains an eligibility rule that cannot yet be evaluated because its business configuration has not been finalized.";

function assessmentFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "RULE_NOT_EXECUTABLE") {
    return ruleNotExecutableMessage;
  }
  return getErrorMessage(error);
}

export function EligibilitySection({
  applicationId,
  applicationNumber,
  status,
}: {
  applicationId: string;
  applicationNumber: string;
  status: LoanApplicationStatus;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const assessments = useQuery({
    queryKey: loanApplicationKeys.assessments(applicationId),
    queryFn: ({ signal }) => listEligibilityAssessments(applicationId, signal),
  });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canAssess = status === "UNDER_REVIEW";
  const hasAssessments = (assessments.data?.length ?? 0) > 0;
  const latest = assessments.data?.[0];

  async function refreshAfterConflict() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: loanApplicationKeys.detail(applicationId),
        exact: true,
      }),
      queryClient.invalidateQueries({ queryKey: loanApplicationKeys.assessments(applicationId) }),
    ]);
  }

  async function runAssessment() {
    if (!canAssess || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await createEligibilityAssessment(applicationId);
      await refreshAfterConflict();
      toast.success("Eligibility assessment recorded.");
      setConfirming(false);
    } catch (error) {
      setActionError(assessmentFailureMessage(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        await refreshAfterConflict();
      }
    } finally {
      setBusy(false);
    }
  }

  const runLabel = hasAssessments ? "Reassess" : "Run assessment";

  return (
    <>
      <Panel
        title="Eligibility"
        description="Assessments use the product version bound to this application. Earlier assessments are kept."
        actions={
          canAssess ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setActionError(null);
                setConfirming(true);
              }}
            >
              {runLabel}
            </Button>
          ) : null
        }
      >
        {assessments.isPending ? (
          <div className="panel-loading" role="status">
            <span className="visually-hidden">Loading eligibility assessments</span>
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--short" />
          </div>
        ) : assessments.isError ? (
          <div className="stack-sm" role="alert">
            <p>{getErrorMessage(assessments.error)}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void assessments.refetch()}>
              Try again
            </Button>
          </div>
        ) : assessments.data && assessments.data.length === 0 ? (
          <EmptyAssessments status={status} />
        ) : assessments.data ? (
          <AssessmentSummary latest={latest} assessments={assessments.data} onView={setSelectedId} />
        ) : null}
      </Panel>
      <ConfirmDialog
        open={confirming}
        title={hasAssessments ? `Reassess ${applicationNumber}?` : `Run assessment for ${applicationNumber}?`}
        description="This uses the product version bound to this application. A new assessment record will be created. Earlier assessments remain unchanged."
        confirmLabel={hasAssessments ? "Reassess" : "Run assessment"}
        busy={busy}
        error={actionError}
        onConfirm={() => void runAssessment()}
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
      />
      <AssessmentDetailDialog
        applicationId={applicationId}
        assessmentId={selectedId}
        latestId={latest?.id ?? null}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

function EmptyAssessments({ status }: { status: LoanApplicationStatus }) {
  if (status === "UNDER_REVIEW") {
    return <p>No eligibility assessment has been recorded.</p>;
  }
  if (status === "SUBMITTED") {
    return (
      <p>
        No eligibility assessment has been recorded. Start review before eligibility can be assessed.
      </p>
    );
  }
  return (
    <p>
      No eligibility assessment has been recorded. Submit the application and move it to review before
      eligibility can be assessed.
    </p>
  );
}

function AssessmentSummary({
  latest,
  assessments,
  onView,
}: {
  latest: EligibilityAssessmentRecord | undefined;
  assessments: EligibilityAssessmentRecord[];
  onView: (assessmentId: string) => void;
}) {
  if (!latest) return null;
  const result = readAssessmentResult(latest.resultSnapshot);
  const when = latest.assessedAt ?? latest.createdAt;
  return (
    <div className="eligibility-summary">
      <div>
        <p className="eligibility-kicker">Latest assessment</p>
        <div className="inline-status">
          {result.outcome ? <EligibilityOutcomeBadge outcome={result.outcome} /> : <span>Outcome not recorded</span>}
          <span className="muted">{assessmentStatusLabel(latest.status)}</span>
        </div>
        <p className="eligibility-meta">
          {latest.assessedAt ? "Assessed" : "Recorded"}{" "}
          <time dateTime={when}>{formatTimestamp(when)}</time>
        </p>
        <ReasonLines result={result} />
      </div>
      {assessments.length === 1 ? (
        <div className="eligibility-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => onView(latest.id)}>
            View details
          </Button>
        </div>
      ) : null}
      {assessments.length > 1 ? (
        <div>
          <h3 className="eligibility-kicker">Assessment history</h3>
          <p className="eligibility-meta">Newest first. Earlier assessments are unchanged.</p>
          <ol className="eligibility-history">
            {assessments.map((assessment, index) => {
              const itemResult = readAssessmentResult(assessment.resultSnapshot);
              const itemWhen = assessment.assessedAt ?? assessment.createdAt;
              return (
                <li key={assessment.id} className="eligibility-history__item">
                  <div className="eligibility-history__main">
                    <div className="inline-status">
                      {itemResult.outcome ? (
                        <EligibilityOutcomeBadge outcome={itemResult.outcome} />
                      ) : (
                        <span>Outcome not recorded</span>
                      )}
                      {index === 0 ? <span className="muted">Latest</span> : null}
                      <span className="muted">{assessmentStatusLabel(assessment.status)}</span>
                    </div>
                    <p className="eligibility-meta">
                      <time dateTime={itemWhen}>{formatTimestamp(itemWhen)}</time>
                    </p>
                    <ReasonLines result={itemResult} />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onView(assessment.id)}>
                    View details
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="eligibility-meta">This is the only assessment recorded for this application.</p>
      )}
    </div>
  );
}

function ReasonLines({ result }: { result: AssessmentResultView }) {
  const known = result.reasonCodes.filter((code) => reasonText(code) !== code);
  const unknown = result.reasonCodes.filter((code) => reasonText(code) === code);
  const knownLabels = known.map((code) => reasonText(code));
  const summaryRepeatsKnown =
    result.summary !== null &&
    knownLabels.some((label) => result.summary?.startsWith(label.replace(/\.$/, "")));
  return (
    <div className="stack-sm">
      {known.map((code) => (
        <p key={code}>{reasonText(code)}</p>
      ))}
      {result.summary && !summaryRepeatsKnown ? <p>{result.summary}</p> : null}
      {unknown.map((code) => (
        <p key={code} className="eligibility-meta">
          {code}
        </p>
      ))}
    </div>
  );
}

function AssessmentDetailDialog({
  applicationId,
  assessmentId,
  latestId,
  onClose,
}: {
  applicationId: string;
  assessmentId: string | null;
  latestId: string | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: loanApplicationKeys.assessment(applicationId, assessmentId ?? "none"),
    queryFn: ({ signal }) => getEligibilityAssessment(applicationId, assessmentId ?? "", signal),
    enabled: assessmentId !== null,
  });

  return (
    <Modal
      open={assessmentId !== null}
      title="Eligibility assessment"
      size="lg"
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <QueryState
        isLoading={detail.isPending}
        isError={detail.isError}
        error={detail.error}
        onRetry={() => void detail.refetch()}
        loadingLabel="Loading assessment"
      >
        {detail.data ? (
          <AssessmentDetailBody assessment={detail.data} latest={detail.data.id === latestId} />
        ) : null}
      </QueryState>
    </Modal>
  );
}

function AssessmentDetailBody({
  assessment,
  latest,
}: {
  assessment: EligibilityAssessmentRecord;
  latest: boolean;
}) {
  const result = readAssessmentResult(assessment.resultSnapshot);
  const context = readInputContext(assessment.inputSnapshot);
  const configured = readConfiguredRules(assessment.ruleSnapshot);
  const when = assessment.assessedAt ?? assessment.createdAt;
  return (
    <div className="stack">
      <section className="eligibility-section">
        <h3>Assessment</h3>
        <div className="inline-status">
          {result.outcome ? <EligibilityOutcomeBadge outcome={result.outcome} /> : <span>Outcome not recorded</span>}
          <span>{assessmentStatusLabel(assessment.status)}</span>
          {latest ? <span className="muted">Latest</span> : <span className="muted">Earlier assessment</span>}
        </div>
        <p className="eligibility-meta">
          {assessment.assessedAt ? "Assessed" : "Recorded"}{" "}
          <time dateTime={when}>{formatTimestamp(when)}</time>
        </p>
        <ReasonLines result={result} />
        {result.reasonCodes.length > 0 ? (
          <p className="eligibility-meta">Reason codes: {result.reasonCodes.join(", ")}</p>
        ) : null}
      </section>
      <section className="eligibility-section">
        <h3>Application context</h3>
        <dl className="eligibility-facts">
          <Fact label="Application" value={displayText(context.applicationNumber)} />
            <Fact
            label="Application status"
            value={
              context.applicationStatus === "DRAFT" ||
              context.applicationStatus === "SUBMITTED" ||
              context.applicationStatus === "UNDER_REVIEW" ? (
                <ApplicationStatusBadge status={context.applicationStatus} />
              ) : (
                displayText(context.applicationStatus)
              )
            }
          />
          <Fact label="Borrower" value={displayText(context.borrowerName)} />
          <Fact label="Loan product" value={displayText(context.productName)} />
          <Fact
            label="Product version"
            value={
              <span className="inline-status">
                <span>
                  {context.versionNumber !== null ? `Version ${context.versionNumber}` : "—"}
                </span>
                {context.versionStatus === "ACTIVE" ||
                context.versionStatus === "DRAFT" ||
                context.versionStatus === "RETIRED" ? (
                  <VersionBadge status={context.versionStatus} />
                ) : (
                  <span>{displayText(context.versionStatus)}</span>
                )}
              </span>
            }
          />
          {context.purposeName ? <Fact label="Purpose" value={context.purposeName} /> : null}
        </dl>
      </section>
      <section className="eligibility-section">
        <h3>Rules evaluated</h3>
        <ConfiguredRules state={configured.state} rules={configured.rules} />
        {result.rules.length === 0 ? (
          <p>No eligibility rules were evaluated.</p>
        ) : (
          <ul className="eligibility-history">
            {result.rules.map((rule) => (
              <li key={`${rule.index}-${rule.type}`} className="eligibility-history__item">
                <div className="eligibility-history__main">
                  <div className="inline-status">
                    <strong>{rule.type}</strong>
                    {rule.outcome ? (
                      <span>{ruleOutcomeLabel(rule.outcome)}</span>
                    ) : (
                      <span>Outcome not recorded</span>
                    )}
                  </div>
                  {rule.reasonCodes.map((code) => (
                    <p key={code}>{reasonText(code)}</p>
                  ))}
                  {rule.summary ? <p>{rule.summary}</p> : null}
                  {rule.calculated.length > 0 ? (
                    <dl className="eligibility-facts">
                      {rule.calculated.map((item) => (
                        <Fact key={item.key} label={item.key} value={item.value} />
                      ))}
                    </dl>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="eligibility-section">
        <h3>Result</h3>
        <p>
          Overall outcome:{" "}
          {result.outcome ? eligibilityOutcomeLabel(result.outcome) : "Not recorded"}
        </p>
        {result.summary ? <p>{result.summary}</p> : null}
      </section>
      <details className="eligibility-section">
        <summary>Recorded snapshots</summary>
        <SnapshotRaw title="Inputs" value={assessment.inputSnapshot} />
        <SnapshotRaw title="Rules" value={assessment.ruleSnapshot} />
        <SnapshotRaw title="Result" value={assessment.resultSnapshot} />
      </details>
    </div>
  );
}

function ConfiguredRules({
  state,
  rules,
}: {
  state: "absent" | "empty" | "rules" | "unknown";
  rules: Array<{ type: string; fields: Array<{ label: string; value: string }> }>;
}) {
  if (state === "absent") {
    return <p>No eligibility configuration was recorded for this product version.</p>;
  }
  if (state === "empty") {
    return <p>The eligibility rule list was empty.</p>;
  }
  if (state === "unknown" || rules.length === 0) {
    return <p>Configured rules could not be read from the recorded snapshot.</p>;
  }
  return (
    <ul className="eligibility-history">
      {rules.map((rule) => (
        <li key={rule.type} className="eligibility-history__item">
          <div className="eligibility-history__main">
            <p>
              <strong>{rule.type}</strong>
            </p>
            {rule.fields.length > 0 ? (
              <dl className="eligibility-facts">
                {rule.fields.map((field) => (
                  <Fact key={field.label} label={field.label} value={field.value} />
                ))}
              </dl>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SnapshotRaw({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h4>{title}</h4>
      <pre className="snapshot-raw">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
