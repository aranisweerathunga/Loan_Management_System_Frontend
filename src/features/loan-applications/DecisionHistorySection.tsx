import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Panel } from "@/components/PageHeader";
import { ApplicationStatusBadge } from "@/components/StatusBadge";
import { getErrorMessage } from "@/lib/api/client";
import { loanApplicationKeys } from "@/lib/api/keys";
import { listApplicationDecisions } from "@/lib/api/loan-applications";
import { formatTimestamp } from "@/lib/format";

export function DecisionHistorySection({ applicationId }: { applicationId: string }) {
  const decisions = useQuery({
    queryKey: loanApplicationKeys.decisions(applicationId),
    queryFn: ({ signal }) => listApplicationDecisions(applicationId, signal),
  });

  return (
    <Panel
      title="Decisions"
      description="Explicit approval and rejection decisions. A decision does not create a loan facility."
    >
      {decisions.isPending ? (
        <div className="panel-loading" role="status">
          <span className="visually-hidden">Loading decisions</span>
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--short" />
        </div>
      ) : decisions.isError ? (
        <div className="stack-sm" role="alert">
          <p>{getErrorMessage(decisions.error)}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void decisions.refetch()}>
            Try again
          </Button>
        </div>
      ) : decisions.data.length === 0 ? (
        <p>No approval decision has been recorded.</p>
      ) : (
        <ol className="eligibility-history">
          {decisions.data.map((decision, index) => (
            <li key={decision.id} className="eligibility-history__item">
              <div className="eligibility-history__main">
                <div className="inline-status">
                  <ApplicationStatusBadge status={decision.decision} />
                  {index === 0 && decisions.data.length > 1 ? (
                    <span className="eligibility-kicker">Latest</span>
                  ) : null}
                </div>
                <p className="eligibility-meta">
                  Decided{" "}
                  <time dateTime={decision.decidedAt}>{formatTimestamp(decision.decidedAt)}</time>
                </p>
                {decision.remarks ? (
                  <p className="decision-remarks">{decision.remarks}</p>
                ) : (
                  <p className="eligibility-meta">No remarks recorded.</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
