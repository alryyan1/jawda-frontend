import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Define the Zod schema using the t function for dynamic validation messages
const getRegisterSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('register:fieldRequired', { field: t('register:nameLabel') }) }),
  username: z.string().min(3, { message: t('register:usernameMinLength') }),
  password: z.string().min(6, { message: t('register:passwordMinLength') }),
  password_confirmation: z.string(),
  // Add other fields from your User model that are part of registration
  // For example, if 'user_money_collector_type' is needed:
  // user_money_collector_type: z.enum(['lab', 'company', 'clinic', 'all'], { 
  //   required_error: t('register:fieldRequired', { field: t('register:userTypeLabel') }) 
  // }),
}).refine((data) => data.password === data.password_confirmation, {
  message: t('register:passwordsDoNotMatch'),
  path: ["password_confirmation"], // Path of error for password_confirmation field
});

// Define the type for form values
// Simpler approach for type if inferring dynamically is tricky with 't'
type RegisterFormValues = z.infer<z.ZodObject<{
  name: z.ZodString;
  username: z.ZodString;
  password: z.ZodString;
  password_confirmation: z.ZodString;
  // user_money_collector_type?: z.ZodEnum<['lab', 'company', 'clinic', 'all']>; // Example
}>>;


const RegisterPage: React.FC = () => {
  // Aliasing 'register' from useAuth to avoid conflict with react-hook-form's register
  const { register: authRegister, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { t } = useTranslation(['register', 'common']);

  const registerSchema = getRegisterSchema(t);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      password_confirmation: '',
      // user_money_collector_type: 'all', // Example default
    },
  });

  const { handleSubmit, control, formState: { isSubmitting } } = form;

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    try {
      // The backend expects 'password_confirmation', so it's included in 'data'
      await authRegister(data);
      navigate('/'); // Redirect to dashboard or home page
    } catch (error: any) {
      let errorMessage = t('register:registrationFailedDefault');
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          // Handle Laravel validation errors
          const fieldErrors = Object.entries(error.response.data.errors)
            .map(([field, messages]) => `${t(`register:${field}Label`, field)}: ${(messages as string[]).join(', ')}`) // Attempt to translate field names
            .join(' | ');
          errorMessage = fieldErrors || errorMessage;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      setApiError(errorMessage);
      console.error("Registration error:", error);
    }
  };

  const currentIsLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md"> {/* Made card slightly wider for more fields */}
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t('register:title')}</CardTitle>
          <CardDescription>{t('register:description')}</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {apiError && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md">
                  {apiError}
                </div>
              )}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register:nameLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('register:namePlaceholder')} 
                        {...field} 
                        disabled={currentIsLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register:usernameLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('register:usernamePlaceholder')} 
                        {...field} 
                        disabled={currentIsLoading} 
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
                    <FormLabel>{t('register:passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('register:passwordPlaceholder')} 
                        {...field} 
                        disabled={currentIsLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="password_confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register:confirmPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('register:confirmPasswordPlaceholder')} 
                        {...field} 
                        disabled={currentIsLoading} 
                      />
                    </FormControl>
                    <FormMessage /> {/* Zod refine error will show here */}
                  </FormItem>
                )}
              />
              {/* Example for user_money_collector_type if you add it to the schema
              <FormField
                control={control}
                name="user_money_collector_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register:userTypeLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentIsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('register:selectUserTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lab">{t('userTypes.lab')}</SelectItem>
                        <SelectItem value="company">{t('userTypes.company')}</SelectItem>
                        <SelectItem value="clinic">{t('userTypes.clinic')}</SelectItem>
                        <SelectItem value="all">{t('userTypes.all')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={currentIsLoading}>
                {currentIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentIsLoading ? t('register:registeringButton') : t('register:registerButton')}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                {t('register:hasAccountPrompt')}{' '}
                <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
                  {t('register:loginLinkText')}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;