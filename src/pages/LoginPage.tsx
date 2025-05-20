import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "../contexts/AuthContext";

const getLoginSchema = (t: any) =>
  z.object({
    username: z
      .string()
      .min(1, {
        message: t("login:fieldRequired", { field: t("login:usernameLabel") }),
      }),
    password: z
      .string()
      .min(1, {
        message: t("login:fieldRequired", { field: t("login:passwordLabel") }),
      }),
  });

type LoginFormValues = z.infer<
  z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
  }>
>;

const LoginPage: React.FC = () => {
  const { login, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { t } = useTranslation(["login", "common"]);
  const loginSchema = getLoginSchema(t);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      await login(data);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (error: any) {
      let errorMessage = t("login:loginFailedDefault");
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          const firstErrorField = Object.keys(error.response.data.errors)[0];
          if (firstErrorField) {
            errorMessage = error.response.data.errors[firstErrorField][0];
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      setApiError(errorMessage);
      console.error("Login error:", error);
    }
  };

  const currentIsLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 transition-colors">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        <CardHeader className="space-y-4 text-center">
          {/* Logo or avatar */}
          <div className="mx-auto mb-2 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              {/* Replace with your logo if desired */}
              <span className="text-3xl font-black text-primary">🔒</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold font-cairo tracking-tight">
            {t("login:title")}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {t("login:description")}
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
            <CardContent className="space-y-5">
              {apiError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}
              <FormField
                control={control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("login:usernameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t("login:usernamePlaceholder")}
                        {...field}
                        autoComplete="username"
                        disabled={currentIsLoading}
                        className="bg-white dark:bg-slate-950"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("login:passwordLabel")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("login:passwordPlaceholder")}
                          {...field}
                          autoComplete="current-password"
                          disabled={currentIsLoading}
                          className="pr-10 bg-white dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full mt-3 gap-2 font-semibold text-lg transition-all"
                disabled={currentIsLoading}
                size="lg"
              >
                {currentIsLoading && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {currentIsLoading
                  ? t("login:loggingInButton")
                  : t("login:loginButton")}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                {t("login:noAccountPrompt")}&nbsp;
                <Link
                  to="/register"
                  className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
                >
                  {t("login:registerLinkText")}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;