export const borrowerKeys = {
  all: ["borrowers"] as const,
  detail: (borrowerId: string) => ["borrowers", borrowerId] as const,
  identifiers: (borrowerId: string) => ["borrowers", borrowerId, "identifiers"] as const,
  employment: (borrowerId: string) => ["borrowers", borrowerId, "employment-history"] as const,
  gradeHistory: (borrowerId: string) => ["borrowers", borrowerId, "grade-history"] as const,
  epf: (borrowerId: string) => ["borrowers", borrowerId, "epf-balances"] as const,
};

export const gradeKeys = {
  all: ["grades"] as const,
};

export const categoryKeys = {
  all: ["product-categories"] as const,
};

export const productKeys = {
  all: ["products"] as const,
  list: (categoryId?: string) => ["products", "list", categoryId ?? "all"] as const,
  detail: (productId: string) => ["products", "detail", productId] as const,
  purposes: (productId: string) => ["products", "detail", productId, "purposes"] as const,
  versions: (productId: string) => ["products", "detail", productId, "versions"] as const,
};
