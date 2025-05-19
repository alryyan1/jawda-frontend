// src/components/clinic/PatientRegistrationForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { toast } from "sonner"; // Or your preferred toast mechanism

import type { Doctor } from '@/types/doctors'; // Define this type
import type { Company } from '@/types/companies'; // Define this type
import type { Patient } from '@/types/patiens';
import { useMutation } from '@tanstack/react-query';
import { registerNewPatient } from '@/services/patientService';

// Mock API call placeholders - replace with actual service calls
// import { registerNewPatient } from '@/services/patientService';
// import { getDoctorsList } from '@/services/doctorService';
// import { getCompaniesList } from '@/services/companyService';

// --- MOCK Data & Functions (Remove and replace with actual API calls) ---
const mockDoctors: Doctor[] = [
  { id: 1, name: 'د. أحمد محمد', phone: '', cash_percentage: 0, company_percentage:0, static_wage:0, lab_percentage:0,specialist_id:1, start:0, calc_insurance:false, finance_account_id_insurance:1, created_at: '', updated_at: '' },
  { id: 2, name: 'د. فاطمة علي', phone: '', cash_percentage: 0, company_percentage:0, static_wage:0, lab_percentage:0,specialist_id:1, start:0, calc_insurance:false, finance_account_id_insurance:1, created_at: '', updated_at: '' },
];
const mockCompanies: Company[] = [
  { id: 1, name: 'شركة التأمين المتحدة', lab_endurance:0, service_endurance:0, status:true, lab_roof:0, service_roof:0, phone:'',email:'', created_at:'',updated_at:'' },
  { id: 2, name: 'الشركة الوطنية للتأمين', lab_endurance:0, service_endurance:0, status:true, lab_roof:0, service_roof:0, phone:'',email:'', created_at:'',updated_at:'' },
];
const getDoctorsList = async (): Promise<Doctor[]> => new Promise(resolve => setTimeout(() => resolve(mockDoctors), 500));
const getCompaniesList = async (): Promise<Company[]> => new Promise(resolve => setTimeout(() => resolve(mockCompanies), 500));
const saveData = async (data: any): Promise<Patient> => {
  console.log("Registering patient:", data);
  return new Promise(resolve => setTimeout(() => {
    const newPatient: Patient = { 
        id: Date.now(), 
        ...data, 
        age_day: parseInt(data.age_day) || null,
        age_month: parseInt(data.age_month) || null,
        age_year: parseInt(data.age_year) || null,
        shift_id: 1, user_id: 1, visit_number:1, result_auth:false,auth_date: new Date().toISOString(), /* other required fields */
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        // Defaulting many NOT NULL fields that were in your schema
        present_complains: data.notes || '', history_of_present_illness: '', procedures: '', provisional_diagnosis: '', bp: '', temp: 0, weight: 0, height: 0,
        drug_history: '', family_history: '', rbs: '', care_plan: '', general_examination_notes: '', patient_medical_history: '',
        social_history: '', allergies: '', general: '', skin: '', head: '', eyes: '', ear: '', nose: '', mouth: '', throat: '',
        neck: '', respiratory_system: '', cardio_system: '', git_system: '', genitourinary_system: '', nervous_system: '',
        musculoskeletal_system: '', neuropsychiatric_system: '', endocrine_system: '', peripheral_vascular_system: '',
        referred: '', discount_comment: ''
    };

    registerNewPatient(newPatient);
    
    resolve(newPatient);
  }, 1000));
};
// --- END MOCK ---

// Define the Zod schema for patient registration
const getPatientRegistrationSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('clinic:validation.nameRequired') }),
  phone: z.string().min(1, { message: t('clinic:validation.phoneRequired') }),
  gender: z.enum(['male', 'female', 'other'], { required_error: t('clinic:validation.genderRequired')}),
  age_year: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: "Must be a number"}),
  age_month: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: "Must be a number"}),
  age_day: z.string().optional().refine(val => !val || /^\d+$/.test(val), { message: "Must be a number"}),
  address: z.string().optional(),
  company_id: z.string().optional(), // Storing ID as string from select, convert to number on submit
  doctor_id: z.string({ required_error: t('clinic:validation.doctorRequired')}), // Storing ID as string
  // visit_type: z.string().min(1, "Visit type is required"), // Example
  notes: z.string().optional(),
});

type PatientRegistrationFormValues = z.infer<ReturnType<typeof getPatientRegistrationSchema>>;

interface PatientRegistrationFormProps {
  onPatientRegistered: (patient: Patient) => void;
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ onPatientRegistered }) => {
  const { t } = useTranslation(['clinic', 'common']);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  const patientRegistrationSchema = getPatientRegistrationSchema(t);
  // Example usage of useMutation for registering a patient (not strictly needed with current mock, but for real API)
  const {mutate} = useMutation({
    mutationFn: saveData,
    onSuccess: (newPatient) => {
      toast.success(t('clinic:patientRegistration.registrationSuccess'));
      onPatientRegistered(newPatient);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('clinic:patientRegistration.registrationFailed'));
    }
  });
  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      name: '',
      phone: '',
      gender: undefined, // Important for Select placeholder
      age_year: '',
      age_month: '',
      age_day: '',
      address: '',
      company_id: undefined,
      doctor_id: undefined,
      notes: '',
    },
  });
  const { handleSubmit, control, formState: { isSubmitting }, reset } = form;

  useEffect(() => {
    const fetchLists = async () => {
      setIsLoadingLists(true);
      try {
        const [docs, comps] = await Promise.all([
          getDoctorsList(),
          getCompaniesList()
        ]);
        setDoctors(docs);
        setCompanies(comps);
      } catch (error) {
        console.error("Failed to load lists for form", error);
        toast.error(t('common:error.loadListsFailed', "Failed to load doctors/companies."));
      } finally {
        setIsLoadingLists(false);
      }
    };
    fetchLists();
  }, [t]);

  const onSubmit = async (data: PatientRegistrationFormValues) => {
    const submissionData = {
        ...data,
        company_id: data.company_id ? parseInt(data.company_id) : null,
        doctor_id: parseInt(data.doctor_id),
        age_year: data.age_year ? parseInt(data.age_year) : null,
        age_month: data.age_month ? parseInt(data.age_month) : null,
        age_day: data.age_day ? parseInt(data.age_day) : null,
    };
    try {
      mutate(submissionData);
      toast.success(t('clinic:patientRegistration.registrationSuccess'));
      onPatientRegistered(newPatient);
      reset(); // Reset form after successful submission
    } catch (error: any) {
      console.error("Registration failed", error);
      toast.error(error.response?.data?.message || t('clinic:patientRegistration.registrationFailed'));
    }
  };

  if (isLoadingLists) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clinic:patientRegistration.nameLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('clinic:patientRegistration.namePlaceholder')} {...field} />
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
                <Input type="tel" placeholder={t('clinic:patientRegistration.phonePlaceholder')} {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('clinic:patientRegistration.selectGender')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{t('clinic:patientRegistration.male')}</SelectItem>
                  <SelectItem value="female">{t('clinic:patientRegistration.female')}</SelectItem>
                  <SelectItem value="other">{t('clinic:patientRegistration.other')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
            <FormLabel>{t('clinic:patientRegistration.ageLabel')}</FormLabel>
            <div className="grid grid-cols-3 gap-2">
                <FormField
                    control={control} name="age_year"
                    render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageYearsPlaceholder')} {...field} /> )}
                />
                <FormField
                    control={control} name="age_month"
                    render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageMonthsPlaceholder')} {...field} /> )}
                />
                <FormField
                    control={control} name="age_day"
                    render={({ field }) => ( <Input type="number" placeholder={t('clinic:patientRegistration.ageDaysPlaceholder')} {...field} /> )}
                />
            </div>
            {/* Combined error message for age fields or individual ones if needed */}
            <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
        </FormItem>

        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clinic:patientRegistration.addressLabel')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('clinic:patientRegistration.addressPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="doctor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clinic:patientRegistration.doctorLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('clinic:patientRegistration.selectDoctor')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {doctors.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('clinic:patientRegistration.selectCompany')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companies.map(comp => <SelectItem key={comp.id} value={String(comp.id)}>{comp.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clinic:patientRegistration.notesLabel')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('clinic:patientRegistration.notesPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingLists}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? t('clinic:patientRegistration.registeringButton') : t('clinic:patientRegistration.registerButton')}
        </Button>
      </form>
    </Form>
  );
};

export default PatientRegistrationForm;