import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ActiveBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { createEmployeeProfile, updateEmployeeProfile } from "@/lib/api/borrowers";
import { getErrorMessage } from "@/lib/api/client";
import { borrowerKeys } from "@/lib/api/keys";
import type { EmployeeProfile } from "@/lib/api/types";
import { formatTimestamp } from "@/lib/format";

export function EmployeeProfileCallout({
  borrowerId,
  profile,
}: {
  borrowerId: string;
  profile: EmployeeProfile | null;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState<"enable" | "activate" | "deactivate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (next: "enable" | "activate" | "deactivate") => {
      if (next === "enable") return createEmployeeProfile(borrowerId, true);
      return updateEmployeeProfile(borrowerId, next === "activate");
    },
    onSuccess: async (_result, next) => {
      await queryClient.invalidateQueries({ queryKey: borrowerKeys.all });
      toast.success(next === "enable" ? "Employee profile enabled." : "Employee profile updated.");
      setAction(null);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  function ask(next: "enable" | "activate" | "deactivate") {
    setError(null);
    setAction(next);
  }

  return (
    <div className="callout">
      {profile ? (
        <>
          <div className="cluster">
            <strong>Employee profile</strong>
            <ActiveBadge active={profile.isActive} />
          </div>
          <p className="muted">
            Enabled {formatTimestamp(profile.createdAt)}. A borrower does not have to keep this
            profile active.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => ask(profile.isActive ? "deactivate" : "activate")}
          >
            {profile.isActive ? "Mark profile inactive" : "Mark profile active"}
          </Button>
        </>
      ) : (
        <>
          <strong>No employee profile</strong>
          <p>
            Employment history, grade history, and EPF balances are available only after an employee
            profile is enabled. A generic borrower does not have to be an employee.
          </p>
          <Button type="button" onClick={() => ask("enable")}>
            Enable employee profile
          </Button>
        </>
      )}
      <ConfirmDialog
        open={action !== null}
        title={
          action === "enable"
            ? "Enable employee profile?"
            : action === "deactivate"
              ? "Mark employee profile inactive?"
              : "Mark employee profile active?"
        }
        description={
          action === "enable"
            ? "This adds an employee extension for the borrower. It does not create employment, grade, or EPF history by itself."
            : action === "deactivate"
              ? "The profile and its existing history remain stored."
              : "The employee profile will be marked active."
        }
        confirmLabel={action === "enable" ? "Enable profile" : "Update profile"}
        busy={mutation.isPending}
        error={error}
        onConfirm={() => {
          if (action) mutation.mutate(action);
        }}
        onClose={() => {
          if (mutation.isPending) return;
          setAction(null);
        }}
      />
    </div>
  );
}
