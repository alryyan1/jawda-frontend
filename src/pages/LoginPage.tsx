import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
} from "@/components/ui/form"; // shadcn/ui Form component

import { useAuth } from "../contexts/AuthContext"; // Your AuthContext
import { Loader2 } from "lucide-react"; // For loading spinner

// Define the Zod schema based on your translation keys for error messages
const getLoginSchema = (t) =>
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

// Define the type for form values based on the schema
// We need to infer it after the schema is created with 't'
// type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>; // This would be ideal

// Simpler approach for type if inferring dynamically is tricky with 't'
type LoginFormValues = z.infer<
  z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
  }>
>;

const LoginPage: React.FC = () => {
  const { login, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location for redirection after login
  const [apiError, setApiError] = useState<string | null>(null);

  // Specify the 'login' namespace for this component.
  // 'common' can also be loaded if you use keys from common.json.
  const { t } = useTranslation(["login", "common"]);

  // Create the schema once 't' is available
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
      // Check if there's a 'from' location in the state (passed from ProtectedRoute)
      const from = location.state?.from?.pathname || "/"; // Default to homepage if no 'from'
      navigate(from, { replace: true }); // Redirect to original destination or homepage
    } catch (error: any) {
      let errorMessage = t("login:loginFailedDefault"); // Default error message
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          // Handle Laravel validation errors (more specific)
          const firstErrorField = Object.keys(error.response.data.errors)[0];
          if (firstErrorField) {
            errorMessage = error.response.data.errors[firstErrorField][0];
          }
        } else if (error.response.data.message) {
          // Handle general error messages from backend
          errorMessage = error.response.data.message;
        }
      }
      setApiError(errorMessage);
      console.error("Login error:", error);
    }
  };

  // Combine auth context loading state with form submission loading state
  const currentIsLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          {/* You could add a logo here */}
          <CardTitle className="text-2xl font-bold">
            {t("login:title")}
          </CardTitle>
          <CardDescription>{t("login:description")}</CardDescription>
        </CardHeader>

        <Form {...form}>
          
          {/* Spread shadcn/ui form context */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {apiError && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md">
                  {apiError}
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
                        disabled={currentIsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                    {/* Displays Zod validation error for this field */}
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
                      <Input
                        type="password"
                        placeholder={t("login:passwordPlaceholder")}
                        {...field}
                        disabled={currentIsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                    {/* Displays Zod validation error for this field */}
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={currentIsLoading}
              >
                {currentIsLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {currentIsLoading
                  ? t("login:loggingInButton")
                  : t("login:loginButton")}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                {t("login:noAccountPrompt")}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline underline-offset-4"
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
