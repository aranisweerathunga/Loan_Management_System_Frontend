import type { ReactNode } from "react";
import { Inbox, AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/Button";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon ?? <Inbox aria-hidden="true" size={28} />}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
      <div className="skeleton skeleton--block" />
    </div>
  );
}

export function ErrorState({
  title = "This information could not be loaded",
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle aria-hidden="true" size={28} />
      <h2>{title}</h2>
      <p>{getErrorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  empty,
  loadingLabel,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  empty?: ReactNode;
  loadingLabel?: string;
  children: ReactNode;
}) {
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return empty ?? null;
  return children;
}
