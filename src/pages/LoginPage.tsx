import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2, UserCheck, Heart, Shield, Stethoscope } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Simple form data interface
interface LoginFormData {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { login, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsSubmitting(true);

    // Simple validation
    if (!formData.username.trim()) {
      setApiError("اسم المستخدم مطلوب");
      setIsSubmitting(false);
      return;
    }
    if (!formData.password.trim()) {
      setApiError("كلمة المرور مطلوبة");
      setIsSubmitting(false);
      return;
    }

    try {
      await login(formData);
      console.log("Login completed, navigating to:", location.state?.from?.pathname || "/");
      
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }, 100);
    } catch (error: unknown) {
      let errorMessage = "فشلت المصادقة. يرجى التحقق من بيانات الاعتماد.";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (axiosError.response?.data) {
          if (axiosError.response.data.errors) {
            const firstErrorField = Object.keys(axiosError.response.data.errors)[0];
            if (firstErrorField) {
              errorMessage = axiosError.response.data.errors[firstErrorField][0];
            }
          } else if (axiosError.response.data.message) {
            errorMessage = axiosError.response.data.message;
          }
        }
      }
      setApiError(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentIsLoading = authIsLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-slate-900 dark:via-teal-900 dark:to-cyan-900 flex items-center justify-center p-4 transition-all duration-500 relative overflow-hidden" dir="rtl">
      {/* Medical SVG Background Pattern */}
   
      
    
      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Medical glowing background effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-3xl blur opacity-20 dark:opacity-30 animate-pulse"></div>
        
        <div className="relative bg-white dark:bg-slate-800 backdrop-blur-xl border border-teal-200 dark:border-slate-700 rounded-3xl p-8 transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            {/* System Logo */}
            <div className="mx-auto w-30 h-30 mb-1 transform hover:scale-105 transition-transform duration-300">
              <img 
              
                src="/logo.png" 
                alt="نظام جوده" 
                className=" object-contain  "
              />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-cyan-600 dark:from-teal-300 dark:to-cyan-300 bg-clip-text text-transparent">
              بوابة الرعاية الصحية
            </h1>
       
          </div>

          {/* Error Alert */}
          {apiError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-400 text-sm">{apiError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 dark:text-teal-500">
                  <UserCheck className="w-5 h-5" />
                </div>
                <input
                  name="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  disabled={currentIsLoading}
                  value={formData.username}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full pr-11 pl-4 py-3 bg-teal-50 dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-white placeholder-teal-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    focusedField === "username"
                      ? 'border-teal-400 dark:border-teal-500 focus:ring-teal-500/20 focus:border-teal-500  bg-teal-100 dark:bg-slate-600'
                      : 'border-teal-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-slate-500'
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-teal-700 dark:text-teal-300">
                كلمة المرور الآمنة
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 dark:text-teal-500">
                  <Shield className="w-5 h-5" />
                </div>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور الآمنة"
                  autoComplete="current-password"
                  disabled={currentIsLoading}
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full pr-11 pl-12 py-3 bg-teal-50 dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-white placeholder-teal-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    focusedField === "password"
                      ? 'border-teal-400 dark:border-teal-500 focus:ring-teal-500/20 focus:border-teal-500 shadow-lg bg-teal-100 dark:bg-slate-600'
                      : 'border-teal-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-slate-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 dark:text-teal-500 hover:text-teal-600 dark:hover:text-teal-300 focus:outline-none transition-colors duration-200"
                  disabled={currentIsLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={currentIsLoading}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {currentIsLoading && (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <span>
                {currentIsLoading ? "جاري المصادقة..." : "دخول البوابة"}
              </span>
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;