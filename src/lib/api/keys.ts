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

export const loanApplicationKeys = {
  all: ["loan-applications"] as const,
  list: (filters: { borrowerId?: string; loanProductId?: string; status?: string }) =>
    [
      "loan-applications",
      "list",
      filters.status ?? "all",
      filters.borrowerId ?? "all",
      filters.loanProductId ?? "all",
    ] as const,
  detail: (applicationId: string) => ["loan-applications", "detail", applicationId] as const,
  history: (applicationId: string) =>
    ["loan-applications", "detail", applicationId, "status-history"] as const,
  decisions: (applicationId: string) =>
    ["loan-applications", "detail", applicationId, "decisions"] as const,
  assessments: (applicationId: string) =>
    ["loan-applications", "detail", applicationId, "eligibility-assessments"] as const,
  assessment: (applicationId: string, assessmentId: string) =>
    ["loan-applications", "detail", applicationId, "eligibility-assessments", assessmentId] as const,
};

export const loanFacilityKeys = {
  all: ["loan-facilities"] as const,
  list: (filters: { borrowerId?: string; loanProductId?: string; status?: string }) =>
    [
      "loan-facilities",
      "list",
      filters.status ?? "all",
      filters.borrowerId ?? "all",
      filters.loanProductId ?? "all",
    ] as const,
  detail: (facilityId: string) => ["loan-facilities", "detail", facilityId] as const,
  disbursements: (facilityId: string) =>
    ["loan-facilities", "detail", facilityId, "disbursements"] as const,
  disbursement: (facilityId: string, disbursementId: string) =>
    ["loan-facilities", "detail", facilityId, "disbursements", disbursementId] as const,
  transactions: (facilityId: string) =>
    ["loan-facilities", "detail", facilityId, "transactions"] as const,
  transaction: (facilityId: string, transactionId: string) =>
    ["loan-facilities", "detail", facilityId, "transactions", transactionId] as const,
};
