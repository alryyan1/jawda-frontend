import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import type { User as AuthUserType } from '../types/auth'; // Assuming your detailed User type is here (includes roles/permissions)

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
  // Services
  | 'list services' | 'create services' | 'edit services' | 'delete services'
  // Lab & Results
  | 'create lab_requests' | 'view lab_results' | 'enter lab_results' | 'authorize lab_results'
  // Settings
  | 'manage settings' // General settings permission
  // Add more specific permissions as defined in your backend seeder
  // Example from your list:
  | 'create-sale-returns' // Note: Spatie typically uses spaces, e.g., 'create sale-returns'
  | 'view-clients'
  | 'create-clients'
  | 'edit-clients'
  // ... continue with all permissions you've defined in RolesAndPermissionsSeeder
  // It's crucial these string literals exactly match the permission names in your database.
  ;


/**
 * Custom hook providing utility functions for checking user roles and permissions.
 */
export const useAuthorization = () => {
    const { user, isLoading: authIsLoading } = useAuth(); // Get user and loading state from context

    // Memoize derived values to prevent unnecessary recalculations on re-renders
    // if the user object itself hasn't changed.
    const userRoles = React.useMemo(() => {
        return user?.roles?.map(role => role.name) || [];
    }, [user]);

    // For the `can` check, it's best to use all permissions (direct + via roles).
    // Spatie's $user->getAllPermissions() provides this.
    // Ensure your AuthController or UserResource populates this on the user object.
    const userAllPermissions = React.useMemo(() => {
        // If your backend sends `all_permissions` (from $user->getAllPermissions())
        if (user?.all_permissions) {
            return user.all_permissions.map(permission => permission.name);
        }
        // Fallback: combine direct permissions and permissions from roles
        // This requires roles to have their permissions eager-loaded or accessible.
        // This part can get complex on the frontend if not provided directly by backend.
        // It's simpler if backend provides `all_permissions`.
        const directPermissions = user?.permissions?.map(p => p.name) || [];
        const permissionsFromRoles = user?.roles?.flatMap(role => role.permissions?.map(p => p.name) || []) || [];
        return [...new Set([...directPermissions, ...permissionsFromRoles])]; // Unique permissions
    }, [user]);


    /**
     * Checks if the current user has a specific permission.
     * @param permissionName The name of the permission to check.
     * @returns True if the user has the permission, false otherwise. Undefined if auth is loading or no user.
     */
    const can = (permissionName: PermissionName): boolean | undefined => {
        if (authIsLoading) return undefined; // Still loading, permission status unknown
        if (!user || !permissionName) return false;

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
        if (!user || permissionNames.length === 0) return false;
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
        if (!user || permissionNames.length === 0) return false;
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
        if (!user) return false;

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
        user: user as AuthUserType | null, // Cast for more specific type usage if AuthUserType is detailed
        isLoggedIn: !!user && !authIsLoading,
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