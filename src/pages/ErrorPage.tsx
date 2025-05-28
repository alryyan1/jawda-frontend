import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorResponse {
  status?: number;
  statusText?: string;
  message?: string;
  data?: {
    message?: string;
  };
}

const ErrorPage: React.FC = () => {
  const error = useRouteError() as ErrorResponse;
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);

  const getErrorMessage = () => {
    if (error.data?.message) return error.data.message;
    if (error.message) return error.message;
    if (error.statusText) return error.statusText;
    return t('common:error.unknownError');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="flex justify-center mb-6">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          {error.status === 404 
            ? t('common:error.pageNotFound') 
            : t('common:error.somethingWentWrong')}
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {getErrorMessage()}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="flex-1 max-w-[200px] mx-auto"
          >
            {t('common:actions.goBack')}
          </Button>
          <Button 
            onClick={handleGoHome}
            className="flex-1 max-w-[200px] mx-auto"
          >
            {t('common:actions.goHome')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ErrorPage; 