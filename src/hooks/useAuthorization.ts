import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import type { User as AuthUserType } from '../types/auth'; // Assuming your detailed User type is here (includes roles/permissions)

// Define the Permission type
interface Permission {
    name: string;
}

// Extend the AuthUserType to include all_permissions
interface UserWithAllPermissions extends AuthUserType {
    all_permissions?: Permission[];
}
export type PermissionName =
  // Dashboard & General
  | 'view dashboard'
  | 'view dashboard_summary'
  //open financials shift
  | 'open financials_shift'
  //close financials shift
  | 'close financials_shift'

  // User Management
  | 'list users'
  | 'view users'
  | 'create users'
  | 'edit users'
  | 'delete users'
  | 'assign roles'
  | 'update user_passwords'
  | 'view user_shift_income'

  // Role & Permission Management
  | 'list roles'
  | 'view roles'
  | 'create roles'
  | 'edit roles'
  | 'delete roles'
  | 'assign permissions_to_role'
  | 'list permissions'

  // Doctor & Specialist Management
  | 'list doctors'
  | 'create doctors'
  | 'edit doctors'
  | 'delete doctors'
  | 'list specialists'
  | 'create specialists'
  | 'edit specialists' // Added
  | 'delete specialists' // Added

  // Patient Management
  | 'list patients'
  | 'view patients'
  | 'register cash_patient'    // NEW
  | 'register insurance_patient' // NEW
  | 'edit patients'
  | 'delete patients'
  | 'search existing_patients'
  | 'create_visit_from_patient_history'
  | 'copy_patient_to_new_visit'

  // Clinic Workspace & Visit Management
  | 'access clinic_workspace'
  | 'view active_clinic_patients'
  | 'create doctor_visits' // This is effectively covered by patient registration permissions
  | 'reassign doctor_visits_to_shift'
  | 'view doctor_visits'
  | 'edit doctor_visits' // For notes, clinical data within a visit
  | 'update doctor_visit_status'
  | 'cancel doctor_visits' // Instead of hard delete

  // Services within a Visit
  | 'request visit_services'
  | 'edit visit_requested_service_details'
  | 'remove visit_services'
  | 'record visit_service_payment'
  | 'manage requested_service_costs' // For cost breakdown dialog
  | 'manage service_payments_deposits' // For managing multiple deposits for a service

  // Lab Requests within a Visit (Clinic side)
  | 'request lab_tests_for_visit'
  | 'edit lab_request_details_clinic'
  | 'cancel lab_requests_clinic'
  | 'clear_pending_lab_requests_for_visit'
  | 'record lab_request_payment_clinic'
  | 'record_batch lab_payment'

  // Shift Management
  | 'view current_open_clinic_shift'
  | 'open clinic_shifts'
  | 'close clinic_shifts'
  | 'manage clinic_shift_financials'
  | 'list clinic_shifts'
  | 'view clinic_shifts'
  | 'view clinic_shift_summary'

  | 'view active_doctor_shifts'
  | 'manage doctor_shifts'
  | 'start doctor_shifts'
  | 'end doctor_shifts'
  | 'list all_doctor_shifts'
  // | 'edit doctor_shift_details' // If fields on DoctorShift itself are editable post-creation
  | 'view doctor_shift_financial_summary'

  // Doctor Schedule & Appointments
  | 'view doctor_schedules'
  | 'manage own_doctor_schedule'
  | 'manage all_doctor_schedules'
  | 'list appointments'
  | 'create appointments'
  | 'view appointment_details'
  | 'cancel appointments'
  | 'update appointment_status'

  // Service & Service Group Definitions
  | 'list services'
  | 'create services'
  | 'edit services'
  | 'delete services'
  | 'list service_groups'
  | 'create service_groups'
  // | 'edit service_groups' // Add if groups are editable
  // | 'delete service_groups' // Add if groups are deletable
  | 'manage service_costs_definitions'
  | 'manage sub_service_cost_types' // CRUD for SubServiceCost

  // Company & Contract Management
  | 'list companies'
  | 'create companies'
  | 'edit companies'
  | 'delete companies'
  | 'view companies'
  | 'view company_contracts'
  | 'manage company_service_contracts' // Implies CUD for service contracts
  | 'import_all_services_to_company_contract'
  | 'copy_company_service_contracts'
  | 'manage company_main_test_contracts' // Implies CUD for test contracts
  | 'import_all_main_tests_to_company_contract'
  // | 'manage subcompanies' // If dedicated UI beyond quick-add
  // | 'manage company_relations' // If dedicated UI beyond quick-add

  // Lab Test Definitions (Settings Area)
  | 'list lab_tests'
  | 'create lab_tests'
  | 'edit lab_tests'
  | 'delete lab_tests'
  | 'batch_update lab_test_prices'
  | 'batch_delete lab_tests'
  | 'manage lab_test_parameters' // Child tests CUD
  | 'reorder lab_test_parameters' // For DND
  | 'manage lab_test_containers'
  | 'manage lab_test_units'
  | 'manage lab_test_child_groups'
  | 'manage lab_test_child_options'
  | 'list lab_test_packages'
  | 'create lab_test_packages'
  | 'edit lab_test_packages'
  | 'delete lab_test_packages'
  | 'view lab_price_list'
  | 'print lab_price_list'

  // Lab Workstation & Results
  | 'access lab_workstation'
  | 'view lab_pending_queue'
  | 'edit lab_request_flags_lab' // sample ID, valid, hidden etc. by lab
  | 'enter lab_results'
  | 'edit_own_lab_results'
  | 'edit_any_lab_results'
  | 'authorize lab_results'
  | 'print lab_sample_labels'
  | 'print lab_worklist'
  | 'print lab_patient_report'
  // | 'manage lab_quality_control'
  // | 'sync_with_lis'

  // Financials & Costs
  | 'list finance_accounts'
  | 'record clinic_costs'
  | 'list clinic_costs'
  | 'print cost_report'

  // Reports
  | 'view reports_section'
  | 'view doctor_shift_reports'
  | 'print doctor_shift_reports'
  | 'view service_statistics_report'
  | 'print service_statistics_report' // if PDF added for this
  | 'view monthly_lab_income_report'
  // | 'print monthly_lab_income_report' // if PDF added
  | 'view monthly_service_income_report'
  | 'export monthly_service_income_pdf'
  | 'export monthly_service_income_excel'
  | 'print company_service_contract_report'
  | 'print company_main_test_contract_report'
  | 'print thermal_receipt'

  // Settings
  | 'view settings'
  | 'update settings'

  // Insurance Auditing
  | 'list auditable_visits'
  | 'view audit_record'
  | 'create_or_update audit_record_patient_info'
  | 'manage_audited_services' // CUD for audited service lines
  | 'copy_original_services_to_audit'
  | 'finalize_audit_record' // verify, needs_correction, reject
  | 'export_audit_claims_pdf'
  | 'export_audit_claims_excel'
  
  // Communication
  | 'send whatsapp_messages'
  // | 'manage whatsapp_templates' // If becomes a feature
  ;
/**
 * Custom hook providing utility functions for checking user roles and permissions.
 */
export const useAuthorization = () => {
    const { user, isLoading: authIsLoading } = useAuth();
    const typedUser = user as UserWithAllPermissions;

    // Memoize derived values to prevent unnecessary recalculations on re-renders
    // if the user object itself hasn't changed.
    const userRoles = React.useMemo(() => {
        return typedUser?.roles?.map(role => role.name) || [];
    }, [typedUser]);

    // For the `can` check, it's best to use all permissions (direct + via roles).
    // Spatie's $user->getAllPermissions() provides this.
    // Ensure your AuthController or UserResource populates this on the user object.
    const userAllPermissions = React.useMemo(() => {
        if (typedUser?.all_permissions) {
            return typedUser.all_permissions.map((permission: Permission) => permission.name);
        }
        const directPermissions = typedUser?.permissions?.map(p => p.name) || [];
        const permissionsFromRoles = typedUser?.roles?.flatMap(role => role.permissions?.map(p => p.name) || []) || [];
        return [...new Set([...directPermissions, ...permissionsFromRoles])];
    }, [typedUser]);


    /**
     * Checks if the current user has a specific permission.
     * @param permissionName The name of the permission to check.
     * @returns True if the user has the permission, false otherwise. Undefined if auth is loading or no user.
     */
    const can = (permissionName: PermissionName): boolean | undefined => {
        if (authIsLoading) return undefined; // Still loading, permission status unknown
        if (!typedUser || !permissionName) return false;

        // If Super Admin role exists and user has it, they can do anything.
        // This assumes 'Super Admin' role is consistently named.
        if (userRoles.includes('Super Admin')) {
            return true;
        }
        
        return userAllPermissions.includes(permissionName);
    };

    /**
     * Checks if the current user has ALL of the specified permissions.
     * @param permissionNames An array of permission names.
     * @returns True if the user has ALL permissions, false otherwise. Undefined if auth is loading or no user.
     */
    const canAll = (permissionNames: PermissionName[]): boolean | undefined => {
        if (authIsLoading) return undefined;
        if (!typedUser || permissionNames.length === 0) return false;
        if (userRoles.includes('Super Admin')) return true;

        return permissionNames.every(permissionName => userAllPermissions.includes(permissionName));
    };

    /**
     * Checks if the current user has ANY of the specified permissions.
     * @param permissionNames An array of permission names.
     * @returns True if the user has AT LEAST ONE of the permissions, false otherwise. Undefined if auth is loading or no user.
     */
    const canAny = (permissionNames: PermissionName[]): boolean | undefined => {
        if (authIsLoading) return undefined;
        if (!typedUser || permissionNames.length === 0) return false;
        if (userRoles.includes('Super Admin')) return true;
        
        return permissionNames.some(permissionName => userAllPermissions.includes(permissionName));
    };


    /**
     * Checks if the current user has a specific role or one of several roles.
     * @param roleOrRoles A single role name (string) or an array of role names.
     * @returns True if the user has the role(s), false otherwise. Undefined if auth is loading or no user.
     */
    const hasRole = (roleOrRoles: string | string[]): boolean | undefined => {
        if (authIsLoading) return undefined;
        if (!typedUser) return false;

        const rolesToCheck = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
        return userRoles.some(userRoleName => rolesToCheck.includes(userRoleName));
    };

    /**
     * Checks if the current user has the 'Super Admin' role.
     * (Or any other specific high-privilege role you define)
     * @returns True if the user is a Super Admin, false otherwise. Undefined if auth is loading or no user.
     */
    const isSuperAdmin = (): boolean | undefined => {
        if (authIsLoading) return undefined; // Explicitly handle loading
        return hasRole('Super Admin');
    };

    return {
        user: typedUser as AuthUserType | null, // Cast for more specific type usage if AuthUserType is detailed
        isLoggedIn: !!typedUser && !authIsLoading,
        authIsLoading, // Expose the loading state
        can,
        canAll,
        canAny,
        hasRole,
        isSuperAdmin,
        userRoles, // Expose memoized roles for potential display
        userAllPermissions, // Expose memoized permissions for potential display or debugging
    };
};