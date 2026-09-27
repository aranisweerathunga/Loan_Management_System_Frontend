import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { FormField } from "@/components/FormField";
import { Input, Select } from "@/components/Fields";
import { PageHeader, Panel } from "@/components/PageHeader";
import { QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { usePageMeta } from "@/components/pageMeta";
import { categoryKeys, productKeys } from "@/lib/api/keys";
import { createProduct, listCategories, listProducts, updateProduct } from "@/lib/api/products";
import type { LoanProduct } from "@/lib/api/types";
import { displayText } from "@/lib/format";
import { ProductFormDialog } from "@/features/products/ProductFormDialog";

export function ProductsPage() {
  usePageMeta("Loan Products", [
    { label: "Product Configuration", to: "/products" },
    { label: "Loan Products" },
  ]);
  const navigate = useNavigate();
  const categories = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => listCategories(signal),
  });
  const [categoryId, setCategoryId] = useState("");
  const [text, setText] = useState("");
  const products = useQuery({
    queryKey: productKeys.list(categoryId || undefined),
    queryFn: ({ signal }) => listProducts(categoryId || undefined, signal),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LoanProduct | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingId && !creating) navigate(`/products/${pendingId}`);
  }, [creating, navigate, pendingId]);

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((category) => [category.id, category.name]));
    return (id: string) => map.get(id) ?? "Unknown category";
  }, [categories.data]);

  const rows = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return [...(products.data ?? [])]
      .filter((product) => {
        if (!needle) return true;
        return [product.code, product.name, product.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [products.data, text]);

  const noCategories = categories.isSuccess && categories.data.length === 0;

  return (
    <>
      <PageHeader
        title="Loan Products"
        description="Open a product to manage its purposes and versions."
        actions={
          noCategories ? (
            <ButtonLink to="/product-categories" variant="secondary">
              Add a category first
            </ButtonLink>
          ) : (
            <Button
              type="button"
              onClick={() => setCreating(true)}
              disabled={!categories.data?.length}
            >
              Add product
            </Button>
          )
        }
      />
      <div className="filters">
        <FormField
          id="product-category-filter"
          label="Category"
          hint="Sent to the server as a filter."
        >
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="product-text-filter"
          label="Filter loaded products"
          hint="Applies only to products already loaded. The API does not provide text search."
        >
          <Input value={text} onChange={(event) => setText(event.target.value)} />
        </FormField>
      </div>
      <Panel flush>
        <QueryState
          isLoading={products.isPending}
          isError={products.isError && products.data === undefined}
          error={products.error}
          onRetry={() => void products.refetch()}
          isEmpty={products.isSuccess && (products.data?.length ?? 0) === 0}
          empty={
            <div className="empty-state">
              <h2>{categoryId ? "No products in this category" : "No loan products yet"}</h2>
              <p>
                {noCategories
                  ? "Create a product category before adding a loan product."
                  : "Add a product, then open it to configure purposes and versions."}
              </p>
              {noCategories ? (
                <ButtonLink to="/product-categories">Go to categories</ButtonLink>
              ) : (
                <Button type="button" onClick={() => setCreating(true)}>
                  Add product
                </Button>
              )}
            </div>
          }
        >
          {products.isSuccess && rows.length === 0 ? (
            <div className="empty-state">
              <h2>No products match this filter</h2>
              <p>The loaded list does not include a product with that text.</p>
            </div>
          ) : (
            <DataTable
              caption="Loan products"
              rows={rows}
              getRowId={(product) => product.id}
              columns={[
                {
                  id: "code",
                  header: "Code",
                  cell: (product) => <span className="mono">{product.code}</span>,
                },
                {
                  id: "name",
                  header: "Name",
                  cell: (product) => <Link to={`/products/${product.id}`}>{product.name}</Link>,
                },
                {
                  id: "category",
                  header: "Category",
                  cell: (product) => categoryName(product.categoryId),
                },
                {
                  id: "description",
                  header: "Description",
                  cell: (product) => displayText(product.description),
                },
                {
                  id: "status",
                  header: "Status",
                  cell: (product) => <ActiveBadge active={product.isActive} />,
                },
                {
                  id: "actions",
                  header: "Actions",
                  align: "end",
                  cell: (product) => (
                    <div className="cell-actions">
                      <ButtonLink to={`/products/${product.id}`} variant="ghost" size="sm">
                        View
                      </ButtonLink>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(product)}
                      >
                        Edit
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </QueryState>
      </Panel>
      {creating && categories.data ? (
        <ProductFormDialog
          title="Add loan product"
          categories={categories.data}
          submitLabel="Save product"
          successMessage="Loan product created."
          onCreated={setPendingId}
          onSubmit={(input) => createProduct(input)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing && categories.data ? (
        <ProductFormDialog
          title="Edit loan product"
          categories={categories.data}
          initial={editing}
          submitLabel="Save changes"
          successMessage="Loan product updated."
          onSubmit={(input) => updateProduct(editing.id, input)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
