// src/components/clinic/PatientRegistrationForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardDescription } from "@/components/ui/card";
import { DateTimePicker } from '../datetime-picker';
import { storeVisitFromHistory as apiStoreVisitFromHistory } from '@/services/patientService';

import type { TFunction } from 'i18next';
import type { Patient, PatientSearchResult } from '@/types/patients';
import type { Company, CompanyRelation, Subcompany } from '@/types/companies';
import type { DoctorShift } from '@/types/doctors';

import { registerNewPatient as apiRegisterNewPatient, searchExistingPatients } from '@/services/patientService';
import { getCompaniesList, getSubcompaniesList, getCompanyRelationsList } from '@/services/companyService';
import AddSubcompanyDialog from './AddSubcompanyDialog';
import AddCompanyRelationDialog from '../clinic/AddCompanyRelationDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import PatientSearchResultDisplay from './PatientSearchResultDisplay';
import { Calendar } from '../ui/calendar';
import type { AxiosError } from 'axios';

// Update Zod schema to include new company-related fields, make them optional
const getPatientRegistrationSchema = (t: TFunction, isCompanySelected: boolean = false) => z.object({
  name: z.string().min(1, { message: t('clinic:validation.nameRequired') }),
  phone: z.string(),
  gender: z.enum(['male', 'female'], { required_error: t('clinic:validation.genderRequired')}),
  age_year: z.string().optional().nullable(),
  age_month: z.string().optional().nullable(),
  age_day: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
  insurance_no: z.string().optional().nullable()
    .refine(val => !isCompanySelected || (val && val.trim() !== ''), { 
      message: t('common:validation.requiredWhen', { context: t('patients:fields.company') }) 
    }),
  guarantor: z.string().optional().nullable(),
  subcompany_id: z.string().optional().nullable(),
  company_relation_id: z.string().optional().nullable(),

});

type PatientRegistrationFormValues = z.infer<ReturnType<typeof getPatientRegistrationSchema>>;

interface PatientRegistrationFormProps {
  onPatientRegistered: (patient: Patient) => void;
  activeDoctorShift: DoctorShift | null;
  isVisible?: boolean;
}

// Type for mutation error handling
type ApiErrorResponse = {
  response?: {
    data?: {
      errors?: Record<string, string[]>;
      message?: string;
    };
  };
};

interface SelectFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  name: string;
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ 
  onPatientRegistered, 
  activeDoctorShift,
  isVisible 
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common', 'patients']);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const [isCompanySelected, setIsCompanySelected] = useState(false);
  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const patientRegistrationSchema = getPatientRegistrationSchema(t, isCompanySelected);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms debounce
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchAnchor, setSearchAnchor] = useState<HTMLInputElement | null>(null);

  // Query for live search results
  const { data: searchResults, isLoading: isLoadingSearchResults } = useQuery<PatientSearchResult[], Error>({
    queryKey: ['patientSearchExisting', debouncedSearchQuery],
    queryFn: () => debouncedSearchQuery.length >= 2 ? searchExistingPatients(debouncedSearchQuery) : Promise.resolve([]),
    enabled: debouncedSearchQuery.length >= 2 && showSearchResults, // Only search when popover should be open and query is long enough
  });

  // Mutation for creating a new visit from history
  const createVisitFromHistoryMutation = useMutation({
     mutationFn: (payload: {patientId: number; data: Parameters<typeof apiStoreVisitFromHistory>[1]}) => 
         apiStoreVisitFromHistory(payload.patientId, payload.data),
     onSuccess: (newDoctorVisit) => {
         toast.success(t('patients:search.visitCreatedSuccess', {patientName: newDoctorVisit.patient?.name}));
         // This visit is now active, parent (ClinicPage) needs to know to update ActivePatientsList
         // For now, we can just tell PatientRegistrationForm's parent that "a patient was processed"
         // A more robust way would be for onPatientRegistered to also accept a DoctorVisit object.
         onPatientRegistered(newDoctorVisit.patient as Patient); // Assuming backend returns populated patient
         reset(); // Reset the main registration form
         setShowSearchResults(false);
         setSearchQuery('');
     },
     onError: (error: any) => { /* ... toast error ... */ }
  });


  // Handle input change for name/phone to trigger search
  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValue(name as keyof PatientRegistrationFormValues, value, { shouldValidate: true });
    setSearchQuery(value);
    if (value.length >= 2) {
      setShowSearchResults(true);
      setSearchAnchor(event.currentTarget);
    } else {
      setShowSearchResults(false);
    }
  };
  
  // When a patient is selected from the search results popover
  const handleSelectPatientFromSearch = (
     patientId: number, 
     previousVisitId?: number | null
   ) => {
     if (!activeDoctorShift?.doctor_id) {
         toast.error(t('clinic:validation.noDoctorSelectedError'));
         return;
     }
     setShowSearchResults(false);
     createVisitFromHistoryMutation.mutate({
         patientId,
         data: {
             previous_visit_id: previousVisitId,
             doctor_id: activeDoctorShift.doctor_id,
             active_doctor_shift_id: activeDoctorShift.id,
             reason_for_visit: t('common:followUpVisit'),
         }
     }, {
         onError: (error: unknown) => {
             const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
             let errorMessage = t('clinic:errors.visitCreationFailed');
             
             if (apiError.response?.data?.message) {
                 errorMessage = apiError.response.data.message;
             } else if (apiError.response?.data?.errors) {
                 const errors = Object.values(apiError.response.data.errors).flat().join(', ');
                 errorMessage = `${errorMessage}: ${errors}`;
             }
             
             toast.error(errorMessage);
             console.error('Failed to create visit:', error);
         }
     });
  };

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      name: '',
      phone: '',
      gender: 'female',
      age_year: '',
      age_month: '',
      age_day: '',
      address: '',
      company_id: '',
      insurance_no: '',
      guarantor: '',
      subcompany_id: '',
      company_relation_id: '',
    },
  });

  const { handleSubmit, control, formState: { isSubmitting: formSubmitting,errors }, reset, watch, setValue } = form;
  const companyId = watch('company_id');

  console.log(errors);
  // Update isCompanySelected when company_id changes
  useEffect(() => {
    setIsCompanySelected(!!companyId && companyId !== '');
  }, [companyId]);

  // Autofocus on name field when the form becomes visible
  useEffect(() => {
    if (isVisible && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companiesListActive'],
    queryFn: () => getCompaniesList({ status: true }),
  });

  // Fetch subcompanies when a company is selected
  const { data: subcompanies, isLoading: isLoadingSubcompanies } = useQuery<Subcompany[], Error>({
    queryKey: ['subcompaniesList', companyId],
    queryFn: () => companyId ? getSubcompaniesList(Number(companyId)) : Promise.resolve([]),
    enabled: !!companyId,
  });

  // Fetch company relations
  const { data: companyRelations, isLoading: isLoadingRelations } = useQuery<CompanyRelation[], Error>({
    queryKey: ['companyRelationsList'],
    queryFn: getCompanyRelationsList,
  });

  const registrationMutation = useMutation({
    mutationFn: (data: PatientRegistrationFormValues) => {
      if (!activeDoctorShift?.doctor_id) throw new Error("No active doctor shift");
      
      const submissionData = {
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        age_year: data.age_year ? parseInt(data.age_year) : undefined,
        age_month: data.age_month ? parseInt(data.age_month) : undefined,
        age_day: data.age_day ? parseInt(data.age_day) : undefined,
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        doctor_id: activeDoctorShift.doctor_id,
        doctor_shift_id: activeDoctorShift.id,
        insurance_no: companyId ? data.insurance_no || undefined : undefined,
        guarantor: companyId ? data.guarantor || undefined : undefined,
        subcompany_id: companyId && data.subcompany_id ? parseInt(data.subcompany_id) : undefined,
        company_relation_id: companyId && data.company_relation_id ? parseInt(data.company_relation_id) : undefined,
        // expire_date: data.expire_date instanceof Date ? data.expire_date : undefined,
      };
      
      return apiRegisterNewPatient(submissionData);
    },
    onSuccess: (newPatient) => {
      toast.success(t('clinic:patientRegistration.registrationSuccess'));
      onPatientRegistered(newPatient);
      reset();
      if (nameInputRef.current) nameInputRef.current.focus();
    },
    onError: (error: AxiosError) => {
      let errorMessage = t('clinic:patientRegistration.registrationFailed');
      const apiError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string; } } };
      if (apiError.response?.data?.errors) {
        const fieldErrors = Object.values(apiError.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }
      toast.error(errorMessage);
      console.error("Patient registration failed", error);
    },
  });

  const currentIsLoading = isLoadingCompanies || registrationMutation.isPending || formSubmitting;

  const onSubmit = handleSubmit((data) => {
    if (!activeDoctorShift?.doctor_id) {
      toast.error(t('clinic:errors.noActiveShift'));
      return;
    }
    registrationMutation.mutate(data);
  });

  // Update the subcompany select content
  const renderSubcompanySelect = (field: SelectFieldProps) => (
    <div className="flex items-center gap-1">
      <Select
        onValueChange={field.onChange}
        value={field.value || ''}
        dir={i18n.dir()}
        disabled={currentIsLoading || isLoadingSubcompanies}
      >
        <FormControl>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('patients:fields.selectSubCompany')} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value=" ">{t('common:none')}</SelectItem>
          {subcompanies?.map(sub => (
            <SelectItem key={sub.id} value={String(sub.id)}>
              {sub.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setShowSubcompanyDialog(true)}
      >
        <PlusCircle className="h-3.5 w-3.5"/>
      </Button>
    </div>
  );

  // Update the relations select content
  const renderRelationsSelect = (field: SelectFieldProps) => (
    <div className="flex items-center gap-1">
      <Select
        onValueChange={field.onChange}
        value={field.value || ''}
        disabled={currentIsLoading || isLoadingRelations}
      >
        <FormControl>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('patients:fields.selectRelation')} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value=" ">{t('common:none')}</SelectItem>
          {companyRelations?.map(relation => (
            <SelectItem key={relation.id} value={String(relation.id)}>
              {relation.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setShowRelationDialog(true)}
      >
        <PlusCircle className="h-3.5 w-3.5"/>
      </Button>
    </div>
  );

  const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
    queryClient.invalidateQueries({ queryKey: ['subcompaniesList', companyId] });
    setValue('subcompany_id', String(newSubcompany.id), { shouldValidate: true, shouldDirty: true });
    toast.info(t('common:addedToListAndSelected', { item: newSubcompany.name }));
    setShowSubcompanyDialog(false);
  };

  const handleRelationAdded = (newRelation: CompanyRelation) => {
    queryClient.invalidateQueries({ queryKey: ['companyRelationsList'] });
    setValue('company_relation_id', String(newRelation.id), { shouldValidate: true, shouldDirty: true });
    toast.info(t('common:addedToListAndSelected', { item: newRelation.name }));
    setShowRelationDialog(false);
  };

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Phone Number Field - NOW FIRST */}
          <Popover open={showSearchResults && searchAnchor === phoneInputRef.current} defaultOpen={true}  onOpenChange={setShowSearchResults}>
            <PopoverAnchor asChild>
              <FormField control={control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clinic:patientRegistration.phoneLabel')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" maxLength={10}
                      placeholder={t('clinic:patientRegistration.phonePlaceholder')} 
                      {...field}
                      ref={phoneInputRef}
                      onChange={handleSearchInputChange}
                      onFocus={(e) => { if(e.target.value.length >= 2) setSearchAnchor(e.currentTarget); setShowSearchResults(e.target.value.length >= 2); }}
                      disabled={currentIsLoading || createVisitFromHistoryMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </PopoverAnchor>
            <PopoverContent sticky='always'
              className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl max-h-[0vh] " 
              // side="bottom"
              // align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <PatientSearchResultDisplay 
                results={searchResults || []} 
                onSelectPatientVisit={handleSelectPatientFromSearch}
                isLoading={isLoadingSearchResults}
              />
            </PopoverContent>
          </Popover>

          {/* Name Field - NOW SECOND */}
          <Popover open={showSearchResults && searchAnchor === nameInputRef.current}  onOpenChange={setShowSearchResults}>
             <PopoverAnchor asChild>
                 <FormField control={control} name="name" render={({ field }) => (
                     <FormItem>
                     <FormLabel>{t('clinic:patientRegistration.nameLabel')}</FormLabel>
                     <FormControl>
                         <Input 
                             placeholder={t('clinic:patientRegistration.namePlaceholder')} 
                             {...field} 
                             ref={nameInputRef} // Assign ref for autofocus & popover anchor
                             onChange={handleSearchInputChange} // Use custom handler
                             onFocus={(e) => { if(e.target.value.length >= 2) setSearchAnchor(e.currentTarget); setShowSearchResults(e.target.value.length >= 2); }}
                             // onBlur={() => setTimeout(() => setShowSearchResults(false), 150)} // Delay hide to allow click in popover
                             disabled={currentIsLoading || createVisitFromHistoryMutation.isPending}
                         />
                     </FormControl><FormMessage />
                     </FormItem>
                 )} />
             </PopoverAnchor>
             <PopoverContent sticky='always'
              className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl max-h-[0vh] " 
              // side="bottom"
              // align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <PatientSearchResultDisplay 
                results={searchResults || []} 
                onSelectPatientVisit={handleSelectPatientFromSearch}
                isLoading={isLoadingSearchResults}
              />
            </PopoverContent>
          </Popover>
       
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
                control={control}
                name="age_year"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder={t('clinic:patientRegistration.ageYearsPlaceholder')}
                    {...field}
                    value={field.value || ''}
                    disabled={currentIsLoading}
                  />
                )}
              />
              <FormField
                control={control}
                name="age_month"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder={t('clinic:patientRegistration.ageMonthsPlaceholder')}
                    {...field}
                    value={field.value || ''}
                    disabled={currentIsLoading}
                  />
                )}
              />
              <FormField
                control={control}
                name="age_day"
                render={({ field }) => (
                  <Input
                    type="number"
                    placeholder={t('clinic:patientRegistration.ageDaysPlaceholder')}
                    {...field}
                    value={field.value || ''}
                    disabled={currentIsLoading}
                  />
                )}
              />
            </div>
            <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
          </FormItem>

          {/* <FormField
            control={control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clinic:patientRegistration.addressLabel')}</FormLabel>
                <FormControl>
                  <Textarea className="h-20" placeholder={t('clinic:patientRegistration.addressPlaceholder')} {...field} value={field.value || ''} disabled={currentIsLoading}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <FormField
            control={control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clinic:patientRegistration.companyLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingCompanies || currentIsLoading}>
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
          {companyId && companyId !== '' && (
            <Card className="p-3 pt-2 mt-4 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10">
              <CardDescription className="text-xs mb-2 text-primary font-medium">{t('patients:insuranceDetailsSectionTitle')}</CardDescription>
              <div className="space-y-3">
                <FormField control={control} name="insurance_no" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">{t('patients:fields.insuranceNo')}</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-8 text-xs" disabled={currentIsLoading}/></FormControl><FormMessage className="text-xs"/></FormItem>
                )} />
                <FormField control={control} name="guarantor" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">{t('patients:fields.guarantor')}</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-8 text-xs" disabled={currentIsLoading}/></FormControl><FormMessage className="text-xs"/></FormItem>
                )} />
                
                <FormField control={control} name="subcompany_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('patients:fields.subCompany')}</FormLabel>
                    {renderSubcompanySelect(field)}
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} />
                <FormField control={control} name="company_relation_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('patients:fields.relation')}</FormLabel>
                    {renderRelationsSelect(field)}
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} />
          {/* <DateTimePicker
                      date={field.value instanceof Date ? field.value : undefined}
                      onDateChange={field.onChange}
                      disabled={currentIsLoading}
                    /> */}
                {/* <FormField control={control} name="expire_date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs mb-1">{t('patients:fields.expiryDate')}</FormLabel>
          
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={currentIsLoading}
                    />
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} /> */}
              </div>
            </Card>
          )}
          <Button type="submit" className="w-full" disabled={currentIsLoading}>
            {registrationMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
            {registrationMutation.isPending ? t('clinic:patientRegistration.registeringButton') : t('clinic:patientRegistration.registerButton')}
          </Button>
        </form>
      </Form>

      {companyId && (
        <AddSubcompanyDialog
          companyId={Number(companyId)}
          open={showSubcompanyDialog}
          onOpenChange={setShowSubcompanyDialog}
          onSubcompanyAdded={handleSubcompanyAdded}
        />
      )}

      <AddCompanyRelationDialog
        open={showRelationDialog}
        onOpenChange={setShowRelationDialog}
        onCompanyRelationAdded={handleRelationAdded}
        companyId={Number(companyId)}
      />
    </div>
  );
};

export default PatientRegistrationForm;