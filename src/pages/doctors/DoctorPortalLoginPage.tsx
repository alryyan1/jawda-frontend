import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2, Stethoscope, UserRound, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormData {
  username: string;
  password: string;
}

const DoctorPortalLoginPage: React.FC = () => {
  const { login, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<LoginFormData>({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!formData.username.trim()) {
      setApiError('اسم المستخدم مطلوب');
      return;
    }
    if (!formData.password.trim()) {
      setApiError('كلمة المرور مطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData);
      const from = (location.state as { from?: Location })?.from?.pathname || '/doctor-portal';
      navigate(from, { replace: true });
    } catch (error: unknown) {
      let errorMessage = 'فشلت المصادقة. يرجى التحقق من بيانات الاعتماد.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        const firstErrorField = axiosError.response?.data?.errors
          ? Object.keys(axiosError.response.data.errors)[0]
          : undefined;
        if (firstErrorField) {
          errorMessage = axiosError.response!.data!.errors![firstErrorField][0];
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = authIsLoading || isSubmitting;

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-cyan-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950"
    >
      {/* Subtle medical pattern backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-15"
        style={{
          backgroundImage: "url('/doctor-portal-pattern.svg')",
          backgroundSize: '180px 180px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Soft glow accents for depth */}
      <div className="pointer-events-none absolute -top-24 -start-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/10" />
      <div className="pointer-events-none absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10" />

      <div className="relative w-full max-w-sm rounded-2xl border bg-card/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">بوابة الطبيب</h1>
          <p className="mt-1 text-sm text-muted-foreground">سجّل الدخول لعرض قائمة مرضاك</p>
        </div>

        {apiError && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">اسم المستخدم</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                disabled={isBusy}
                value={formData.username}
                onChange={handleChange}
                className="pe-9"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isBusy}
                value={formData.password}
                onChange={handleChange}
                className="pe-9 ps-9"
                placeholder="أدخل كلمة المرور"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                disabled={isBusy}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isBusy} className="w-full gap-2">
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isBusy ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DoctorPortalLoginPage;
