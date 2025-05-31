// src/components/audit/AuditedPatientInfoForm.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ar as arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AuditedPatientRecord } from '@/types/auditing';
import type { UpdatePatientApiPayload } from '@/types/patients';
import type { DoctorStripped } from '@/types/doctors';
import type { Subcompany, CompanyRelation } from '@/types/companies';

import { getDoctorsList } from '@/services/doctorService';
import { getSubcompaniesList, getCompanyRelationsList } from '@/services/companyService';

interface AuditedPatientInfoFormProps {
  auditRecord: AuditedPatientRecord;
  onSave: (data: Partial<UpdatePatientApiPayload>) => Promise<AuditedPatientRecord | void>;
  disabled?: boolean;
}

const getAuditedPatientInfoSchema = (t: (key: string, options?: Record<string, unknown>) => string, isCompanyPatient: boolean) => z.object({
  edited_patient_name: z.string().min(1, { message: t('common:validation.required', { field: t('patients:fields.name')}) }),
  edited_phone: z.string().optional().nullable(),
  edited_gender: z.enum(['male', 'female', 'other'], { required_error: t('clinic:validation.genderRequired')}).optional().nullable(),
  edited_age_year: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid year"),
  edited_age_month: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid month"),
  edited_age_day: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid day"),
  edited_address: z.string().optional().nullable(),
  edited_doctor_id: z.string().optional().nullable(),
  
  edited_insurance_no: z.string().optional().nullable()
    .refine(val => !isCompanyPatient || (val && val.trim() !== ''), { 
        message: t('common:validation.requiredWhen', { context: t('patients:fields.company') }) 
    }),
  edited_expire_date: z.string().optional().nullable(),
  edited_guarantor: z.string().optional().nullable(),
  edited_subcompany_id: z.string().optional().nullable(),
  edited_company_relation_id: z.string().optional().nullable(),
});

type AuditedPatientInfoFormValues = z.infer<ReturnType<typeof getAuditedPatientInfoSchema>>;

const AuditedPatientInfoForm: React.FC<AuditedPatientInfoFormProps> = ({
  auditRecord, onSave, disabled
}) => {
  const { t, i18n } = useTranslation(['audit', 'patients', 'common']);

  const isCompanyPatient = !!auditRecord.patient?.company_id;
  const originalCompanyId = auditRecord.patient?.company_id;

  const auditedPatientInfoSchema = getAuditedPatientInfoSchema(t, isCompanyPatient);
  
  const form = useForm<AuditedPatientInfoFormValues>({
    resolver: zodResolver(auditedPatientInfoSchema),
    defaultValues: {},
  });
  const { control, handleSubmit, reset, formState: { isDirty, isSubmitting: localFormSubmitting } } = form;

  // Fetch lookups for dropdowns
  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsListForAudit'],
    queryFn: () => getDoctorsList(),
    enabled: !disabled,
  });
  const { data: subcompanies = [], isLoading: isLoadingSubcompanies } = useQuery<Subcompany[], Error>({
    queryKey: ['subcompaniesListForAudit', originalCompanyId],
    queryFn: () => originalCompanyId ? getSubcompaniesList(originalCompanyId) : Promise.resolve([]),
    enabled: !disabled && !!originalCompanyId,
  });
  const { data: companyRelations = [], isLoading: isLoadingRelations } = useQuery<CompanyRelation[], Error>({
    queryKey: ['companyRelationsListForAudit'],
    queryFn: getCompanyRelationsList,
    enabled: !disabled && !!originalCompanyId,
  });

  useEffect(() => {
    if (auditRecord) {
      reset({
        edited_patient_name: auditRecord.edited_patient_name || auditRecord.patient?.name || '',
        edited_phone: auditRecord.edited_phone || auditRecord.patient?.phone || '',
        edited_gender: auditRecord.edited_gender || auditRecord.patient?.gender || undefined,
        edited_age_year: auditRecord.edited_age_year !== null && auditRecord.edited_age_year !== undefined ? String(auditRecord.edited_age_year) : (auditRecord.patient?.age_year !== null && auditRecord.patient?.age_year !== undefined ? String(auditRecord.patient.age_year) : ''),
        edited_age_month: auditRecord.edited_age_month !== null && auditRecord.edited_age_month !== undefined ? String(auditRecord.edited_age_month) : (auditRecord.patient?.age_month !== null && auditRecord.patient?.age_month !== undefined ? String(auditRecord.patient.age_month) : ''),
        edited_age_day: auditRecord.edited_age_day !== null && auditRecord.edited_age_day !== undefined ? String(auditRecord.edited_age_day) : (auditRecord.patient?.age_day !== null && auditRecord.patient?.age_day !== undefined ? String(auditRecord.patient.age_day) : ''),
        edited_address: auditRecord.edited_address || auditRecord.patient?.address || '',
        edited_doctor_id: auditRecord.edited_doctor_id ? String(auditRecord.edited_doctor_id) : (auditRecord.doctorVisit?.doctor?.id ? String(auditRecord.doctorVisit.doctor.id) : undefined),
        edited_insurance_no: auditRecord.edited_insurance_no || auditRecord.patient?.insurance_no || '',
        edited_expire_date: auditRecord.edited_expire_date || auditRecord.patient?.expire_date || undefined,
        edited_guarantor: auditRecord.edited_guarantor || auditRecord.patient?.guarantor || '',
        edited_subcompany_id: auditRecord.edited_subcompany_id ? String(auditRecord.edited_subcompany_id) : (auditRecord.patient?.subcompany_id ? String(auditRecord.patient.subcompany_id) : undefined),
        edited_company_relation_id: auditRecord.edited_company_relation_id ? String(auditRecord.edited_company_relation_id) : (auditRecord.patient?.company_relation_id ? String(auditRecord.patient.company_relation_id) : undefined),
      });
    }
  }, [auditRecord, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<UpdatePatientApiPayload>) => onSave(data),
    onSuccess: () => {
      form.reset({}, { keepValues: true });
    },
  });
  
  const processSubmit = (data: AuditedPatientInfoFormValues) => {
    const payload = {
        edited_patient_name: data.edited_patient_name,
        edited_phone: data.edited_phone || undefined,
        edited_gender: data.edited_gender || undefined,
        edited_age_year: data.edited_age_year ? parseInt(data.edited_age_year) : null,
        edited_age_month: data.edited_age_month ? parseInt(data.edited_age_month) : null,
        edited_age_day: data.edited_age_day ? parseInt(data.edited_age_day) : null,
        edited_address: data.edited_address || null,
        edited_doctor_id: data.edited_doctor_id ? parseInt(data.edited_doctor_id) : null,
        edited_insurance_no: isCompanyPatient ? data.edited_insurance_no || null : undefined,
        edited_expire_date: isCompanyPatient ? data.edited_expire_date || null : undefined,
        edited_guarantor: isCompanyPatient ? data.edited_guarantor || null : undefined,
        edited_subcompany_id: isCompanyPatient ? (data.edited_subcompany_id ? parseInt(data.edited_subcompany_id) : null) : undefined,
        edited_company_relation_id: isCompanyPatient ? (data.edited_company_relation_id ? parseInt(data.edited_company_relation_id) : null) : undefined,
    } as Partial<UpdatePatientApiPayload>;
    mutation.mutate(payload);
  };
  
  const formDisabled = disabled || mutation.isPending || localFormSubmitting || isLoadingDoctors || isLoadingSubcompanies || isLoadingRelations;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('audit:patientInfo.title')}</CardTitle>
        <CardDescription>{t('audit:patientInfo.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
            {/* Name, Phone, Gender, Age, Address */}
            <FormField control={control} name="edited_patient_name" render={({ field }) => (
              <FormItem><FormLabel>{t('patients:fields.name')}</FormLabel><FormControl><Input {...field} disabled={formDisabled}/></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={control} name="edited_phone" render={({ field }) => (
                    <FormItem><FormLabel>{t('common:phone')}</FormLabel><FormControl><Input type="tel" {...field} value={field.value || ''} disabled={formDisabled}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="edited_gender" render={({ field }) => (
                    <FormItem><FormLabel>{t('common:gender')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined} disabled={formDisabled}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('clinic:patientRegistration.selectGender')} /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="female">{t('clinic:patientRegistration.female')}</SelectItem>
                        <SelectItem value="male">{t('clinic:patientRegistration.male')}</SelectItem>
                        <SelectItem value="other">{t('common:genderEnum.other')}</SelectItem>
                        </SelectContent>
                    </Select><FormMessage />
                    </FormItem>
                )} />
            </div>
            <FormItem><FormLabel>{t('common:age')}</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                <FormField control={control} name="edited_age_year" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageYearsPlaceholder')} {...field} value={field.value || ''} disabled={formDisabled}/>)} />
                <FormField control={control} name="edited_age_month" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageMonthsPlaceholder')} {...field} value={field.value || ''} disabled={formDisabled}/>)} />
                <FormField control={control} name="edited_age_day" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageDaysPlaceholder')} {...field} value={field.value || ''} disabled={formDisabled}/>)} />
                </div>
                <FormMessage>{form.formState.errors.edited_age_year?.message || form.formState.errors.edited_age_month?.message || form.formState.errors.edited_age_day?.message}</FormMessage>
            </FormItem>
            <FormField control={control} name="edited_address" render={({ field }) => (
                <FormItem><FormLabel>{t('patients:fields.address')}</FormLabel><FormControl><Textarea {...field} value={field.value || ''} placeholder={t('patients:fields.addressPlaceholder')} rows={2} disabled={formDisabled}/></FormControl><FormMessage /></FormItem>
            )} />

            {/* Audited Doctor for this Claim/Visit */}
            <FormField control={control} name="edited_doctor_id" render={({ field }) => (
                <FormItem><FormLabel>{t('audit:patientInfo.auditedDoctor')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined} disabled={formDisabled || isLoadingDoctors}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('audit:patientInfo.selectAuditedDoctor')} /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value=" ">{t('common:none')}</SelectItem>
                        {doctorsList?.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>)}
                    </SelectContent>
                </Select><FormMessage />
                </FormItem>
            )} />

            {/* Insurance Details (conditionally shown) */}
            {isCompanyPatient && (
              <Card className="p-3 mt-3 border-dashed">
                <FormLabel className="text-sm font-medium">{t('patients:details.insuranceInfo')} ({auditRecord.patient?.company?.name})</FormLabel>
                <div className="space-y-3 pt-2">
                  <FormField control={control} name="edited_insurance_no" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">{t('patients:fields.insuranceNo')}</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={formDisabled}/></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="edited_expire_date" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel className="text-xs">{t('patients:fields.expiryDate')}</FormLabel>
                      <Popover><PopoverTrigger asChild>
                          <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")} disabled={formDisabled}>
                              {field.value ? format(parseISO(field.value), "PPP", {locale: i18n.language.startsWith('ar') ? arSA : enUS}) : <span>{t('common:pickDate')}</span>}
                              <CalendarIcon className="ltr:ml-auto rtl:mr-auto h-4 w-4 opacity-50" />
                          </Button></FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)} initialFocus disabled={(date) => date < new Date("1900-01-01")} />
                      </PopoverContent></Popover><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="edited_guarantor" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">{t('patients:fields.guarantor')}</FormLabel><FormControl><Input {...field} value={field.value || ''} disabled={formDisabled}/></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="edited_subcompany_id" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">{t('patients:fields.subCompany')}</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value || ''} disabled={formDisabled || isLoadingSubcompanies}>
                          <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('patients:fields.selectSubCompany')} /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value=" ">{t('common:none')}</SelectItem>
                            {subcompanies?.map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>)}
                          </SelectContent>
                       </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="edited_company_relation_id" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">{t('patients:fields.relation')}</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value || ''} disabled={formDisabled || isLoadingRelations}>
                          <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('patients:fields.selectRelation')} /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value=" ">{t('common:none')}</SelectItem>
                            {companyRelations?.map(rel => <SelectItem key={rel.id} value={String(rel.id)}>{rel.name}</SelectItem>)}
                          </SelectContent>
                       </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
              </Card>
            )}
            
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={formDisabled || !isDirty}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('audit:patientInfo.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
export default AuditedPatientInfoForm;