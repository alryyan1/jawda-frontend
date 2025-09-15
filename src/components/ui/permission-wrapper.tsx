// src/components/ui/permission-wrapper.tsx
import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PermissionWrapperProps {
  permission: string;
  children: React.ReactNode;
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  fallback?: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  permission,
  children,
  className,
  showTooltip = true,
  tooltipText = 'No permission',
  fallback
}) => {
  const { can } = useAuth();
  const hasPermission = can(permission);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={cn(
          "relative inline-block",
          "border-2 border-red-500 rounded-md",
          "opacity-50 cursor-not-allowed",
          "transition-all duration-200",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-1 rounded z-10">
          No Permission
        </div>
        <div className="pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Specialized wrapper for buttons
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: React.ReactNode;
  showTooltip?: boolean;
  tooltipText?: string;
  fallback?: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  showTooltip = true,
  tooltipText = 'No permission',
  fallback,
  className,
  disabled,
  ...props
}) => {
  const { can } = useAuth();
  const hasPermission = can(permission);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <button
        {...props}
        disabled={true}
        className={cn(
          "relative border-2 border-red-500 rounded-md",
          "opacity-50 cursor-not-allowed",
          "transition-all duration-200",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-1 rounded z-10">
          No Permission
        </div>
        {children}
      </button>
    );
  }

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
};

// Specialized wrapper for links
interface PermissionLinkProps {
  permission: string;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  fallback?: React.ReactNode;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  permission,
  children,
  href,
  onClick,
  className,
  showTooltip = true,
  tooltipText = 'No permission',
  fallback
}) => {
  const { can } = useAuth();
  const hasPermission = can(permission);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <span
        className={cn(
          "relative inline-block border-2 border-red-500 rounded-md",
          "opacity-50 cursor-not-allowed",
          "transition-all duration-200",
          className
        )}
        title={showTooltip ? tooltipText : undefined}
      >
        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-1 rounded z-10">
          No Permission
        </div>
        {children}
      </span>
    );
  }

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
};
