// src/pages/settings/CompanySettingsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';

const CompanySettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'companies']); // Load 'settings' and 'companies' namespaces

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">
          {t('tabs.companyInsurance', { ns: 'settings' })}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('companySettings.title', { ns: 'settings' })}</CardTitle>
          <CardDescription>{t('companySettings.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('common:underDevelopment', "This section is under development.")}
          </p>
          {/* TODO: Add settings related to company/insurance configurations */}
          {/* Examples:
              - Default endurance percentages for new company contracts
              - Approval workflows for company contracts
              - Billing codes or specific settings for insurance claims
          */}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;