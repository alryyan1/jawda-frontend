import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

// Layout Components
import AppLayout from "./components/AppLayout";

// Page Components
import HomePage from "./pages/HomePage";
import RedirectByUserType from "./components/RedirectByUserType";
import ErrorPage from "./pages/ErrorPage";

// Doctors Module Pages (ensure these files exist, even if as placeholders)

// Placeholder Pages (ensure these files exist)
import LoginPage from "./pages/LoginPage";
import PublicLayout from "./components/PublicLayout";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ClinicPage from "./components/clinic/ClinicPage";
import DoctorFormPage from "./pages/doctors/DoctorFormPage";
import DoctorsListPage from "./pages/doctors/DoctorsListPage";
import DoctorPortalPage from "./pages/doctors/DoctorPortalPage";
import DoctorPortalLoginPage from "./pages/doctors/DoctorPortalLoginPage";
import { DoctorFormMode } from "./services/doctorService";
import ServiceFormPage from "./components/services/ServiceFormPage";
import ServicesListPage from "./components/services/ServicesListPage";
import { ServiceFormMode } from "./types/services";
import UsersListPage from "./pages/users/UsersListPage";
import UserFormPage from "./pages/users/UserFormPage";
import { UserFormMode } from "./types/users";
import RolesListPage from "./pages/roles/RolesListPage";
import RoleFormPage, { RoleFormMode } from "./pages/roles/RoleFormPage";
import CompaniesListPage from "./pages/companies/CompaniesListPage";
import CompanyFormPage, {
  CompanyFormMode,
} from "./pages/companies/CompanyFormPage";
import CompanyServiceContractsPage from "./pages/companies/CompanyServiceContractsPage";
import PartiesListPage from "./pages/parties/PartiesListPage";
import PartyServiceCostsPage from "./pages/parties/PartyServiceCostsPage";
import TodaysPatientsPage from "./pages/patients/TodaysPatientsPage";
import VisitDetailsPage from "./pages/patients/VisitDetailsPage";
import DiagnosisPage from "./pages/patients/DiagnosisPage";
import DoctorShiftsReportPage from "./pages/reports/DoctorShiftsReportPage";
import DoctorShiftDetailsPage from "./pages/reports/DoctorShiftDetailsPage";
import SpecialistShiftsReportPage from "./pages/reports/SpecialistShiftsReportPage";
import ReportsLayout from "./pages/reports/ReportsLayout";
import ServiceStatisticsReportPage from "./pages/reports/ServiceStatisticsReportPage";
import MainTestFormPage from "./pages/lab/MainTestFormPage";
import MainTestsListPage from "./pages/lab/MainTestsListPage";
import SettingsLayout from "./pages/settings/SettingsLayout";
import GeneralSettingsPage from "./pages/GeneralSettingsPage";
import ChildTestsManagementPage from "./pages/lab/ChildTestsManagementPage";
import LabPriceListPage from "./pages/settings/LabPriceListPage";
import CompanyMainTestContractsPage from "./pages/companies/CompanyMainTestContractsPage";
import LabWorkstationPage from "./pages/lab/LabWorkstationPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import ClinicShiftSummaryReportPage from "./pages/reports/ClinicShiftSummaryReportPage";
import CostsReportPage from "./pages/CostsReportPage";
import DailyCostsReportPage from "./pages/reports/DailyCostsReportPage";
import MonthlyShiftsReportPage from "./pages/reports/MonthlyShiftsReportPage";
import MonthlyServiceIncomeReportPage from "./pages/reports/MonthlyServiceIncomeReportPage";
import AnalysisPage from "./pages/anaylsis/AnalysisPage";
import BulkWhatsAppPage from "./pages/communication/BulkWhatsAppPage";
import WhatsAppCloudApiPage from "./pages/communication/WhatsAppCloudApiPage";
import DoctorStatisticsReportPage from "./pages/reports/DoctorStatisticsReportPage";
import CompanyPerformanceReportPage from "./pages/reports/CompanyPerformanceReportPage";
import DoctorCompanyEntitlementReportPage from "./pages/reports/DoctorCompanyEntitlementReportPage";
import YearlyIncomeComparisonReportPage from "./pages/reports/YearlyIncomeComparisonReportPage";
import YearlyPatientFrequencyReportPage from "./pages/reports/YearlyPatientFrequencyReportPage";
import PatientServiceCostsReportPage from "./pages/reports/PatientServiceCostsReportPage";
import BindingMatchingPage from "./pages/settings/BindingMatchingPage";
import MonthlyLabIncomeReportPage from "./pages/reports/MonthlyLabIncomeReportPage";
import ServiceGroupsPage from "./pages/settings/ServiceGroupsPage";
import SampleCollectionPage from "./pages/lab/SampleCollectionPage";
import LabTestStatisticsReportPage from "./pages/reports/LabTestStatisticsReportPage";
import TestResultStatisticsPage from "./pages/reports/TestResultStatisticsPage";
import LabGeneralReportPage from "./pages/reports/LabGeneralReportPage";
import LabReceptionPage from "./pages/LabReceptionPage";
import TestOffersPage from "./pages/TestOffersPage";
import SpecialistsPage from "./pages/specialists/SpecialistsPage";
import CashReconciliationPage from "./pages/CashReconciliationPage";
// import NotFoundPage from './pages/NotFoundPage'; // Optional: For 404 handling

import HL7ParserPage from "./pages/HL7ParserPage";

const router = createBrowserRouter([
  // --- PUBLIC ROUTES ---
  // Routes accessible without authentication (e.g., Login, Register)
  {
    element: <PublicLayout />, // Wraps all public routes
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/doctor-portal/login",
        element: <DoctorPortalLoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
    ],
  },

  // --- PROTECTED ROUTES ---
  // Routes requiring authentication
  {
    element: <ProtectedRoute />, // This component checks auth and redirects if not authenticated
    errorElement: <ErrorPage />,
    children: [
      // Doctor portal renders full-page, without the sidebar/header AppLayout provides
      {
        path: "doctor-portal",
        element: <DoctorPortalPage />,
      },
      // All routes inside this block will be rendered within AppLayout
      {
        element: <AppLayout />, // The main application layout (header, sidebar, etc.)
        errorElement: <ErrorPage />,
        children: [
          {
            index: true, // After login, redirect based on user_type
            element: <RedirectByUserType />,
          },
          {
            path: "lab-sample-collection",
            element: <SampleCollectionPage />,
          },
          {
            path: "lab-reception",
            element: <LabReceptionPage />,
          },
          {
            path: "cash-reconciliation",
            element: <CashReconciliationPage />,
          },
          {
            path: "specialists",
            element: <SpecialistsPage />,
          },
          {
            path: "analysis", // Or "/reports/analysis" if under reports
            element: <AnalysisPage />,
          },
          {
            path: "bulk-whatsapp",
            element: <BulkWhatsAppPage />,
          },
          {
            path: "whatsapp-cloud-api",
            element: <WhatsAppCloudApiPage />,
          },
          {
            path: "hl7-parser",
            element: <HL7ParserPage />,
          },
          {
            path: "dashboard", // Explicit dashboard route if needed, often same as index
            element: <HomePage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
          {
            path: "lab-workstation",
            element: <LabWorkstationPage />,
          },
          // Doctors Module
          {
            path: "doctors",
            element: <Outlet />, // Important for nested routes to render within a common parent if needed
            children: [
              { index: true, element: <DoctorsListPage /> },
              {
                path: "new",
                element: (
                  <DoctorFormPage
                    mode={DoctorFormMode.CREATE}
                    key="doctorCreate"
                  />
                ),
              },
              {
                path: ":doctorId/edit",
                element: (
                  <DoctorFormPage mode={DoctorFormMode.EDIT} key="doctorEdit" />
                ),
              },
            ],
          },
          {
            path: "roles", // Or 'settings/roles'
            element: <Outlet />,
            children: [
              { index: true, element: <RolesListPage /> },
              {
                path: "new",
                element: (
                  <RoleFormPage mode={RoleFormMode.CREATE} key="roleCreate" />
                ),
              },
              {
                path: ":roleId/edit",
                element: (
                  <RoleFormPage mode={RoleFormMode.EDIT} key="roleEdit" />
                ),
              },
            ],
          },

          {
            path: "clinic",
            element: <ClinicPage />,
          },

          // Patients Module (Placeholder)

          {
            path: "users", // Or 'settings/users' if you prefer
            element: <Outlet />,
            children: [
              { index: true, element: <UsersListPage /> },
              {
                path: "new",
                element: (
                  <UserFormPage mode={UserFormMode.CREATE} key="userCreate" />
                ),
              },
              {
                path: ":userId/edit",
                element: (
                  <UserFormPage mode={UserFormMode.EDIT} key="userEdit" />
                ),
              },
            ],
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "reports",
            element: <ReportsLayout />, // Or <Outlet /> if reports are top-level sections
            children: [
              { index: true, element: <Navigate to="doctor-shifts" replace /> }, // Default report
              { path: "doctor-shifts", element: <DoctorShiftsReportPage /> },
              {
                path: "doctor-shifts/:doctorShiftId",
                element: <DoctorShiftDetailsPage />,
              },
              {
                path: "specialist-shifts",
                element: <SpecialistShiftsReportPage />,
              },
              {
                path: "service-statistics",
                element: <ServiceStatisticsReportPage />,
              },
              {
                path: "lab-test-statistics",
                element: <LabTestStatisticsReportPage />,
              },
              {
                path: "test-result-statistics",
                element: <TestResultStatisticsPage />,
              },
              {
                path: "lab-general",
                element: <LabGeneralReportPage />,
              },
              {
                path: "monthly-service-income",
                element: <MonthlyServiceIncomeReportPage />,
              },
              {
                path: "monthly-lab-income", // New route path
                element: <MonthlyLabIncomeReportPage />,
              },
              {
                path: "clinic-shift-summary", // Or whatever path you chose for the backend route / allclinicsReportNew
                element: <ClinicShiftSummaryReportPage />,
              },
              {
                path: "costs", // Or whatever path you chose for the backend route / allclinicsReportNew
                element: <CostsReportPage />,
              },
           
              {
                path: "daily-costs",
                element: <DailyCostsReportPage />,
              },
              {
                path: "monthly-shifts",
                element: <MonthlyShiftsReportPage />,
              },
              {
                path: "doctor-statistics",
                element: <DoctorStatisticsReportPage />,
              },
              {
                path: "company-performance",
                element: <CompanyPerformanceReportPage />,
              },
              {
                path: "doctor-company-entitlement",
                element: <DoctorCompanyEntitlementReportPage />,
              },
              {
                path: "yearly-income-comparison",
                element: <YearlyIncomeComparisonReportPage />,
              },
              {
                path: "yearly-patient-frequency",
                element: <YearlyPatientFrequencyReportPage />,
              },
              {
                path: "patient-service-costs",
                element: <PatientServiceCostsReportPage />,
              },

              // Add other report routes here
              // { path: 'patient-visits', element: <PatientVisitsReportPage /> },
            ],
          },
          {
            path: "/patients",
            element: <TodaysPatientsPage />,
          },
          {
            path: "/patients/visit/:visitId",
            element: <VisitDetailsPage />,
          },
          {
            path: "/diagnosis/:requestedServiceId",
            element: <DiagnosisPage />,
          },
          // Settings & Profile (Placeholders)
          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="general" replace /> },
              { path: "general", element: <GeneralSettingsPage /> }, // Your main settings form
              { path: "doctors", element: <DoctorsListPage /> },
              { path: "offers", element: <TestOffersPage /> },
              // { path: "patients", element: <TodaysPatientsPage /> },
              { path: "users", element: <UsersListPage /> },
              { path: "roles", element: <RolesListPage /> },
              { path: "specialists", element: <SpecialistsPage /> },
              {
                path: "service-groups",
                element: <ServiceGroupsPage />,
              },
              // { path: "laboratory", element: <LabSettingsPage /> },
              // Companies Module
              {
                path: "companies",
                element: <Outlet />,
                children: [
                  { index: true, element: <CompaniesListPage /> },
                  {
                    path: "new",
                    element: (
                      <CompanyFormPage
                        mode={CompanyFormMode.CREATE}
                        key="companyCreate"
                      />
                    ),
                  },
                  {
                    path: ":companyId/edit",
                    element: (
                      <CompanyFormPage
                        mode={CompanyFormMode.EDIT}
                        key="companyEdit"
                      />
                    ),
                  },
                  {
                    path: ":companyId/contracts",
                    element: <CompanyServiceContractsPage />,
                  }, // Page for managing contracts
                  {
                    path: ":companyId/test-contracts",
                    element: <CompanyMainTestContractsPage />,
                  }, // Page for managing main test contracts
                ],
              },
              // Parties Module
              {
                path: "parties",
                element: <Outlet />,
                children: [
                  { index: true, element: <PartiesListPage /> },
                  {
                    path: ":partyId/service-costs",
                    element: <PartyServiceCostsPage />,
                  }, // Page for managing party service costs
                ],
              },
              {
                path: "laboratory",
                element: <Outlet />,
                children: [
                  { index: true, element: <MainTestsListPage /> },
                  {
                    path: "new",
                    element: (
                      <MainTestFormPage mode="create" key="mainTestCreate" />
                    ),
                  },
                  {
                    path: ":testId/edit",
                    element: (
                      <MainTestFormPage mode="edit" key="mainTestEdit" />
                    ),
                  },

                  {
                    path: ":mainTestId/parameters",
                    element: <ChildTestsManagementPage />,
                  },
                  {
                    path: "price-list",
                    element: <LabPriceListPage />,
                  },
                  {
                    path: "binding-matching",
                    element: <BindingMatchingPage />,
                  },
                ],
              },
              {
                path: "services",
                element: <Outlet />,
                children: [
                  { index: true, element: <ServicesListPage /> },
                  {
                    path: "new",
                    element: (
                      <ServiceFormPage
                        mode={ServiceFormMode.CREATE}
                        key="serviceCreate"
                      />
                    ),
                  },
                  {
                    path: ":serviceId/edit",
                    element: (
                      <ServiceFormPage
                        mode={ServiceFormMode.EDIT}
                        key="serviceEdit"
                      />
                    ),
                  },
                ],
              },
            ],
          },

          // ... other protected top-level sections/modules
        ],
      },
    ],
  },

  // --- NOT FOUND ROUTE --- (Optional, place it last)
  // {
  //   path: '*', // Matches any path not matched above
  //   element: <NotFoundPage />,
  // },
]);

export default router;
