// src/pages/SettingsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings'); // Assuming a 'settings' namespace

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <p>{t('contentPlaceholder')}</p>
    </div>
  );
};

export default SettingsPage;