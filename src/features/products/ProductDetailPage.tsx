import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Button, ButtonLink } from "@/components/Button";
import { DefinitionList } from "@/components/Breadcrumbs";
import { EmptyState, QueryState } from "@/components/QueryState";
import { ActiveBadge } from "@/components/StatusBadge";
import { Tabs } from "@/components/Tabs";
import { usePageMeta } from "@/components/pageMeta";
import { ApiError } from "@/lib/api/client";
import { categoryKeys, productKeys } from "@/lib/api/keys";
import { getProduct, listCategories, updateProduct } from "@/lib/api/products";
import type { LoanProduct, ProductCategory } from "@/lib/api/types";
import { displayText } from "@/lib/format";
import { ProductFormDialog } from "@/features/products/ProductFormDialog";
import { PurposesSection } from "@/features/products/PurposesSection";
import { VersionsSection } from "@/features/products/VersionsSection";

export function ProductDetailPage() {
  const { productId = "" } = useParams();
  const product = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: ({ signal }) => getProduct(productId, signal),
    enabled: productId.length > 0,
  });
  const categories = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => listCategories(signal),
  });

  usePageMeta(product.data?.name ?? "Loan product", [
    { label: "Loan Products", to: "/products" },
    { label: product.data?.name ?? "Loan product" },
  ]);

  if (product.isError && product.error instanceof ApiError && product.error.status === 404) {
    return (
      <EmptyState
        title="Loan product not found"
        description="This product does not exist, or the address is incorrect."
        action={
          <ButtonLink to="/products" variant="secondary">
            Back to loan products
          </ButtonLink>
        }
      />
    );
  }

  const category = categories.data?.find((item) => item.id === product.data?.categoryId);

  return (
    <QueryState
      isLoading={product.isPending}
      isError={product.isError && product.data === undefined}
      error={product.error}
      onRetry={() => void product.refetch()}
      loadingLabel="Loading loan product"
    >
      {product.data ? (
        <ProductDetailBody
          record={product.data}
          category={category}
          categories={categories.data ?? []}
        />
      ) : null}
    </QueryState>
  );
}

function ProductDetailBody({
  record,
  category,
  categories,
}: {
  record: LoanProduct;
  category: ProductCategory | undefined;
  categories: ProductCategory[];
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("overview");

  return (
    <div className="stack">
      <header className="identity-header">
        <div>
          <p className="eyebrow">Loan product</p>
          <div className="identity-header__title">
            <h1>{record.name}</h1>
            <ActiveBadge active={record.isActive} />
          </div>
          <dl className="identity-stats">
            <div className="identity-stat">
              <dt>Code</dt>
              <dd className="mono">{record.code}</dd>
            </div>
            {category ? (
              <div className="identity-stat">
                <dt>Category</dt>
                <dd>{category.name}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          Edit product
        </Button>
      </header>
      <Tabs
        label="Loan product sections"
        activeId={tab}
        onChange={setTab}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            panel: (
              <section className="panel">
                <div className="panel__body">
                  <DefinitionList
                    items={[
                      { label: "Code", value: <span className="mono">{record.code}</span> },
                      { label: "Name", value: record.name },
                      { label: "Category", value: category?.name ?? "Category unavailable" },
                      {
                        label: "Category status",
                        value: category ? <ActiveBadge active={category.isActive} /> : "—",
                      },
                      { label: "Description", value: displayText(record.description) },
                      { label: "Product status", value: <ActiveBadge active={record.isActive} /> },
                    ]}
                  />
                </div>
              </section>
            ),
          },
          {
            id: "purposes",
            label: "Purposes",
            panel: <PurposesSection productId={record.id} />,
          },
          {
            id: "versions",
            label: "Versions",
            panel: <VersionsSection productId={record.id} />,
          },
        ]}
      />
      {editing ? (
        <ProductFormDialog
          title="Edit loan product"
          categories={categories}
          initial={record}
          submitLabel="Save changes"
          successMessage="Loan product updated."
          onSubmit={(input) => updateProduct(record.id, input)}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}
