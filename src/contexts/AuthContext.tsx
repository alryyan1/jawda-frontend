import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import apiClient from "../services/api"; // Your Axios instance
import type { Shift } from "../types/shifts"; // Your Shift type
import { getCurrentOpenShift as apiGetCurrentOpenShift } from "../services/shiftService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/auth";

// 1. Define the Context Type (as we did before)
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // For initial auth check (user and token)
  login: (credentials: Record<string, any>) => Promise<void>;
  register: (data: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>; // To refresh user data

  currentClinicShift: Shift | null;
  isLoadingShift: boolean; // Loading state specifically for the shift
  refetchCurrentClinicShift: () => Promise<void>; // Function to manually refetch
}

// 2. Create the Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider Component (AuthProvider)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage if available
    const storedUser = localStorage.getItem("authUser");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      localStorage.removeItem("authUser"); // Clear invalid item
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("authToken")
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Start as true
  const queryClient = useQueryClient();

  const currentOpenShiftQueryKey = ["currentOpenShiftForContext"] as const;
  const {
    data: currentClinicShiftData,
    isLoading: isLoadingShiftData,
    refetch: refetchShiftDataFromQuery, // Renamed to avoid conflict
    isError: isShiftError, // To handle shift fetching errors
  } = useQuery<Shift | null, Error>({
    queryKey: currentOpenShiftQueryKey,
    queryFn: apiGetCurrentOpenShift,
    enabled: !!token && !!user, // Only fetch if authenticated
    // staleTime: 5 * 60 * 1000,p
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry excessively if it's a 404 (no shift open)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
  const currentClinicShift = currentClinicShiftData ?? null; // Ensure null if undefined
  console.log('currentClinicShift', currentClinicShift ,'in auth context');
  const fetchUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsAuthLoading(false);
      return;
    }
    // No need to set setIsAuthLoading(true) here if it's already true from initial state
    // Or if called after login/register where parent function handles it.
    try {
      const response = await apiClient.get<User>("/user");
      setUser(response.data);
      localStorage.setItem("authUser", JSON.stringify(response.data));
    } catch (error: any) {
      console.error("AuthContext: Failed to fetch user", error);
      // Check if the error is an Unauthenticated error
      if (
        error.response?.status === 401 && 
        error.response?.data?.message === "Unauthenticated."
      ) {
      // Clear everything on auth failure during fetchUser
      setToken(null);
      setUser(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      queryClient.removeQueries({ queryKey: currentOpenShiftQueryKey });
        
        // Redirect to login page
        window.location.href = "/login";
      }
    } finally {
      // This loading state is specifically for the user fetch operation.
      // The initial overall `isAuthLoading` should be set to false after first token check.
    }
  }, [token, queryClient, currentOpenShiftQueryKey]);

  useEffect(() => {

    const storedToken = localStorage.getItem("authToken");
    console.log(user,'user in auth context');
    if (storedToken) {
      if (token !== storedToken) setToken(storedToken); // Sync token state if needed
      // If user state is null but token exists, try to fetch user
      if (!user && storedToken) {
        // setIsAuthLoading(true); // Indicate we are trying to authenticate
        fetchUser().finally(() => setIsAuthLoading(false)); // Set loading false after attempt
      } else {
        setIsAuthLoading(false); // User already exists or no token, initial auth check done
      }
    } else {
      // No token found, clear user state and finish initial auth loading
      setUser(null);
      localStorage.removeItem("authUser");
      setToken(null);
      setIsAuthLoading(false);
    }
  }, [token, user, fetchUser]); // Rerun if token changes externally or user becomes null

  const login = async (credentials: Record<string, any>) => {
    setIsAuthLoading(true); // Loading during login process
    try {
      const response = await apiClient.post<AuthResponse>(
        "/login",
        credentials
      );
      const { user: userData, token: newToken } = response.data;

      localStorage.setItem("authToken", newToken);
      localStorage.setItem("authUser", JSON.stringify(userData)); // Store basic user from login
      setToken(newToken);
      setUser(userData); // Set user immediately, fetchUser can refine with more details if needed later

      // After successful login, trigger refetch of current shift
      await queryClient.invalidateQueries({
        queryKey: currentOpenShiftQueryKey,
      });
      // Or await refetchShiftDataFromQuery();
    } catch (error) {
      // Clear partial auth state on login failure
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setToken(null);
      setUser(null);
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const register = async (data: Record<string, any>) => {
    setIsAuthLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>("/register", data);
      const { user: userData, token: newToken } = response.data;

      localStorage.setItem("authToken", newToken);
      localStorage.setItem("authUser", JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);

      await queryClient.invalidateQueries({
        queryKey: currentOpenShiftQueryKey,
      });
    } catch (error) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setToken(null);
      setUser(null);
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    // No need to set isAuthLoading(true) for logout operation itself,
    // but the state changes will trigger re-renders.
    const currentToken = localStorage.getItem("authToken"); // Get token before clearing

    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    // Clear React Query cache for shift and user related data on logout
    queryClient.removeQueries({ queryKey: currentOpenShiftQueryKey });
    queryClient.removeQueries({ queryKey: ["user"] }); // If you cache current user details with this key

    if (currentToken) {
      // Attempt server logout only if a token was present
      try {
        // Use a fresh apiClient instance or ensure the current one clears its auth header
        // For simplicity, assume apiClient handles clearing its header on 401 or next request without token
        await apiClient.post(
          "/logout",
          {},
          {
            headers: { Authorization: `Bearer ${currentToken}` }, // Send the token being invalidated
          }
        );
      } catch (error) {
        console.error(
          "Logout failed on server (token might have already been invalid):",
          error
        );
      }
    }
  };

  const refetchCurrentClinicShift = useCallback(async () => {
    if (token && user) {
      // Only refetch if authenticated
      await refetchShiftDataFromQuery();
    }
  }, [refetchShiftDataFromQuery, token, user]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // if the identity of the user/token/functions hasn't changed.
  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: isAuthLoading,
      login,
      register,
      logout,
      fetchUser,
      currentClinicShift,
      isLoadingShift:
        isLoadingShiftData ||
        (isAuthLoading && !currentClinicShiftData && !!token && !!user), // Refined loading state for shift
      refetchCurrentClinicShift,
    }),
    [
      user,
      token,
      isAuthLoading,
      login,
      register,
      logout,
      fetchUser,
      currentClinicShift,
      isLoadingShiftData,
      refetchCurrentClinicShift,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// 4. Create and Export the Custom Hook `useAuth`
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
