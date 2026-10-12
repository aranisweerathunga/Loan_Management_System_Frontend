import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { categoryKeys } from "@/lib/api/keys";
import { createCategory, listCategories, updateCategory } from "@/lib/api/products";
import type { ProductCategory } from "@/lib/api/types";
import { displayText } from "@/lib/format";
import {
  CodedRecordDialog,
  emptyCodedRecord,
  type CodedRecordValues,
} from "@/features/shared/CodedRecordDialog";

export function CategoriesPage() {
  usePageMeta("Categories", [
    { label: "Product Configuration", to: "/products" },
    { label: "Categories" },
  ]);
  const categories = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => listCategories(signal),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const rows = useMemo(
    () => [...(categories.data ?? [])].sort((left, right) => left.code.localeCompare(right.code)),
    [categories.data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Product Configuration"
        title="Categories"
        description="Groups for loan products. Purposes and versions are managed on each product, not here."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            Add category
          </Button>
        }
      />
      <Panel flush>
        <QueryState
          isLoading={categories.isPending}
          isError={categories.isError && categories.data === undefined}
          error={categories.error}
          onRetry={() => void categories.refetch()}
          isEmpty={categories.isSuccess && rows.length === 0}
          empty={
            <div className="empty-state">
              <h2>No categories yet</h2>
              <p>Create a category before adding loan products.</p>
              <Button type="button" onClick={() => setCreating(true)}>
                Add category
              </Button>
            </div>
          }
        >
          <DataTable
            caption="Product categories"
            rows={rows}
            getRowId={(category) => category.id}
            columns={[
              {
                id: "code",
                header: "Code",
                cell: (category) => <span className="mono">{category.code}</span>,
              },
              { id: "name", header: "Name", cell: (category) => category.name },
              {
                id: "description",
                header: "Description",
                cell: (category) => displayText(category.description),
              },
              {
                id: "status",
                header: "Status",
                cell: (category) => <ActiveBadge active={category.isActive} />,
              },
              {
                id: "actions",
                header: "Actions",
                align: "end",
                cell: (category) => (
                  <div className="cell-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(category)}
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
        <CategoryDialog
          title="Add category"
          initial={emptyCodedRecord}
          submitLabel="Save category"
          successMessage="Category created."
          onSubmit={(input) => createCategory(input).then(() => undefined)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <CategoryDialog
          title="Edit category"
          initial={{
            code: editing.code,
            name: editing.name,
            description: editing.description ?? "",
            isActive: editing.isActive,
          }}
          submitLabel="Save changes"
          successMessage="Category updated."
          onSubmit={(input) => updateCategory(editing.id, input).then(() => undefined)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function CategoryDialog(props: {
  title: string;
  initial: CodedRecordValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: Parameters<typeof CodedRecordDialog>[0]["onSubmit"];
  onClose: () => void;
}) {
  return (
    <CodedRecordDialog
      open
      description="Inactive categories remain on file and can still be selected for a product."
      activeHint="Clear this to deactivate the category."
      invalidateKey={categoryKeys.all}
      {...props}
    />
  );
}
