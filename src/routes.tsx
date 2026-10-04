import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { BorrowersPage } from "@/features/borrowers/BorrowersPage";
import { BorrowerDetailPage } from "@/features/borrowers/BorrowerDetailPage";
import { CategoriesPage } from "@/features/products/CategoriesPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import { GradesPage } from "@/features/grades/GradesPage";
import { LoanApplicationDetailPage } from "@/features/loan-applications/LoanApplicationDetailPage";
import { LoanApplicationsPage } from "@/features/loan-applications/LoanApplicationsPage";
import { NewLoanApplicationPage } from "@/features/loan-applications/NewLoanApplicationPage";
import { LoanFacilitiesPage } from "@/features/loan-facilities/LoanFacilitiesPage";
import { LoanFacilityDetailPage } from "@/features/loan-facilities/LoanFacilityDetailPage";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "borrowers", element: <BorrowersPage /> },
      { path: "borrowers/:borrowerId", element: <BorrowerDetailPage /> },
      { path: "loan-applications", element: <LoanApplicationsPage /> },
      { path: "loan-applications/new", element: <NewLoanApplicationPage /> },
      { path: "loan-applications/:applicationId", element: <LoanApplicationDetailPage /> },
      { path: "loan-facilities", element: <LoanFacilitiesPage /> },
      { path: "loan-facilities/:facilityId", element: <LoanFacilityDetailPage /> },
      { path: "product-categories", element: <CategoriesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:productId", element: <ProductDetailPage /> },
      { path: "grades", element: <GradesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
