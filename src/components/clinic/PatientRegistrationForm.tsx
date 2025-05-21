// src/components/clinic/PatientRegistrationForm.tsx
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // For fetching companies

import  type { Patient, PatientFormData } from '@/types/patients';
import type  { Company } from '@/types/companies'; // Assuming this type exists
import  type { DoctorShift } from '@/types/doctors'; // To receive activeDoctorShift

import { registerNewPatient as apiRegisterNewPatient } from '@/services/patientService'; // Renamed for clarity
import { getCompaniesList } from '@/services/companyService'; // Actual service call

// Zod schema for patient registration
const getPatientRegistrationSchema = (t: any) => z.object({
  name: z.string().min(1, { message: t('clinic:validation.nameRequired') }),
  phone: z.string()
    .min(1, { message: t('clinic:validation.phoneRequired') })
    .max(10, { message: t('clinic:validation.phoneMaxLength', { count: 10 }) }) // Max 10 chars
    .regex(/^[0-9]+$/, { message: t('clinic:validation.phoneNumeric') }), // Only numbers
  gender: z.enum(['male', 'female'], { required_error: t('clinic:validation.genderRequired')}), // 'other' removed
  age_year: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: t('common:validation.mustBeNumber')}),
  age_month: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: t('common:validation.mustBeNumber')}),
  age_day: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: t('common:validation.mustBeNumber')}),
  address: z.string().optional(),
  company_id: z.string().optional(),
  // doctor_id is removed from schema as it's not a direct form input
  // notes is removed
});

type PatientRegistrationFormValues = z.infer<ReturnType<typeof getPatientRegistrationSchema>>;

interface PatientRegistrationFormProps {
  onPatientRegistered: (patient: Patient) => void;
  activeDoctorShift: DoctorShift | null; // Receive the selected doctor's shift
  // This prop tells the form if it's visible, to trigger autofocus
  isVisible?: boolean; 
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ 
  onPatientRegistered, 
  activeDoctorShift,
  isVisible 
}) => {
  const { t } = useTranslation(['clinic', 'common']);
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for autofocus
  console.log(activeDoctorShift,'activeDoctorShift');
  const patientRegistrationSchema = getPatientRegistrationSchema(t);

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      name: '',
      phone: '',
      gender: 'female', // Default to female
      age_year: '',
      age_month: '',
      age_day: '',
      address: '',
      company_id: undefined,
    },
  });
  const { handleSubmit, control, formState: { isSubmitting }, reset, setFocus } = form; // Added setFocus

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListActive'], // Use a distinct key if you only want active companies
    queryFn: () => getCompaniesList({ status: true }), // Assuming getCompaniesList can take filters
  });
  
  // Autofocus on name field when the form becomes visible
  useEffect(() => {
    if (isVisible && nameInputRef.current) {
      // Small timeout to ensure element is truly visible and focusable after layout shifts
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible, nameInputRef]); // setFocus from react-hook-form can also be used: useEffect(() => { if(isVisible) setFocus('name')}, [isVisible, setFocus])


  const registrationMutation = useMutation({
    mutationFn: apiRegisterNewPatient, // Use the imported actual service function
    onSuccess: (newPatient) => {
      toast.success(t('clinic:patientRegistration.registrationSuccess'));
      onPatientRegistered(newPatient);
      reset(); // Reset form
      // Optionally set focus back to name field for next entry
      if (nameInputRef.current) nameInputRef.current.focus(); 
    },
    onError: (error: any) => {
      let errorMessage = t('clinic:patientRegistration.registrationFailed');
       if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
      console.error("Patient registration failed", error.response?.data || error.message);
    },
  });


  const onSubmit = async (data: PatientRegistrationFormValues) => {
    if (!activeDoctorShift || !activeDoctorShift.doctor_id) {
      toast.error(t('clinic:validation.noDoctorSelectedError', "Please select an active doctor from the tabs above."));
      return;
    }

    // Prepare data for the backend, including the doctor_id from activeDoctorShift
    const submissionDataForApi : PatientFormData = { // This should match the backend's expected structure, often closer to Patient model
        name: data.name,
        doctor_id: activeDoctorShift.doctor_id, // Use the doctor_id from the selected shift
        phone: data.phone,
        gender: data.gender,
        age_year: data.age_year ? parseInt(data.age_year) : null,
        age_month: data.age_month ? parseInt(data.age_month) : null,
        age_day: data.age_day ? parseInt(data.age_day) : null,
        // address: data.address || null,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        doctor_shift_id: activeDoctorShift.id, // Key: doctor for the initial visit
        // notes: '', // If backend PatientController still expects notes, send empty or specific default
        // Ensure all other required fields for PatientController@store are included
        // e.g., shift_id might be determined by backend or needs to be passed
    };
    
    registrationMutation.mutate(submissionDataForApi as any); // Cast as any if submissionDataForApi differs from PatientFormData
  };

  const currentIsLoading = isLoadingCompanies || registrationMutation.isPending;

  return (
    // The parent <aside> in ClinicPage.tsx should control the max-width
    // Or, if this component is used elsewhere, you can add max-w-[380px] here or on a wrapper div
    <div className="w-full max-w-[380px] mx-auto"> {/* Max width constraint */}
        <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3"> {/* Reduced space-y for compactness */}
            <FormField
            control={control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('clinic:patientRegistration.nameLabel')}</FormLabel>
                <FormControl>
                    <Input 
                        placeholder={t('clinic:patientRegistration.namePlaceholder')} 
                        {...field} 
                        ref={nameInputRef} // Assign ref
                        disabled={currentIsLoading}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('clinic:patientRegistration.phoneLabel')}</FormLabel>
                <FormControl>
                    <Input 
                        type="tel" 
                        maxLength={10} // Enforce max length on input
                        placeholder={t('clinic:patientRegistration.phonePlaceholder')} 
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
            name="gender"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('clinic:patientRegistration.genderLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={currentIsLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={t('clinic:patientRegistration.selectGender')} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="female">{t('clinic:patientRegistration.female')}</SelectItem>
                    <SelectItem value="male">{t('clinic:patientRegistration.male')}</SelectItem>
                    {/* "other" option removed */}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormItem>
                <FormLabel>{t('clinic:patientRegistration.ageLabel')}</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                    <FormField control={control} name="age_year" render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageYearsPlaceholder')} {...field} disabled={currentIsLoading}/> )}/>
                    <FormField control={control} name="age_month" render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageMonthsPlaceholder')} {...field} disabled={currentIsLoading}/> )}/>
                    <FormField control={control} name="age_day" render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageDaysPlaceholder')} {...field} disabled={currentIsLoading}/> )}/>
                </div>
                <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
            </FormItem>

            <FormField
            control={control}
            name="address"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('clinic:patientRegistration.addressLabel')}</FormLabel>
                <FormControl>
                    <Textarea className="h-20" placeholder={t('clinic:patientRegistration.addressPlaceholder')} {...field} disabled={currentIsLoading}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={control}
            name="company_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('clinic:patientRegistration.companyLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isLoadingCompanies || currentIsLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={t('clinic:patientRegistration.selectCompany')} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value=" ">{t('common:none')}</SelectItem>
                        {isLoadingCompanies ? <SelectItem value="loading_comp" disabled>{t('common:loading')}</SelectItem> :
                        companies?.map(comp => <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            {/* doctor_id and notes fields are removed */}
            <Button type="submit" className="w-full" disabled={currentIsLoading}>
            {registrationMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
            {registrationMutation.isPending ? t('clinic:patientRegistration.registeringButton') : t('clinic:patientRegistration.registerButton')}
            </Button>
        </form>
        </Form>
    </div>
  );
};

export default PatientRegistrationForm;