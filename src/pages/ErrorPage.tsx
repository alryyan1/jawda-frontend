import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
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

  const getErrorMessage = () => {
    if (error.data?.message) return error.data.message;
    if (error.message) return error.message;
    if (error.statusText) return error.statusText;
    return 'حدث خطأ غير معروف';
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
            ? 'الصفحة غير موجودة' 
            : 'حدث خطأ ما'}
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
            عودة للخلف
          </Button>
          <Button 
            onClick={handleGoHome}
            className="flex-1 max-w-[200px] mx-auto"
          >
            الذهاب للصفحة الرئيسية
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ErrorPage; 