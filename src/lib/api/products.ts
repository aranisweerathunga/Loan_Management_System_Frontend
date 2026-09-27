import { request } from "@/lib/api/client";
import type {
  CodedRecordInput,
  LoanProduct,
  ProductCategory,
  ProductInput,
  ProductPurpose,
  ProductVersion,
  ProductVersionInput,
} from "@/lib/api/types";

export function listCategories(signal?: AbortSignal) {
  return request<ProductCategory[]>("/product-categories", { signal });
}

export function createCategory(input: CodedRecordInput) {
  return request<ProductCategory>("/product-categories", { method: "POST", body: input });
}

export function updateCategory(categoryId: string, input: CodedRecordInput) {
  return request<ProductCategory>(`/product-categories/${categoryId}`, {
    method: "PATCH",
    body: input,
  });
}

/** The products API accepts an optional categoryId filter. It does not support text search or pagination. */
export function listProducts(categoryId: string | undefined, signal?: AbortSignal) {
  return request<LoanProduct[]>("/products", {
    signal,
    query: { categoryId },
  });
}

export function getProduct(productId: string, signal?: AbortSignal) {
  return request<LoanProduct>(`/products/${productId}`, { signal });
}

export function createProduct(input: ProductInput) {
  return request<LoanProduct>("/products", { method: "POST", body: input });
}

export function updateProduct(productId: string, input: ProductInput) {
  return request<LoanProduct>(`/products/${productId}`, { method: "PATCH", body: input });
}

export function listPurposes(productId: string, signal?: AbortSignal) {
  return request<ProductPurpose[]>(`/products/${productId}/purposes`, { signal });
}

export function createPurpose(productId: string, input: CodedRecordInput) {
  return request<ProductPurpose>(`/products/${productId}/purposes`, {
    method: "POST",
    body: input,
  });
}

export function updatePurpose(productId: string, purposeId: string, input: CodedRecordInput) {
  return request<ProductPurpose>(`/products/${productId}/purposes/${purposeId}`, {
    method: "PATCH",
    body: input,
  });
}

export function listVersions(productId: string, signal?: AbortSignal) {
  return request<ProductVersion[]>(`/products/${productId}/versions`, { signal });
}

export function createVersion(productId: string, input: ProductVersionInput) {
  return request<ProductVersion>(`/products/${productId}/versions`, {
    method: "POST",
    body: input,
  });
}

export function updateDraftVersion(
  productId: string,
  versionId: string,
  input: ProductVersionInput,
) {
  return request<ProductVersion>(`/products/${productId}/versions/${versionId}`, {
    method: "PATCH",
    body: input,
  });
}

export function activateVersion(productId: string, versionId: string) {
  return request<ProductVersion>(`/products/${productId}/versions/${versionId}/activate`, {
    method: "POST",
  });
}

export function retireVersion(productId: string, versionId: string) {
  return request<ProductVersion>(`/products/${productId}/versions/${versionId}/retire`, {
    method: "POST",
  });
}
