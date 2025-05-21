// src/pages/SettingsPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod'; // You'll need a Zod schema for settings
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox'; // Might use Checkbox or Switch
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Setting, SettingsFormData } from '@/types/settings';
import { FinanceAccount } from '@/types/finance'; // Assuming type definition
import { getSettings, updateSettings } from '@/services/settingService';
import { getFinanceAccountsList } from '@/services/doctorService'; // Or a dedicated financeService
import { Separator } from '@/components/ui/separator';

// Simplified Zod schema - make it comprehensive based on your needs
const getSettingsSchema = (t: Function) => z.object({
  hospital_name: z.string().optional().nullable(),
  lab_name: z.string().optional().nullable(),
  phone: z.string().min(1, { message: t('common:validation.requiredField')}),
  email: z.string().email({ message: t('common:validation.invalidEmail')}),
  currency: z.string().min(1, { message: t('common:validation.requiredField')}),
  address: z.string().optional().nullable(),
  vatin: z.string().optional().nullable(),
  cr: z.string().optional().nullable(),

  is_logo: z.boolean().default(false),
  logo_file: z.custom<File>().optional().nullable(),
  clear_logo_base64: z.boolean().optional(),
  // Add more fields as needed...
  financial_year_start: z.string().optional().nullable().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: "YYYY-MM-DD" }),
  financial_year_end: z.string().optional().nullable().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: "YYYY-MM-DD" }),
  
  welcome_message: z.string().max(2000).optional().nullable(),
  send_welcome_message: z.boolean().default(false),

  // Ensure all fields from SettingsFormData are here with appropriate validation
  is_header: z.boolean().default(false),
  header_content: z.string().optional().nullable(),
  header_image_file: z.custom<File>().optional().nullable(),
  clear_header_base64: z.boolean().optional(),
  // ... etc. for all settings ...
});
type SettingsFormValues = z.infer<ReturnType<typeof getSettingsSchema>>;


const ImageUploadField: React.FC<{
 field: any; // field from RHF controller
 currentImageUrl?: string | null;
 label: string;
 onClear: () => void;
 disabled?: boolean;
}> = ({ field, currentImageUrl, label, onClear, disabled }) => {
 const { t } = useTranslation('settings');
 const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
     // Update preview if currentImageUrl (from fetched settings) changes and no file is selected
     if (!field.value && currentImageUrl) {
         setPreview(currentImageUrl);
     }
 }, [currentImageUrl, field.value]);

 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
         field.onChange(file);
         const reader = new FileReader();
         reader.onloadend = () => setPreview(reader.result as string);
         reader.readAsDataURL(file);
     } else {
         field.onChange(null);
         setPreview(currentImageUrl || null); // Revert to original if selection is cancelled
     }
 };

 const handleRemoveImage = () => {
     field.onChange(null); // Clear file input value
     setPreview(null);
     onClear(); // This will set the clear_... flag in the form
     if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input visually
 };

 return (
     <FormItem>
         <FormLabel>{label}</FormLabel>
         <div className="flex items-center gap-4">
             <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted overflow-hidden">
                 {preview ? (
                     <img src={preview} alt="Preview" className="object-contain h-full w-full" />
                 ) : (
                     <ImageIcon className="h-10 w-10 text-muted-foreground" />
                 )}
             </div>
             <div className="flex-grow space-y-2">
                 <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                     <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>
                     {preview && !field.value ? t('imageUpload.change') : t('imageUpload.selectImage')}
                 </Button>
                 {preview && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-xs text-destructive" disabled={disabled}>
                         <Trash2 className="ltr:mr-1 rtl:ml-1 h-3 w-3"/> {t('imageUpload.remove')}
                     </Button>
                 )}
                 <FormControl>
                     <Input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         ref={fileInputRef}
                         onChange={handleFileChange} // Use our handler
                         disabled={disabled}
                     />
                 </FormControl>
             </div>
         </div>
         <FormMessage />
     </FormItem>
 );
};


const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const queryClient = useQueryClient();
  const settingsSchema = getSettingsSchema(t);

  const { data: settings, isLoading: isLoadingSettings, isError, error } = useQuery<Setting | null, Error>({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const { data: financeAccounts, isLoading: isLoadingFinanceAccounts } = useQuery<FinanceAccount[], Error>({
     queryKey: ['financeAccountsListForSettings'], // Use a distinct key
     queryFn:  getFinanceAccountsList, // Fetch only active accounts
  });


  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { /* Will be populated by useEffect */ },
  });
  const { control, handleSubmit, reset, setValue, watch } = form;

  useEffect(() => {
    if (settings) {
      const formValues: Partial<SettingsFormValues> = { ...settings };
      // Files are not part of settings response, clear them in form
      formValues.logo_file = null;
      formValues.header_image_file = null;
      formValues.footer_image_file = null;
      formValues.auditor_stamp_file = null;
      formValues.manager_stamp_file = null;
      // Ensure boolean fields are booleans
      formValues.is_logo = !!settings.is_logo;
      // ... cast other booleans ...
      formValues.financial_year_start = settings.financial_year_start || '';
      formValues.financial_year_end = settings.financial_year_end || '';

      reset(formValues as SettingsFormValues);
    } else if (!isLoadingSettings && !isError) {
      // If no settings found and not loading (e.g., first time setup), reset with defaults
      reset({ /* your application's default settings */
         hospital_name: '', lab_name: '', phone: '', email: '', currency: 'ج.س',
         is_logo: false, logo_file: null, clear_logo_base64: false,
         // ... other defaults ...
      });
    }
  }, [settings, reset, isLoadingSettings, isError]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updatedSettings) => {
      toast.success(t('settings:settingsSavedSuccess'));
      queryClient.setQueryData(['settings'], updatedSettings); // Update cache
      // Reset form with new data to clear file inputs and update previews correctly
      const formValues: Partial<SettingsFormValues> = { ...updatedSettings };
      formValues.logo_file = null; // Clear file inputs
      // ... clear other file inputs ...
      reset(formValues as SettingsFormValues);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('settings:settingsSaveError'));
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    // FormData is handled by the service function
    mutation.mutate({...data,address: data.address == null ? '' : data.address });
  };

  if (isLoadingSettings) return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-10 w-10 animate-spin text-primary"/> <p className="ml-2">{t('settings:loadingSettings')}</p></div>;
  if (isError && !settings) return <div className="p-6 text-center text-destructive">{t('settings:errorNoSettings')} <pre className="text-xs">{error?.message}</pre></div>;


  // Helper for finance account selects
 const renderFinanceAccountSelect = (fieldName: keyof SettingsFormValues, labelKey: string) => (
     <FormField
         control={control} name={fieldName as any}
         render={({ field }) => (
         <FormItem>
             <FormLabel>{t(labelKey)}</FormLabel>
             <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""} disabled={isLoadingFinanceAccounts || mutation.isPending}>
                 <FormControl><SelectTrigger><SelectValue placeholder={t('settings:selectAccount')} /></SelectTrigger></FormControl>
                 <SelectContent>
                     <SelectItem value=" ">{t('common:none')}</SelectItem>
                     {isLoadingFinanceAccounts ? <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem> :
                     financeAccounts?.map(acc => <SelectItem key={acc.id} value={String(acc.id)}>{acc.name} ({acc.code})</SelectItem>)}
                 </SelectContent>
             </Select>
             <FormMessage />
         </FormItem>
     )} />
 );


  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('settings:pageTitle')}</h1>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full" dir={i18n.dir()}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
              <TabsTrigger value="general">{t('settings:tabs.general')}</TabsTrigger>
              <TabsTrigger value="print">{t('settings:tabs.print')}</TabsTrigger>
              <TabsTrigger value="financial">{t('settings:tabs.financial')}</TabsTrigger>
              <TabsTrigger value="workflow">{t('settings:tabs.workflow')}</TabsTrigger>
              <TabsTrigger value="whatsapp">{t('settings:tabs.whatsapp')}</TabsTrigger>
              {/* Add more tabs if needed */}
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader><CardTitle>{t('settings:generalSection.title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={control} name="hospital_name" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.hospitalName')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="lab_name" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.labName')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.phone')}</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.email')}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={control} name="address" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.address')}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={3}/></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid md:grid-cols-3 gap-4">
                     <FormField control={control} name="currency" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.currency')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="vatin" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.vatin')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="cr" render={({ field }) => (<FormItem><FormLabel>{t('settings:generalSection.cr')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Print Settings Tab */}
            <TabsContent value="print">
              <Card>
                <CardHeader><CardTitle>{t('settings:printSection.title')}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                 <FormField control={control} name="is_logo" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:printSection.isLogo')}</FormLabel></FormItem>)} />
                 {watch("is_logo") && <Controller control={control} name="logo_file" render={({ field: fileField }) => (
                     <ImageUploadField field={fileField} currentImageUrl={settings?.logo_base64} label={t('settings:printSection.logoFile')} onClear={() => setValue('clear_logo_base64', true)} disabled={mutation.isPending}/>
                 )}/>}
                 <Separator/>
                 {/* Repeat for Header and Footer similar to Logo */}
                 <FormField control={control} name="is_header" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:printSection.isHeader')}</FormLabel></FormItem>)} />
                 {watch("is_header") && <>
                     <FormField control={control} name="header_content" render={({ field }) => (<FormItem><FormLabel>{t('settings:printSection.headerContent')}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={2}/></FormControl></FormItem>)} />
                     <Controller control={control} name="header_image_file" render={({ field: fileField }) => (
                         <ImageUploadField field={fileField} currentImageUrl={settings?.header_base64} label={t('settings:printSection.headerImageFile')} onClear={() => setValue('clear_header_base64', true)} disabled={mutation.isPending}/>
                     )}/>
                 </>}
                  <Separator/>
                 {/* ... Footer ... */}
                  <FormField control={control} name="print_direct" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:printSection.printDirect')}</FormLabel></FormItem>)} />
                  <FormField control={control} name="barcode" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:printSection.barcode')}</FormLabel></FormItem>)} />
                  <FormField control={control} name="show_water_mark" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:printSection.showWaterMark')}</FormLabel></FormItem>)} />
                </CardContent>
              </Card>
              <Card className="mt-6">
                 <CardHeader><CardTitle>{t('settings:stampsSection.title')}</CardTitle></CardHeader>
                 <CardContent className="grid md:grid-cols-2 gap-6">
                     <Controller control={control} name="auditor_stamp_file" render={({ field: fileField }) => (
                         <ImageUploadField field={fileField} currentImageUrl={settings?.auditor_stamp} label={t('settings:stampsSection.auditorStampFile')} onClear={() => setValue('clear_auditor_stamp', true)} disabled={mutation.isPending}/>
                     )}/>
                     <Controller control={control} name="manager_stamp_file" render={({ field: fileField }) => (
                         <ImageUploadField field={fileField} currentImageUrl={settings?.manager_stamp} label={t('settings:stampsSection.managerStampFile')} onClear={() => setValue('clear_manager_stamp', true)} disabled={mutation.isPending}/>
                     )}/>
                 </CardContent>
              </Card>
            </TabsContent>

             {/* Financial Settings Tab */}
             <TabsContent value="financial">
                 <Card>
                     <CardHeader><CardTitle>{t('settings:financialSection.title')}</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                         <div className="grid md:grid-cols-2 gap-4">
                             <FormField control={control} name="financial_year_start" render={({ field }) => (<FormItem><FormLabel>{t('settings:financialSection.financialYearStart')}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={control} name="financial_year_end" render={({ field }) => (<FormItem><FormLabel>{t('settings:financialSection.financialYearEnd')}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                         </div>
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {renderFinanceAccountSelect('finance_account_id' as any, 'settings:financialSection.financeAccountId')}
                             {renderFinanceAccountSelect('bank_id'as any, 'settings:financialSection.bankId')}
                             {renderFinanceAccountSelect('company_account_id'as any, 'settings:financialSection.companyAccountId')}
                             {renderFinanceAccountSelect('endurance_account_id'as any, 'settings:financialSection.enduranceAccountId')}
                             {renderFinanceAccountSelect('main_cash'as any, 'settings:financialSection.mainCash')}
                             {renderFinanceAccountSelect('main_bank'as any, 'settings:financialSection.mainBank')}
                         </div>
                         <h3 className="font-medium pt-2 border-t">{t('settings:pharmacySectionTitle', "Pharmacy Accounts")}</h3>
                          <div className="grid md:grid-cols-3 gap-4">
                             {renderFinanceAccountSelect('pharmacy_cash'as any, 'settings:financialSection.pharmacyCash')}
                             {renderFinanceAccountSelect('pharmacy_bank'as any, 'settings:financialSection.pharmacyBank')}
                             {renderFinanceAccountSelect('pharmacy_income'as any, 'settings:financialSection.pharmacyIncome')}
                         </div>
                     </CardContent>
                 </Card>
             </TabsContent>
             
             {/* Workflow Settings Tab */}
             <TabsContent value="workflow">
                 <Card>
                     <CardHeader><CardTitle>{t('settings:workflowSection.title')}</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                          <FormField control={control} name="inventory_notification_number" render={({ field }) => (<FormItem><FormLabel>{t('settings:workflowSection.inventoryNotificationNumber')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                          <FormField control={control} name="disable_doctor_service_check" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:workflowSection.disableDoctorServiceCheck')}</FormLabel></FormItem>)} />
                          <FormField control={control} name="send_result_after_auth" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:workflowSection.sendResultAfterAuth')}</FormLabel></FormItem>)} />
                          <FormField control={control} name="send_result_after_result" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:workflowSection.sendResultAfterResult')}</FormLabel></FormItem>)} />
                          <FormField control={control} name="edit_result_after_auth" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:workflowSection.editResultAfterAuth')}</FormLabel></FormItem>)} />
                     </CardContent>
                 </Card>
             </TabsContent>

             {/* WhatsApp Settings Tab */}
             <TabsContent value="whatsapp">
                 <Card>
                     <CardHeader><CardTitle>{t('settings:whatsappSection.title')}</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                         <FormField control={control} name="instance_id" render={({ field }) => (<FormItem><FormLabel>{t('settings:whatsappSection.instanceId')}</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                         <FormField control={control} name="token" render={({ field }) => (<FormItem><FormLabel>{t('settings:whatsappSection.token')}</FormLabel><FormControl><Input type="password" {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                         <FormField control={control} name="welcome_message" render={({ field }) => (<FormItem><FormLabel>{t('settings:whatsappSection.welcomeMessage')}</FormLabel><FormControl><Textarea {...field} value={field.value || ""} rows={5} /></FormControl></FormItem>)} />
                         <FormField control={control} name="send_welcome_message" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">{t('settings:whatsappSection.sendWelcomeMessage')}</FormLabel></FormItem>)} />
                     </CardContent>
                 </Card>
             </TabsContent>

          </Tabs>
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
              {t('settings:saveButton')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
export default SettingsPage;