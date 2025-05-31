// src/components/clinic/EditPatientInfoDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Patient, PatientFormData } from '@/types/patients';
import type { Subcompany, CompanyRelation } from '@/types/companies';
import { getPatientById, updatePatient } from '@/services/patientService';
import { getSubcompaniesList, getCompanyRelationsList } from '@/services/companyService';
import AddSubcompanyDialog from './AddSubcompanyDialog';
import AddCompanyRelationDialog from './AddCompanyRelationDialog';

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface EditPatientInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  onPatientInfoUpdated: (updatedPatient: Patient) => void;
}

interface TranslateOptions {
  context?: string;
  [key: string]: string | number | undefined;
}

const getEditPatientSchema = (t: (key: string, options?: TranslateOptions) => string, isCompanyPatient: boolean) => z.object({
  name: z.string().min(1, { message: t('clinic:validation.nameRequired') }),
  phone: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other'], { required_error: t('clinic:validation.genderRequired')}),
  age_year: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid year"),
  age_month: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid month"),
  age_day: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), "Invalid day"),
  insurance_no: z.string().optional().nullable()
    .refine(val => !isCompanyPatient || (val && val.trim() !== ''), { 
      message: t('common:validation.requiredWhen', { context: t('patients:fields.company') }) 
    }),
  guarantor: z.string().optional().nullable(),
  subcompany_id: z.string().optional().nullable(),
  company_relation_id: z.string().optional().nullable(),
});

const EditPatientInfoDialog: React.FC<EditPatientInfoDialogProps> = ({
  isOpen, onOpenChange, patientId, onPatientInfoUpdated
}) => {
  const { t } = useTranslation(['patients', 'common', 'clinic']);
  const queryClient = useQueryClient();
  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const { data: patientData, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
    queryKey: ['patientDetailsForEdit', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: isOpen && !!patientId,
  });
  
  const isCompanyPatient = !!patientData?.company_id;
  const editPatientSchema = getEditPatientSchema(t, isCompanyPatient);
  type EditPatientFormValues = z.infer<typeof editPatientSchema>;

  const form = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {},
  });
  const { control, handleSubmit, reset, setValue } = form;

  const currentCompanyId = patientData?.company_id; // Fixed, not editable here

  const { data: subcompanies, isLoading: isLoadingSubcompanies } = useQuery<Subcompany[], Error>({
    queryKey: ['subcompaniesListForEdit', currentCompanyId],
    queryFn: () => currentCompanyId ? getSubcompaniesList(currentCompanyId) : Promise.resolve([]),
    enabled: isOpen && !!currentCompanyId,
  });

  const { data: companyRelations, isLoading: isLoadingRelations } = useQuery<CompanyRelation[], Error>({
    queryKey: ['companyRelationsListForEdit'],
    queryFn: getCompanyRelationsList,
    enabled: isOpen && !!currentCompanyId, // Only if company patient
  });

  useEffect(() => {
    if (isOpen && patientData) {
      reset({
        name: patientData.name || '',
        phone: patientData.phone || '',
        gender: patientData.gender || undefined,
        age_year: patientData.age_year !== null && patientData.age_year !== undefined ? String(patientData.age_year) : '',
        age_month: patientData.age_month !== null && patientData.age_month !== undefined ? String(patientData.age_month) : '',
        age_day: patientData.age_day !== null && patientData.age_day !== undefined ? String(patientData.age_day) : '',
        insurance_no: patientData.insurance_no || '',
        guarantor: patientData.guarantor || '',
        subcompany_id: patientData.subcompany_id ? String(patientData.subcompany_id) : undefined,
        company_relation_id: patientData.company_relation_id ? String(patientData.company_relation_id) : undefined,
      });
    } else if (!isOpen) {
        reset({});
    }
  }, [isOpen, patientData, reset]);

  const updateMutation = useMutation<Patient, ApiError, Partial<PatientFormData>>({
    mutationFn: (data: Partial<PatientFormData>) => updatePatient(patientId, data),
    onSuccess: (updatedPatient) => {
      toast.success(t('patients:details.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForInfoPanel', patientId] }); // Invalidate info dialog query
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForEdit', patientId] }); // Invalidate this dialog's query
      queryClient.invalidateQueries({ queryKey: ['activePatients'] }); // Invalidate active patient lists
      queryClient.invalidateQueries({ queryKey: ['patientVisitsSummary'] }); // Invalidate TodaysPatients list
      onPatientInfoUpdated(updatedPatient);
      onOpenChange(false); // Close dialog
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || t('common:error.updateFailed'));
    },
  });

  const onSubmit = (data: EditPatientFormValues) => {
    const payload: Partial<PatientFormData> = {
      name: data.name,
      phone: data.phone || '',
      gender: data.gender!, // Schema ensures it's valid
      age_year: data.age_year ? parseInt(data.age_year) : null,
      age_month: data.age_month ? parseInt(data.age_month) : null,
      age_day: data.age_day ? parseInt(data.age_day) : null,
    };
    if (isCompanyPatient) {
      payload.insurance_no = data.insurance_no || undefined;
      payload.guarantor = data.guarantor || undefined;
      payload.subcompany_id = data.subcompany_id || undefined;
      payload.company_relation_id = data.company_relation_id || undefined;
    }
    updateMutation.mutate(payload);
  };
  
  const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
    queryClient.invalidateQueries({ queryKey: ['subcompaniesListForEdit', currentCompanyId] }).then(() => {
      setValue('subcompany_id', String(newSubcompany.id), { shouldValidate: true, shouldDirty: true });
    });
    toast.success(t('common:addedToListAndSelected', { item: newSubcompany.name }));
    setShowSubcompanyDialog(false);
  };

  const handleRelationAdded = (newRelation: CompanyRelation) => {
    queryClient.invalidateQueries({ queryKey: ['companyRelationsListForEdit'] }).then(() => {
      setValue('company_relation_id', String(newRelation.id), { shouldValidate: true, shouldDirty: true });
    });
    toast.success(t('common:addedToListAndSelected', { item: newRelation.name }));
    setShowRelationDialog(false);
  };

  if (!isOpen) return null;
  if (isLoadingPatient && !patientData) {
    return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent><div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin"/></div></DialogContent></Dialog>;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('patients:details.editDialogTitle', { name: patientData?.name || 'Patient' })}</DialogTitle>
            <DialogDescription>{t('patients:details.editDialogDescription')}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-180px)] -mx-6 px-6"> {/* Adjust max-height considering header/footer */}
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                {/* Basic Info */}
                <FormField control={control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t('patients:fields.name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>{t('common:phone')}</FormLabel><FormControl><Input type="tel" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="gender" render={({ field }) => (
                    <FormItem><FormLabel>{t('common:gender')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                    <FormField control={control} name="age_year" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageYearsPlaceholder')} {...field} value={field.value || ''} />)} />
                    <FormField control={control} name="age_month" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageMonthsPlaceholder')} {...field} value={field.value || ''} />)} />
                    <FormField control={control} name="age_day" render={({ field }) => (<Input type="number" placeholder={t('clinic:patientRegistration.ageDaysPlaceholder')} {...field} value={field.value || ''} />)} />
                  </div>
                  <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
                </FormItem>

                {/* Insurance Info (only if company_id exists on patientData) */}
                {isCompanyPatient && currentCompanyId && (
                  <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <h3 className="font-medium text-foreground">{t('patients:details.insuranceInfo')}</h3>
                      {patientData?.company?.name && (
                        <span className="text-xs text-muted-foreground">({patientData.company.name})</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <FormField control={control} name="insurance_no" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">{t('patients:fields.insuranceNo')}</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={control} name="guarantor" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">{t('patients:fields.guarantor')}</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={control} name="subcompany_id" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">{t('patients:fields.subCompany')}</FormLabel>
                          <div className="flex items-center gap-1">
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingSubcompanies}>
                              <FormControl><SelectTrigger className="h-8 text-xs flex-grow"><SelectValue placeholder={t('patients:fields.selectSubCompany')} /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value=" ">{t('common:none')}</SelectItem>
                                {subcompanies?.map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowSubcompanyDialog(true)}><PlusCircle className="h-3.5 w-3.5"/></Button>
                          </div><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={control} name="company_relation_id" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">{t('patients:fields.relation')}</FormLabel>
                           <div className="flex items-center gap-1">
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingRelations}>
                              <FormControl><SelectTrigger className="h-8 text-xs flex-grow"><SelectValue placeholder={t('patients:fields.selectRelation')} /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value=" ">{t('common:none')}</SelectItem>
                                {companyRelations?.map(rel => <SelectItem key={rel.id} value={String(rel.id)}>{rel.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowRelationDialog(true)}><PlusCircle className="h-3.5 w-3.5"/></Button>
                          </div><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" disabled={updateMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                    {t('common:saveChanges')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Quick Add Dialogs */}
      {currentCompanyId && (
        <AddSubcompanyDialog
            companyId={currentCompanyId}
            open={showSubcompanyDialog}
            onOpenChange={setShowSubcompanyDialog}
            onSubcompanyAdded={handleSubcompanyAdded}
        />
      )}
      {currentCompanyId && (
        <AddCompanyRelationDialog
            companyId={currentCompanyId}
            open={showRelationDialog}
            onOpenChange={setShowRelationDialog}
            onCompanyRelationAdded={handleRelationAdded}
        />
      )}
    </>
  );
};
export default EditPatientInfoDialog;