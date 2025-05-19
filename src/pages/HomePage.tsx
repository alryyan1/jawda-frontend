// src/pages/HomePage.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Assuming you have this
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.welcomeMessage', { name: user?.name || 'User' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.contentPlaceholder')}</p>
          {/* More dashboard widgets or summaries can go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;