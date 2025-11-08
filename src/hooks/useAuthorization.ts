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
  // Test/Lab Permissions
  | 'سداد فحص'                    // Pay for test
  | 'الغاء سداد فحص'              // Cancel test payment
  | 'تخفيض فحص'                   // Reduce test
  | 'حذف فحص مضاف'                // Delete added test
  | 'تحقيق نتيجه'                 // Achieve result
  | 'طباعه نتيجه'                 // Print result

  // Service Permissions
  | 'سداد خدمه'                   // Pay for service
  | 'الغاء سداد خدمه'             // Cancel service payment
  | 'حذف خدمه مضافه'             // Delete added service
  | 'تخفيض خدمه'                  // Reduce service

  // Patient Management
  | 'تسجيل مريض كاش'              // Register cash patient
  | 'تسجيل مريض تامين'            // Register insurance patient

  // General Data Management
  | 'تعديل بيانات'                 // Edit data

  // Financial Shift Management
  | 'فتح ورديه ماليه'              // Open financial shift
  | 'اغلاق ورديه ماليه'            // Close financial shift

  // Reports & Settings
  | 'عرض التقارير'                 // View reports
  | 'عرض الاعدادات'                // View settings
  | 'اضافه خدمه'                  // Add service
  | 'اضافه فحص'                  // Add test
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
        console.log(userAllPermissions,'userAllPermissions')
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