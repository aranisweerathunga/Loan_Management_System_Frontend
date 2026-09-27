import { ButtonLink } from "@/components/Button";
import { EmptyState } from "@/components/QueryState";
import { usePageMeta } from "@/components/pageMeta";

export function NotFoundPage() {
  usePageMeta("Page not found", [{ label: "Page not found" }]);

  return (
    <EmptyState
      title="Page not found"
      description="This address is not part of the loan operations workspace."
      action={
        <ButtonLink to="/dashboard" variant="primary">
          Go to dashboard
        </ButtonLink>
      }
    />
  );
}
