import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader, Panel } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { usePageMeta } from "@/components/pageMeta";
import { loanApplicationKeys } from "@/lib/api/keys";
import { createLoanApplication } from "@/lib/api/loan-applications";
import type { LoanApplicationWriteInput } from "@/lib/api/types";
import { ApplicationConfigurationForm } from "@/features/loan-applications/ApplicationConfigurationForm";

export function NewLoanApplicationPage() {
  usePageMeta("New application", [
    { label: "Loan Applications", to: "/loan-applications" },
    { label: "New application" },
  ]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const createdPath = useRef<string | null>(null);

  async function handleSubmit(input: LoanApplicationWriteInput) {
    const created = await createLoanApplication(input);
    await queryClient.invalidateQueries({ queryKey: loanApplicationKeys.all });
    toast.success(`Draft ${created.applicationNumber} created.`);
    createdPath.current = `/loan-applications/${created.id}`;
  }

  return (
    <div className="stack">
      <PageHeader
        title="New application"
        description="Creates a draft. The application number is assigned when the draft is saved."
      />
      <Panel
        title="Application configuration"
        description="Product version is required. Purpose is optional."
      >
        <ApplicationConfigurationForm
          formId="new-application-form"
          submitLabel="Create draft"
          submittingLabel="Creating…"
          onSubmit={handleSubmit}
          onComplete={() => {
            if (createdPath.current) navigate(createdPath.current);
          }}
          onCancel={() => navigate("/loan-applications")}
        />
      </Panel>
    </div>
  );
}
