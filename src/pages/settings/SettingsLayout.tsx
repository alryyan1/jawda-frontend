// src/pages/settings/SettingsLayout.tsx
import React from 'react';
import { Outlet, NavLink, /* useLocation */ } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Settings, Building, FlaskConical, ListOrdered, CreditCard, Printer, Workflow, MessageCircle 
} from 'lucide-react'; // Added Printer, Workflow, MessageCircle
import { cn } from '@/lib/utils';
    // import { useAuthorization } from '@/hooks/useAuthorization';

interface SettingsNavItem {
  to: string;
  labelKey: string; // e.g., 'tabs.general' from settings.json
  icon: React.ElementType;
  permission?: string;
}

// Updated list of settings navigation items
const settingsNavItems: SettingsNavItem[] = [
  { to: 'general', labelKey: 'tabs.general', icon: Settings, permission: 'view settings' },
  { to: 'companies', labelKey: 'companies', icon: Building, permission: 'manage company_settings' }, // Example permission
  { to: 'laboratory', labelKey: 'laboratory', icon: FlaskConical, permission: 'manage laboratory_settings' },
  { to: 'services', labelKey: 'tabs.servicesConfig', icon: ListOrdered, permission: 'manage service_settings' },
  { to: '/settings/laboratory/price-list', labelKey: 'laboratoryTestsPriceList', icon: CreditCard, permission: 'manage price_list' },
];

const SettingsLayout: React.FC = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  // const { can } = useAuthorization(); // Implement actual permission checks

  // Placeholder 'can' function for layout demonstration
  const can = (permission?: string): boolean => {
    if (!permission) return true; // No specific permission required
    // console.log("Checking permission for settings sub-nav:", permission);
    return true; // Default to true for now
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      <aside 
        className={cn(
            "w-full md:w-60 border-border bg-card p-3 md:p-4 overflow-y-auto md:h-full shrink-0 print:hidden",
            i18n.dir() === 'rtl' ? "md:border-l" : "md:border-r"
        )}
      >
        <h2 className="text-lg font-semibold mb-4 px-2 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          {t('settings:pageTitle')}
        </h2>
        <nav className="space-y-1">
          {settingsNavItems.map(item => 
            can(item.permission) && (
            <NavLink
              key={item.to}
              to={item.to} 
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )
              }
              end // Important for exact path matching
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey, { ns: 'settings' })}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto md:h-full">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsLayout;