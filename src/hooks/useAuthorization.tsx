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

// Your existing PermissionName type - this is great!
export type PermissionName =
  // User Management
  | 'list users' | 'view users' | 'create users' | 'edit users' | 'delete users' | 'assign roles'
  
  // Role Management
  | 'list roles' | 'view roles' | 'create roles' | 'edit roles' | 'delete roles' | 'assign permissions to role'
  
  // Doctor Management
  | 'list doctors' | 'create doctors' | 'edit doctors' | 'delete doctors'
  
  // Patient Management
  | 'list patients' | 'create patients' | 'edit patients' | 'delete patients'
  
  // Clinic & Appointments
  | 'access clinic_workspace' | 'manage appointments' | 'create appointments'
  
  // Services Management
  | 'list services' | 'create services' | 'edit services' | 'delete services'
  | 'create-sale-returns' | 'view-clients' | 'create-clients' | 'edit-clients'
  
  // Company & Contract Management
  | 'list companies' | 'create companies' | 'edit companies' | 'delete companies'
  | 'view company_contracts' | 'manage company_contracts'
  | 'create company_contracts' | 'edit company_contracts' | 'delete company_contracts'
  
  // Clinic Shift Management
  | 'view current_open_shift' | 'open clinic_shifts' | 'close clinic_shifts'
  | 'manage clinic_shift_financials' | 'list clinic_shifts' | 'view clinic_shifts'
  
  // Doctor Shift Management
  | 'view active_doctor_shifts' | 'manage doctor_shifts'
  | 'start doctor_shifts' | 'end doctor_shifts'
  | 'list all_doctor_shifts' | 'edit doctor_shift_details'
  | 'view doctor_shift_financial_summary'
  
  // Doctor Visit Management
  | 'list doctor_visits' | 'view doctor_visits' | 'create doctor_visits'
  | 'edit doctor_visits' | 'update doctor_visit_status' | 'delete doctor_visits'
  
  // Visit Clinical Actions
  | 'request visit_services' | 'edit visit_requested_service_details' | 'remove visit_services'
  | 'record visit_service_payment' | 'manage visit_vitals'
  | 'manage visit_clinical_notes' | 'manage visit_lab_requests' | 'view visit_lab_results'
  | 'manage visit_prescriptions' | 'manage visit_documents'
  
  // Doctor Schedule Management
  | 'view doctor_schedules' | 'manage own_doctor_schedule' | 'manage all_doctor_schedules'
  
  // Lab Tests & Results Management
  | 'create lab_requests' | 'view lab_results' | 'enter lab_results' | 'authorize lab_results'
  | 'list lab_tests' | 'create lab_tests' | 'edit lab_tests' | 'delete lab_tests'
  | 'manage lab_test_containers' | 'manage lab_test_units'
  | 'manage lab_test_child_groups' | 'manage lab_test_child_options'
  | 'view lab_price_list' | 'update lab_test_prices'
  | 'batch_delete lab_tests' | 'print lab_price_list'
  
  // Reports
  | 'view reports_section' | 'view doctor_shift_reports' | 'print doctor_shift_reports'
  | 'view service_statistics_report' | 'print service_statistics_report'
  
  // Settings
  | 'view settings' | 'update settings' | 'manage settings';


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