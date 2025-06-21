import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

// Layout Components
import AppLayout from "./components/AppLayout";

// Page Components
import HomePage from "./pages/HomePage";
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
import TodaysPatientsPage from "./pages/patients/TodaysPatientsPage";
import DoctorSchedulesPage from "./components/schedules/DoctorSchedulesPage";
import DoctorShiftsReportPage from "./pages/reports/DoctorShiftsReportPage";
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
import ClinicShiftSummaryReportPage from "./pages/reports/ClinicShiftSummaryReportPage";
import CostsReportPage from "./pages/CostsReportPage";
import InsuranceAuditPage from "./pages/audit/InsuranceAuditPage";
import AuditRecordPage from "./pages/audit/AuditRecordPage";
import MonthlyServiceIncomeReportPage from "./pages/reports/MonthlyServiceIncomeReportPage";
import AnalysisPage from "./pages/anaylsis/AnalysisPage";
import BulkWhatsAppPage from "./pages/communication/BulkWhatsAppPage";
import ServiceCostBreakdownReportPage from "./pages/reports/ServiceCostBreakdownReportPage";
import DoctorStatisticsReportPage from "./pages/reports/DoctorStatisticsReportPage";
import CompanyPerformanceReportPage from "./pages/reports/CompanyPerformanceReportPage";
import DoctorCompanyEntitlementReportPage from "./pages/reports/DoctorCompanyEntitlementReportPage";
import YearlyIncomeComparisonReportPage from "./pages/reports/YearlyIncomeComparisonReportPage";
import YearlyPatientFrequencyReportPage from "./pages/reports/YearlyPatientFrequencyReportPage";
import DailyAttendanceDetailPage from "./pages/reports/attendance/DailyAttendanceDetailPage";
import PayrollAttendanceReportPage from "./pages/reports/PayrollAttendanceReportPage";
import MonthlyEmployeeAttendanceSummaryPage from "./pages/reports/attendance/MonthlyEmployeeAttendanceSummaryPage";
import ShiftDefinitionsPage from "./pages/settings/ShiftDefinitionsPage";
import AttendanceSheetPage from "./pages/attendance/AttendanceSheetPage";
import HolidaysPage from "./pages/settings/attendance/HolidaysPage";
import MonthlyLabIncomeReportPage from "./pages/reports/MonthlyLabIncomeReportPage";
import ServiceGroupsPage from "./pages/settings/ServiceGroupsPage";
import SampleCollectionPage from "./pages/lab/SampleCollectionPage";
// import NotFoundPage from './pages/NotFoundPage'; // Optional: For 404 handling

const AppointmentsPlaceholderPage: React.FC = () => (
  <div className="p-4">
    <h1>إدارة المواعيد (قيد الإنشاء)</h1>
  </div>
);

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
      // All routes inside this block will be rendered within AppLayout
      {
        element: <AppLayout />, // The main application layout (header, sidebar, etc.)
        errorElement: <ErrorPage />,
        children: [
          {
            index: true, // Default route for '/' after login
            element: <HomePage />,
          },
          {
            path: "lab-sample-collection",
            element: <SampleCollectionPage />,
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
            path: "dashboard", // Explicit dashboard route if needed, often same as index
            element: <HomePage />,
          },
          {
            path: '*',
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
            path: "reports",
            element: <ReportsLayout />,
            children: [
              // ... your existing report routes ...
              { path: "attendance-summary", element: <MonthlyEmployeeAttendanceSummaryPage /> },
              { path: "attendance-daily", element: <DailyAttendanceDetailPage /> },
              { path: "attendance-payroll", element: <PayrollAttendanceReportPage /> },
            ],
          },
          {
            path: "clinic",
            element: <ClinicPage />,
          },
      
          // Patients Module (Placeholder)

          // Appointments Module (Placeholder)
          {
            path: "appointments",
            element: <AppointmentsPlaceholderPage />,
            // Example for nested appointment routes later
          },
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
            path: "reports",
            element: <ReportsLayout />, // Or <Outlet /> if reports are top-level sections
            children: [
              { index: true, element: <Navigate to="doctor-shifts" replace /> }, // Default report
              { path: "doctor-shifts", element: <DoctorShiftsReportPage /> },
              {
                path: "service-statistics",
                element: <ServiceStatisticsReportPage />,
              },
              {
                path: 'monthly-service-income',
                element: <MonthlyServiceIncomeReportPage />,
              },
              {
                path: "monthly-lab-income", // New route path
                element: <MonthlyLabIncomeReportPage />,
              },
              {
                path: 'clinic-shift-summary', // Or whatever path you chose for the backend route / allclinicsReportNew
                element: <ClinicShiftSummaryReportPage />,
              },
              {
                path: 'costs', // Or whatever path you chose for the backend route / allclinicsReportNew
                element: <CostsReportPage />,
              },
              {
                path: 'doctor-statistics',
                element: <DoctorStatisticsReportPage />,
              },
              {
                path: 'company-performance',
                element: <CompanyPerformanceReportPage />,
              },
              {
                path:'doctor-company-entitlement',
                element:<DoctorCompanyEntitlementReportPage/>
              },
              {
                path: 'service-cost-breakdown',
                element: <ServiceCostBreakdownReportPage />,
              },
              {
                path:'yearly-income-comparison',
                element:<YearlyIncomeComparisonReportPage/>
              }
              ,
              {
                path:'yearly-patient-frequency',
                element:<YearlyPatientFrequencyReportPage/>
              }
              
              // Add other report routes here
              // { path: 'patient-visits', element: <PatientVisitsReportPage /> },
            ],
          },
          {
            path: "schedules-appointments", // Or just 'schedules' or 'appointments'
            element: <DoctorSchedulesPage />,
          },
          {
            path: "/patients",
            element: <TodaysPatientsPage />,
          },
  // === NEW: ATTENDANCE MODULE ROUTES ===
  {
    path: "attendance", // Base path for main attendance features
    children: [
      { index: true, element: <Navigate to="sheet" replace /> }, // Default to sheet
      { path: "sheet", element: <AttendanceSheetPage /> },
      // Add other main attendance related pages here if any
    ],
  },
          // Settings & Profile (Placeholders)
          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="general" replace /> },
              { path: "general", element: <GeneralSettingsPage /> }, // Your main settings form
              {
                path: "insurance-audit",
                element: <InsuranceAuditPage />,
              },
              {
                path: "service-groups",
                element: <ServiceGroupsPage />,
              },
              {
                path: "attendance",
                element: <Outlet />,
                children: [
                  { path: "shift-definitions", element: <ShiftDefinitionsPage /> },
                  { path: "holidays", element: <HolidaysPage /> },
                ],
              },
              {
                path: "insurance-audit/visit/:visitId", // Or use auditRecordId if that's the primary identifier
                element: <AuditRecordPage />,
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
              {
                path: "laboratory",
                element: <Outlet />,
                children: [
                  { index: true, element: <MainTestsListPage /> },
                  {
                    path: "new",
                    element: (
                      <MainTestFormPage 
                        mode="create"
                        key="mainTestCreate"
                      />
                    ),
                  },
                  {
                    path: ":testId/edit",
                    element: (
                      <MainTestFormPage
                        mode="edit"
                        key="mainTestEdit"
                      />
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
