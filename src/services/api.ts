// src/services/api.ts (or your existing axios setup)
import { host, projectFolder, schema } from "@/pages/constants";
import axios from "axios";
import { toast } from "sonner";

export const API_BASE_URL = `${schema}://${host}/${projectFolder}/public/api`;
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, "");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptor to add the token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Guard to prevent multiple simultaneous redirects to login
let isRedirectingToLogin = false;

// Interceptor to handle 401/Unauthenticated errors and show global error toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors - but not during login/register
    const isAuthEndpoint =
      error.config?.url?.includes("/login") ||
      error.config?.url?.includes("/register");

    if (
      error.response?.data?.message === "Unauthenticated." &&
      !isAuthEndpoint &&
      !(error.config as any)?.skipAuthRedirect &&
      !isRedirectingToLogin
    ) {
      isRedirectingToLogin = true;

      // Clear auth data
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");

      // Show message before redirect
      toast.error("انتهت جلستك، يرجى تسجيل الدخول مجدداً");

      // Redirect to login with a short delay so the toast is visible
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);

      console.error("Session expired or invalid. Redirecting to login.");
      return Promise.reject(error);
    }

    // Respect per-request suppression flag to avoid duplicate toasts
    const suppressToast = Boolean(
      error.config?.headers?.["X-Suppress-Error-Toast"] ||
        error.config?.suppressToast
    );

    // Show toast for other API errors
    if (!suppressToast && error.response?.status >= 400) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        `خطأ في الخادم (${error.response?.status})`;

      // Show toast for meaningful error messages
      if (errorMessage && !errorMessage.includes("Network Error")) {
        toast.error(errorMessage);
      } else {
        // Fallback for generic server errors
        toast.error(`خطأ في الخادم (${error.response?.status})`);
      }
    } else if (!suppressToast && !error.response) {
      // Network error (no response from server)
      toast.error("خطأ في الاتصال بالخادم - تحقق من اتصال الإنترنت");
    } else if (!suppressToast) {
      // Other errors
      toast.error("حدث خطأ غير متوقع");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
