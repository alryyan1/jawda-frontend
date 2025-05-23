// src/pages/settings/LabSettingsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

const LabSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'labTests']); // Load 'settings' and 'labTests'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">
          {t('tabs.laboratory', { ns: 'settings' })}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('labSettings.title', { ns: 'settings' })}</CardTitle>
          <CardDescription>{t('labSettings.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('common:underDevelopment', "This section is under development.")}
          </p>
          {/* TODO: Add settings related to Laboratory configurations */}
          {/* Examples:
              - Default normal ranges or panic values for tests
              - LIS integration settings
              - Instrument configurations
              - Lab report templates/customization
              - Default units or child groups
          */}
        </CardContent>
      </Card>
    </div>
  );
};

export default LabSettingsPage;