import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

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
// i18n removed



// نموذج القيم بدون Zod
type LabRegistrationFormValues = {
  phone?: string | null;
  name: string;
  doctor: DoctorStripped | null;
  gender: "male" | "female";
  age_year?: string | null;
  age_month?: string | null;
  age_day?: string | null;
  address?: string | null;
  company_id?: string | null;
  insurance_no?: string | null;
  guarantor?: string | null;
  subcompany_id?: string | null;
  company_relation_id?: string | null;
};

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
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const form = useForm<LabRegistrationFormValues>({
    defaultValues: {
      phone: "", name: "", doctor: null, gender: "female",
      age_year: "", age_month: "", age_day: "",
    },
  });
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;

  const companyId = watch("company_id");
  const isCompanySelected = !!companyId && companyId !== "";

  // لم يعد هناك Zod؛ التحقق البسيط سيكون عند الإرسال

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
      toast.success('تم تسجيل المريض بنجاح');
      console.log("newPatientWithVisit", newPatientWithVisit);
      onPatientActivated(newPatientWithVisit);
      reset(); // Reset form for next entry
      phoneInputRef.current?.focus();
      setActiveVisitId(newPatientWithVisit?.doctor_visit?.id ?? 0);
      setFormVisible(false);
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'فشل تسجيل المريض');
    },
  });

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValue(name as keyof LabRegistrationFormValues, value, { shouldValidate: true });
    onSearchChange(value);
  };

  const onSubmit = handleSubmit((data) => {
    // تحقق بسيط قبل الإرسال
    if (!data.name?.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    if (!data.doctor) {
      toast.error('يجب اختيار طبيب محوِّل');
      return;
    }
    if (isCompanySelected && !data.insurance_no?.trim()) {
      toast.error('رقم التأمين مطلوب');
      return;
    }
    if (data.age_year && !/^\d+$/.test(data.age_year)) {
      toast.error('قيمة غير صالحة في السنوات');
      return;
    }
    if (data.age_month && !/^\d+$/.test(data.age_month)) {
      toast.error('قيمة غير صالحة في الأشهر');
      return;
    }
    if (data.age_day && !/^\d+$/.test(data.age_day)) {
      toast.error('قيمة غير صالحة في الأيام');
      return;
    }
    registrationMutation.mutate(data);
  });
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
        <h2 className="text-lg font-semibold">تسجيل مريض جديد</h2>
        <p className="text-sm text-muted-foreground">يرجى تعبئة البيانات التالية لتسجيل المريض وتفعيل الزيارة</p>
      </div>
      <Form  {...form}>
        <form  onSubmit={onSubmit} className="space-y-4 flex-grow flex flex-col">
          <ScrollArea className="flex-grow pr-3 -mr-3">
            <div className="space-y-4">
              <FormField control={control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>الهاتف</FormLabel>
                  <FormControl>
                    <Input type="tel" maxLength={10} placeholder="0xxxxxxxxx" autoComplete="off" {...field} value={field.value || ""} ref={phoneInputRef} onChange={handleSearchInputChange} disabled={currentIsLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم</FormLabel>
                  <FormControl>
                    <Input placeholder="اسم المريض" autoComplete="off" {...field} ref={nameInputRef} onChange={handleSearchInputChange} disabled={currentIsLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Controller name="doctor" control={control} render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>الطبيب المحوِّل</FormLabel>
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
                      renderInput={(params) => ( <TextField {...params} placeholder="اختر الطبيب" variant="outlined" error={!!fieldState.error} helperText={fieldState.error?.message} InputProps={{ ...params.InputProps, endAdornment: (<>{isLoadingDoctors ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>) }} sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "var(--background)", paddingTop: "1px !important", paddingBottom: "1px !important" } }} /> )}
                      PaperComponent={(props) => (<Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />)}
                    />
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentIsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={"اختر النوع"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name="company_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشركة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={"اختر الشركة (اختياري)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">بدون شركة</SelectItem>
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
                <FormLabel>العمر</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormField control={control} name="age_year" render={({ field }) => ( <Input className="h-9" type="number" placeholder={"سنوات"} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                  <FormField control={control} name="age_month" render={({ field }) => ( <Input className="h-9" type="number" placeholder={"أشهر"} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                  <FormField control={control} name="age_day" render={({ field }) => ( <Input className="h-9" type="number" placeholder={"أيام"} {...field} value={field.value || ""} disabled={currentIsLoading} /> )} />
                </div>
                <FormMessage>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormMessage>
              </FormItem>
              {isCompanySelected && (
                <Card className="p-3 pt-2 mt-4 border-dashed">
                  <CardDescription className="mb-3">بيانات التأمين</CardDescription>
                  <div className="space-y-3">
                    <FormField control={control} name="insurance_no" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم التأمين</FormLabel>
                        <FormControl>
                          <Input placeholder={"أدخل رقم التأمين"} {...field} value={field.value || ""} disabled={currentIsLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={control} name="guarantor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الضامن</FormLabel>
                        <FormControl>
                          <Input placeholder={"اسم الضامن (اختياري)"} {...field} value={field.value || ""} disabled={currentIsLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={control} name="subcompany_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الفرع</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={"اختر الفرع (اختياري)"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=" ">بدون فرع</SelectItem>
                                {subcompanies.map((subcompany) => (
                                  <SelectItem key={subcompany.id} value={subcompany.id.toString()}>
                                    {subcompany.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" onClick={() => setShowSubcompanyDialog(true)} disabled={currentIsLoading}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={control} name="company_relation_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>صلة القرابة</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={currentIsLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={"اختر صلة القرابة (اختياري)"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=" ">بدون صلة</SelectItem>
                                {companyRelations.map((relation) => (
                                  <SelectItem key={relation.id} value={relation.id.toString()}>
                                    {relation.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" onClick={() => setShowRelationDialog(true)} disabled={currentIsLoading}>
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
              تسجيل
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
