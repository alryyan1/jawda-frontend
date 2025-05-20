import { createBrowserRouter, Outlet } from "react-router-dom";

// Layout Components
import AppLayout from "./components/AppLayout";

// Page Components
import HomePage from "./pages/HomePage";

// Doctors Module Pages (ensure these files exist, even if as placeholders)

// Placeholder Pages (ensure these files exist)
import SettingsPage from "./pages/SettingsPage";
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
import CompanyFormPage, { CompanyFormMode } from "./pages/companies/CompanyFormPage";
import CompanyServiceContractsPage from "./pages/companies/CompanyServiceContractsPage";
// import NotFoundPage from './pages/NotFoundPage'; // Optional: For 404 handling

// Example of a simple component directly in router for brevity, move to own file for real app
const PatientsPlaceholderPage: React.FC = () => (
  <div className="p-4">
    <h1>إدارة المرضى (قيد الإنشاء)</h1>
  </div>
);
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
    children: [
      // All routes inside this block will be rendered within AppLayout
      {
        element: <AppLayout />, // The main application layout (header, sidebar, etc.)
        // errorElement: <CustomErrorPage />, // Optional: An error boundary for this part of the app
        children: [
          {
            index: true, // Default route for '/' after login
            element: <HomePage />,
          },
          {
            path: "dashboard", // Explicit dashboard route if needed, often same as index
            element: <HomePage />,
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
            path: "patients",
            element: <PatientsPlaceholderPage />,
            // Example for nested patient routes later:
            // children: [
            //   { index: true, element: <PatientsListPage /> },
            //   { path: 'new', element: <PatientFormPage mode="create" /> },
            //   { path: ':patientId/edit', element: <PatientFormPage mode="edit" /> },
            // ],
          },

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
            ],
          },
          // Settings & Profile (Placeholders)
          {
            path: "settings",
            element: <SettingsPage />,
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
