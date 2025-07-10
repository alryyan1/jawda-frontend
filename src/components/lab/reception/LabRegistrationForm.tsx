import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import type { TFunction } from "i18next";

// MUI Imports for Autocomplete
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";

// Shadcn UI & Custom Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, PlusCircle } from "lucide-react";
import AddSubcompanyDialog from "@/components/clinic/AddSubcompanyDialog";
import AddCompanyRelationDialog from "@/components/clinic/AddCompanyRelationDialog";

// Services & Types
import { registerNewPatientFromLab } from "@/services/patientService";
import {
  getCompaniesList,
  getSubcompaniesList,
  getCompanyRelationsList,
} from "@/services/companyService";
import { getDoctorsList } from "@/services/doctorService";
import type { Patient } from "@/types/patients";
import type { DoctorVisit } from "@/types/visits";
import type { DoctorStripped } from "@/types/doctors";
import type { Company, Subcompany, CompanyRelation } from "@/types/companies";
import i18n from "@/i18n";



// Zod Schema Definition
const getLabRegistrationSchema = (t: TFunction, isCompanySelected: boolean) =>
  z.object({
    phone: z.string().optional().nullable(),
    name: z.string().min(1, { message: t("clinic:validation.nameRequired") }),
    doctor: z.custom<DoctorStripped | null>((val) => val !== null, {
      message: t("labReception:validation.doctorRequired"),
    }),
    gender: z.enum(["male", "female"], {
      required_error: t("clinic:validation.genderRequired"),
    }),
    age_year: z.string().optional().nullable().refine((val) => !val || /^\d+$/.test(val), t("common:validation.invalidNumber")),
    age_month: z.string().optional().nullable().refine((val) => !val || /^\d+$/.test(val), t("common:validation.invalidNumber")),
    age_day: z.string().optional().nullable().refine((val) => !val || /^\d+$/.test(val), t("common:validation.invalidNumber")),
    address: z.string().optional().nullable(),
    company_id: z.string().optional().nullable(),
    insurance_no: z.string().optional().nullable().superRefine((val, ctx) => {
      if (isCompanySelected && !val?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:validation.requiredField", { field: t("patients:fields.insuranceNo") }),
          path: [],
        });
      }
    }),
    guarantor: z.string().optional().nullable(),
    subcompany_id: z.string().optional().nullable(),
    company_relation_id: z.string().optional().nullable(),
  });

type LabRegistrationFormValues = z.infer<ReturnType<typeof getLabRegistrationSchema>>;

interface LabRegistrationFormProps {
  onPatientActivated: (patientWithVisit: Patient & { doctorVisit?: DoctorVisit }) => void;
  isVisible?: boolean;
  onSearchChange: (query: string) => void;
  onDoctorChange: (doctor: DoctorStripped | null) => void;
  referringDoctor: DoctorStripped | null;
  setActiveVisitId: (visitId: number) => void;
  setFormVisible: (visible: boolean) => void;
}

const LabRegistrationForm: React.FC<LabRegistrationFormProps> = ({
  onPatientActivated,
  isVisible,
  onSearchChange,
  onDoctorChange,
  setActiveVisitId,
  setFormVisible
}) => {
  const { t } = useTranslation(["labReception", "clinic", "common", "patients"]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const form = useForm<LabRegistrationFormValues>({
    resolver: zodResolver(getLabRegistrationSchema(t, false)),
    defaultValues: {
      phone: "", name: "", doctor: null, gender: "female",
      age_year: "", age_month: "", age_day: "",
    },
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  const companyId = watch("company_id");
  const isCompanySelected = !!companyId && companyId !== "";

  useEffect(() => {
    const newSchema = getLabRegistrationSchema(t, isCompanySelected);
    // @ts-expect-error Zod schema resolver type mismatch is a known RHF/Zod integration nuance
    form.reset(form.getValues(), { resolver: zodResolver(newSchema) });
    if (isCompanySelected) trigger("insurance_no");
  }, [isCompanySelected, t, form, trigger]);

  useEffect(() => {
    if (isVisible && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ["doctorsListForLabRegistration"],
    queryFn: () => getDoctorsList({ active: true }),
  });
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ["companiesListActive"],
    queryFn: () => getCompaniesList({ status: true }),
  });
  const { data: subcompanies = [] } = useQuery<Subcompany[], Error>({
    queryKey: ["subcompaniesList", companyId],
    queryFn: () => companyId ? getSubcompaniesList(Number(companyId)) : Promise.resolve([]),
    enabled: !!companyId,
  });
  const { data: companyRelations = [] } = useQuery<CompanyRelation[], Error>({
    queryKey: ["companyRelationsList"],
    queryFn: getCompanyRelationsList,
    enabled: isCompanySelected,
  });

  const registrationMutation = useMutation({
    mutationFn: (data: LabRegistrationFormValues) => {
      if (!data.doctor?.id) throw new Error("Doctor is required.");
      const submissionData = {
        name: data.name, 
        phone: data.phone || undefined, 
        gender: data.gender,
        age_year: data.age_year ? parseInt(data.age_year) : undefined,
        age_month: data.age_month ? parseInt(data.age_month) : undefined,
        age_day: data.age_day ? parseInt(data.age_day) : undefined,
        address: data.address || undefined, 
        doctor_id: data.doctor.id,
        company_id: data.company_id ? parseInt(data.company_id) : undefined,
        insurance_no: isCompanySelected ? data.insurance_no || undefined : undefined,
        guarantor: isCompanySelected ? data.guarantor || undefined : undefined,
        subcompany_id: isCompanySelected && data.subcompany_id ? data.subcompany_id : undefined,
        company_relation_id: isCompanySelected && data.company_relation_id ? data.company_relation_id : undefined,
      };
      return registerNewPatientFromLab(submissionData);
    },
    onSuccess: (newPatientWithVisit) => {
      toast.success(t('clinic:patientRegistration.registrationSuccess'));
      console.log("newPatientWithVisit", newPatientWithVisit);
      onPatientActivated(newPatientWithVisit);
      reset(); // Reset form for next entry
      phoneInputRef.current?.focus();
      setActiveVisitId(newPatientWithVisit?.doctor_visit?.id ?? 0);
      setFormVisible(false);
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || t('clinic:patientRegistration.registrationFailed'));
    },
  });

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValue(name as keyof LabRegistrationFormValues, value, { shouldValidate: true });
    onSearchChange(value);
  };

  const onSubmit = handleSubmit((data) => registrationMutation.mutate(data));
  const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
    queryClient.invalidateQueries({ queryKey: ["subcompaniesList", companyId] });
    setValue("subcompany_id", newSubcompany.id.toString());
    setShowSubcompanyDialog(false);
  };
  const handleRelationAdded = (newRelation: CompanyRelation) => {
    queryClient.invalidateQueries({ queryKey: ["companyRelationsList"] });
    setValue("company_relation_id", newRelation.id.toString());
    setShowRelationDialog(false);
  };

  const currentIsLoading = isLoadingDoctors || isLoadingCompanies || registrationMutation.isPending;

  return (
    <div  className="w-full h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t('formTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('formDescription')}</p>
      </div>
      <Form  {...form}>
        <form  onSubmit={onSubmit} className="space-y-4 flex-grow flex flex-col">
          <ScrollArea className="flex-grow pr-3 -mr-3">
            <div className="space-y-4">
              <FormField control={control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clinic:patientRegistration.phoneLabel')}</FormLabel>
                  <FormControl>
                    <Input type="tel" maxLength={10} placeholder="0xxxxxxxxx" autoComplete="off" {...field} value={field.value || ""} ref={phoneInputRef} onChange={handleSearchInputChange} disabled={currentIsLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clinic:patientRegistration.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('clinic:patientRegistration.namePlaceholder')} autoComplete="off" {...field} ref={nameInputRef} onChange={handleSearchInputChange} disabled={currentIsLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Controller name="doctor" control={control} render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('referringDoctor')}</FormLabel>
                    <Autocomplete
                      {...field}
                      options={doctorsList}
                      loading={isLoadingDoctors}
                      getOptionLabel={(option) => `${option.name} ${option.specialist_name ? `(${option.specialist_name})` : ""}`}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onChange={(_, data) => {
                        field.onChange(data);
                        onDoctorChange(data);
                      }}
                      size="small"
                      renderInput={(params) => ( <TextField {...params} placeholder={t('patients:search.selectDoctor')} variant="outlined" error={!!fieldState.error} helperText={fieldState.error?.message} InputProps={{ ...params.InputProps, endAdornment: (<>{isLoadingDoctors ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>) }} sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "var(--background)", paddingTop: "1px !important", paddingBottom: "1px !important" } }} /> )}
                      PaperComponent={(props) => (<Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />)}
                    />
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clinic:patientRegistration.genderLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentIsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('clinic:patientRegistration.genderPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{t('clinic:patientRegistration.male')}</SelectItem>
                        <SelectItem value="female">{t('clinic:patientRegistration.female')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name="company_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clinic:patientRegistration.companyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('clinic:patientRegistration.companyPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t('clinic:patientRegistration.noCompany')}</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormItem>
                <FormLabel>{t('clinic:patientRegistration.ageLabel')}</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormField control={control} name="age_year" render={({ field }) => ( <Input className="h-9" type="number" placeholder={t("clinic:patientRegistration.ageYearsPlaceholder")} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                  <FormField control={control} name="age_month" render={({ field }) => ( <Input className="h-9" type="number" placeholder={t("clinic:patientRegistration.ageMonthsPlaceholder")} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                  <FormField control={control} name="age_day" render={({ field }) => ( <Input className="h-9" type="number" placeholder={t("clinic:patientRegistration.ageDaysPlaceholder")} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                </div>
                <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
              </FormItem>
              {isCompanySelected && (
                <Card className="p-3 pt-2 mt-4 border-dashed">
                  <CardDescription className="mb-3">{t('clinic:patientRegistration.insuranceDetails')}</CardDescription>
                  <div className="space-y-3">
                    <FormField control={control} name="insurance_no" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('patients:fields.insuranceNo')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('patients:fields.insuranceNoPlaceholder')} {...field} value={field.value || ""} disabled={currentIsLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={control} name="guarantor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('patients:fields.guarantor')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('patients:fields.guarantorPlaceholder')} {...field} value={field.value || ""} disabled={currentIsLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={control} name="subcompany_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('patients:fields.subcompany')}</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('patients:fields.subcompanyPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=" ">{t('patients:fields.noSubcompany')}</SelectItem>
                                {subcompanies.map((subcompany) => (
                                  <SelectItem key={subcompany.id} value={subcompany.id.toString()}>
                                    {subcompany.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowSubcompanyDialog(true)} disabled={currentIsLoading}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={control} name="company_relation_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('patients:fields.companyRelation')}</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('patients:fields.companyRelationPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=" ">{t('patients:fields.noRelation')}</SelectItem>
                                {companyRelations.map((relation) => (
                                  <SelectItem key={relation.id} value={relation.id.toString()}>
                                    {relation.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowRelationDialog(true)} disabled={currentIsLoading}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
          <div className="pt-4 flex-shrink-0">
            <Button type="submit" className="w-full" disabled={currentIsLoading}>
              {registrationMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
              {t('clinic:patientRegistration.registerButton')}
            </Button>
          </div>
        </form>
      </Form>
   
      <AddSubcompanyDialog
        companyId={companyId ? Number(companyId) : null}
        open={showSubcompanyDialog}
        onOpenChange={setShowSubcompanyDialog}
        onSubcompanyAdded={handleSubcompanyAdded}
      />
      <AddCompanyRelationDialog
        companyId={companyId ? Number(companyId) : null}
        open={showRelationDialog}
        onOpenChange={setShowRelationDialog}
        onCompanyRelationAdded={handleRelationAdded}
      />
    </div>
  );
};
export default LabRegistrationForm;
