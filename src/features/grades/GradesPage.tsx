import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { gradeKeys } from "@/lib/api/keys";
import { createGrade, listGrades, updateGrade } from "@/lib/api/grades";
import type { Grade } from "@/lib/api/types";
import { displayText } from "@/lib/format";
import {
  CodedRecordDialog,
  emptyCodedRecord,
  type CodedRecordValues,
} from "@/features/shared/CodedRecordDialog";

export function GradesPage() {
  usePageMeta("Grades", [{ label: "Grades" }]);
  const grades = useQuery({
    queryKey: gradeKeys.all,
    queryFn: ({ signal }) => listGrades(signal),
  });
  const [editing, setEditing] = useState<Grade | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () => [...(grades.data ?? [])].sort((left, right) => left.code.localeCompare(right.code)),
    [grades.data],
  );

  return (
    <>
      <PageHeader
        title="Grades"
        description="Configurable grades used when recording a borrower's grade history. Grades do not store loan limits."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            Add grade
          </Button>
        }
      />
      <Panel flush>
        <QueryState
          isLoading={grades.isPending}
          isError={grades.isError && grades.data === undefined}
          error={grades.error}
          onRetry={() => void grades.refetch()}
          isEmpty={grades.isSuccess && rows.length === 0}
          empty={
            <div className="empty-state">
              <h2>No grades yet</h2>
              <p>Add the grades your organisation uses. Nothing is preloaded.</p>
              <Button type="button" onClick={() => setCreating(true)}>
                Add grade
              </Button>
            </div>
          }
        >
          <DataTable
            caption="Configured grades"
            rows={rows}
            getRowId={(grade) => grade.id}
            columns={[
              {
                id: "code",
                header: "Code",
                cell: (grade) => <span className="mono">{grade.code}</span>,
              },
              { id: "name", header: "Name", cell: (grade) => grade.name },
              {
                id: "description",
                header: "Description",
                cell: (grade) => displayText(grade.description),
              },
              {
                id: "status",
                header: "Status",
                cell: (grade) => <ActiveBadge active={grade.isActive} />,
              },
              {
                id: "actions",
                header: "Actions",
                align: "end",
                cell: (grade) => (
                  <div className="cell-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(grade)}
                    >
                      Edit
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </QueryState>
      </Panel>
      {creating ? (
        <GradeDialog
          title="Add grade"
          initial={emptyCodedRecord}
          submitLabel="Save grade"
          successMessage="Grade created."
          onSubmit={(input) => createGrade(input).then(() => undefined)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <GradeDialog
          title="Edit grade"
          initial={codedValues(editing)}
          submitLabel="Save changes"
          successMessage="Grade updated."
          onSubmit={(input) => updateGrade(editing.id, input).then(() => undefined)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function GradeDialog({
  title,
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: CodedRecordValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: (input: Parameters<typeof createGrade>[0]) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <CodedRecordDialog
      open
      title={title}
      description="Inactive grades stay available when you record grade history."
      initial={initial}
      activeHint="Clear this to deactivate the grade."
      submitLabel={submitLabel}
      invalidateKey={gradeKeys.all}
      successMessage={successMessage}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}

function codedValues(grade: Grade): CodedRecordValues {
  return {
    code: grade.code,
    name: grade.name,
    description: grade.description ?? "",
    isActive: grade.isActive,
  };
}
