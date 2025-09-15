// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link, useRouteError, isRouteErrorResponse, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Home } from 'lucide-react';

interface NotFoundPageProps {
  title?: string;
  message?: string;
  errorCode?: string | number;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ 
    title: propTitle, 
    message: propMessage,
    errorCode: propErrorCode 
}) => {
  const routeError = useRouteError(); // For use as an errorElement
  const location = useLocation(); // To get state if message is passed via navigation

  let displayTitle = propTitle || 'الصفحة غير موجودة';
  let displayMessage = propMessage || 'عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.';
  let displayErrorCode: string | number | undefined = propErrorCode;

  if (isRouteErrorResponse(routeError)) {
    // This is a response error (e.g., 404, 403, 500) from a loader or action
    displayTitle = routeError.statusText || 'خطأ';
    displayMessage = routeError.data?.message || routeError.data || 'حدث خطأ غير متوقع.';
    displayErrorCode = routeError.status;
  } else if (routeError instanceof Error) {
    // This is a generic Error object
    displayTitle = 'حدث خطأ';
    displayMessage = routeError.message || 'حدث خطأ ما.';
    displayErrorCode = "Error";
  } else if (typeof routeError === 'string') {
    displayTitle = 'حدث خطأ';
    displayMessage = routeError;
    displayErrorCode = "Error";
  }

  // Check for message passed via location state (e.g., from a programmatic navigation)
  if (location.state?.errorMessage) {
    displayMessage = location.state.errorMessage;
    if (!propTitle && !routeError) displayTitle = 'معلومة';
  }
  if (location.state?.errorTitle) {
    displayTitle = location.state.errorTitle;
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4 text-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
          {displayErrorCode && (
            <p className="text-6xl font-bold text-destructive">{displayErrorCode}</p>
          )}
          <CardTitle className="text-2xl font-semibold mt-2">{displayTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base text-muted-foreground">
            {displayMessage}
          </CardDescription>
          <Button asChild className="mt-8">
            <Link to="/">
              <Home className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              الذهاب للصفحة الرئيسية
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;