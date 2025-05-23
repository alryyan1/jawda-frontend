// src/pages/settings/ServiceSettingsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListOrdered } from 'lucide-react';

const ServiceSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'services']); // Load 'settings' and 'services'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">
          {t('tabs.servicesConfig', { ns: 'settings' })}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('serviceSettings.title', { ns: 'settings' })}</CardTitle>
          <CardDescription>{t('serviceSettings.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('common:underDevelopment', "This section is under development.")}
          </p>
          {/* TODO: Add settings related to Service configurations */}
          {/* Examples:
              - Default 'activate' or 'variable' status for new services
              - Default pricing tiers or rules
              - Tax configurations for services
          */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceSettingsPage;