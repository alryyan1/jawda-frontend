// src/pages/settings/ServiceSettingsPage.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListOrdered } from 'lucide-react';

const ServiceSettingsPage: React.FC = () => {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">
          إعدادات الخدمات
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الخدمات</CardTitle>
          <CardDescription>إدارة إعدادات الخدمات في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            هذا القسم قيد التطوير.
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