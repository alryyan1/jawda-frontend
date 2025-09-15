// src/pages/settings/LabSettingsPage.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

const LabSettingsPage: React.FC = () => {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">
          المختبر
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>إعدادات المختبر</CardTitle>
          <CardDescription>إدارة إعدادات المختبر في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            هذا القسم قيد التطوير.
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