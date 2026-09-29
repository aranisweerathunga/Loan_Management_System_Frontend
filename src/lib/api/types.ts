export type Borrower = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerIdentifier = {
  id: string;
  borrowerId: string;
  type: string;
  value: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeProfile = {
  id: string;
  borrowerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerDetail = Borrower & {
  identifiers: BorrowerIdentifier[];
  employeeProfile: EmployeeProfile | null;
};

export type EmploymentHistoryRecord = {
  id: string;
  employeeProfileId: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Grade = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GradeHistoryRecord = {
  id: string;
  employeeProfileId: string;
  gradeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  grade: Grade;
};

export type EpfBalanceSource = "MANUAL" | "IMPORT";

export type EpfBalanceRecord = {
  id: string;
  employeeProfileId: string;
  balance: string;
  asOfDate: string;
  source: EpfBalanceSource;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoanProduct = {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductPurpose = {
  id: string;
  loanProductId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductVersionStatus = "DRAFT" | "ACTIVE" | "RETIRED";

export type ProductVersion = {
  id: string;
  loanProductId: string;
  versionNumber: number;
  status: ProductVersionStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  configuration: unknown;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerInput = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type IdentifierInput = {
  type: string;
  value: string;
  isPrimary: boolean;
};

export type EmploymentHistoryInput = {
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type GradeHistoryInput = {
  gradeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type EpfBalanceInput = {
  balance: string;
  asOfDate: string;
  source: EpfBalanceSource;
};

export type CodedRecordInput = {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type ProductInput = CodedRecordInput & {
  categoryId: string;
};

export type ProductVersionInput = {
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  configuration: Record<string, unknown>;
};

export type LoanApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW";

export type EligibilityAssessmentStatus = "PENDING" | "COMPLETED";

export type LoanApplicationBorrowerSummary = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  isActive: boolean;
};

export type LoanApplicationProductSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type LoanApplicationVersionSummary = {
  id: string;
  versionNumber: number;
  status: ProductVersionStatus;
};

export type LoanApplicationPurposeSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type LoanApplication = {
  id: string;
  applicationNumber: string;
  borrowerId: string;
  loanProductId: string;
  productVersionId: string;
  productPurposeId: string | null;
  status: LoanApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  borrower: LoanApplicationBorrowerSummary;
  loanProduct: LoanApplicationProductSummary;
  productVersion: LoanApplicationVersionSummary;
  productPurpose: LoanApplicationPurposeSummary | null;
};

export type EligibilityAssessment = {
  id: string;
  loanApplicationId: string;
  productVersionId: string;
  status: EligibilityAssessmentStatus;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoanApplicationDetail = LoanApplication & {
  eligibilityAssessments: EligibilityAssessment[];
};

export type ApplicationStatusHistoryEntry = {
  id: string;
  loanApplicationId: string;
  fromStatus: LoanApplicationStatus | null;
  toStatus: LoanApplicationStatus;
  changedAt: string;
  note: string | null;
};

export type LoanApplicationListFilters = {
  borrowerId?: string;
  loanProductId?: string;
  status?: LoanApplicationStatus;
};

export type LoanApplicationWriteInput = {
  borrowerId: string;
  loanProductId: string;
  productVersionId: string;
  productPurposeId: string | null;
};
