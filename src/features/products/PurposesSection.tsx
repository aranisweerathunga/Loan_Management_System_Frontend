import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { productKeys } from "@/lib/api/keys";
import { createPurpose, listPurposes, updatePurpose } from "@/lib/api/products";
import type { ProductPurpose } from "@/lib/api/types";
import { displayText } from "@/lib/format";
import {
  CodedRecordDialog,
  emptyCodedRecord,
  type CodedRecordValues,
} from "@/features/shared/CodedRecordDialog";

export function PurposesSection({ productId }: { productId: string }) {
  const purposes = useQuery({
    queryKey: productKeys.purposes(productId),
    queryFn: ({ signal }) => listPurposes(productId, signal),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductPurpose | null>(null);
  const rows = useMemo(
    () => [...(purposes.data ?? [])].sort((left, right) => left.code.localeCompare(right.code)),
    [purposes.data],
  );

  return (
    <Panel
      title="Purposes"
      description="Purposes belong to this loan product. They cannot be deleted from this screen."
      flush
      actions={
        <Button type="button" onClick={() => setCreating(true)}>
          Add purpose
        </Button>
      }
    >
      <QueryState
        isLoading={purposes.isPending}
        isError={purposes.isError && purposes.data === undefined}
        error={purposes.error}
        onRetry={() => void purposes.refetch()}
        isEmpty={purposes.isSuccess && rows.length === 0}
        empty={
          <div className="empty-state">
            <h2>No purposes yet</h2>
            <p>Add a purpose when this product needs a reason code.</p>
            <Button type="button" onClick={() => setCreating(true)}>
              Add purpose
            </Button>
          </div>
        }
      >
        <DataTable
          caption="Purposes for this loan product"
          rows={rows}
          getRowId={(purpose) => purpose.id}
          minWidth={640}
          columns={[
            {
              id: "code",
              header: "Code",
              cell: (purpose) => <span className="mono">{purpose.code}</span>,
            },
            { id: "name", header: "Name", cell: (purpose) => purpose.name },
            {
              id: "description",
              header: "Description",
              cell: (purpose) => displayText(purpose.description),
            },
            {
              id: "status",
              header: "Status",
              cell: (purpose) => <ActiveBadge active={purpose.isActive} />,
            },
            {
              id: "actions",
              header: "Actions",
              align: "end",
              cell: (purpose) => (
                <div className="cell-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(purpose)}
                  >
                    Edit
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </QueryState>
      {creating ? (
        <PurposeDialog
          title="Add purpose"
          productId={productId}
          initial={emptyCodedRecord}
          submitLabel="Save purpose"
          successMessage="Purpose created."
          onSubmit={(input) => createPurpose(productId, input).then(() => undefined)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <PurposeDialog
          title="Edit purpose"
          productId={productId}
          initial={{
            code: editing.code,
            name: editing.name,
            description: editing.description ?? "",
            isActive: editing.isActive,
          }}
          submitLabel="Save changes"
          successMessage="Purpose updated."
          onSubmit={(input) => updatePurpose(productId, editing.id, input).then(() => undefined)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}

function PurposeDialog({
  title,
  productId,
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onClose,
}: {
  title: string;
  productId: string;
  initial: CodedRecordValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: Parameters<typeof CodedRecordDialog>[0]["onSubmit"];
  onClose: () => void;
}) {
  return (
    <CodedRecordDialog
      open
      title={title}
      description="Purpose codes are unique within this loan product."
      initial={initial}
      activeHint="Clear this to deactivate the purpose."
      submitLabel={submitLabel}
      invalidateKey={productKeys.purposes(productId)}
      successMessage={successMessage}
      onSubmit={async (input) => {
        await onSubmit(input);
      }}
      onClose={onClose}
    />
  );
}
