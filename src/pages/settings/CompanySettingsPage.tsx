// src/pages/settings/CompanySettingsPage.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';

const CompanySettingsPage: React.FC = () => {
  // Removed i18n: using direct Arabic text

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">الشركات والتأمين</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الشركات</CardTitle>
          <CardDescription>إدارة إعدادات الشركات والتأمين في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">هذا القسم قيد التطوير.</p>
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