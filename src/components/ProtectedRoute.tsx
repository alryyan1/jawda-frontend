import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Your AuthContext
import { Loader2 } from 'lucide-react'; // Or your preferred loading spinner

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Gets the current URL location object

  if (isLoading) {
    // While the authentication status is being determined, show a loading state.
    // This prevents a "flash" of the login page or the protected content
    // if the user is actually authenticated but it takes a moment to confirm.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        {/* You could also add a text message like "Verifying authentication..." */}
      </div>
    );
  }

  if (!isAuthenticated) {
    // User is not authenticated.
    // Redirect them to the /login page.
    // We pass the current location in the `state` object.
    // This allows the LoginPage to redirect the user back to the page
    // they were trying to access after successful login.
    return <Navigate to="/login" state={{ from: location }} replace />;
    // `replace` prop: Replaces the current entry in the history stack instead of adding a new one.
    // This is useful because if the user clicks "back" from the login page,
    // they won't go back to the protected route (which would just redirect them again).
  }

  // User is authenticated, so render the child routes.
  // <Outlet /> is a placeholder from react-router-dom where matched child routes will be rendered.
  return <Outlet />;
};

export default ProtectedRoute;