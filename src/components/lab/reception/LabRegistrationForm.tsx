import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

// MUI Imports
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";

// Removed shadcn UI; using MUI components instead
import AddSubcompanyDialog from "@/components/clinic/AddSubcompanyDialog";
import AddCompanyRelationDialog from "@/components/clinic/AddCompanyRelationDialog";

// Services & Types
import { registerNewPatientFromLab } from "@/services/patientService";
import {
  getSubcompaniesList,
} from "@/services/companyService";
import { useCachedDoctorsList, useCachedCompaniesList, useCachedCompanyRelationsList } from "@/hooks/useCachedData";
import { useDebounce } from "@/hooks/useDebounce";
import type { Patient } from "@/types/patients";
import type { DoctorVisit } from "@/types/visits";
import type { DoctorStripped } from "@/types/doctors";
import type { Subcompany, CompanyRelation } from "@/types/companies";
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
  onNameSearchChange: (query: string) => void; // New callback for name-based search
  onDoctorChange: (doctor: DoctorStripped | null) => void;
  referringDoctor: DoctorStripped | null;
  setActiveVisitId: (visitId: number) => void;
  setFormVisible: (visible: boolean) => void;
  onPatientSaved?: () => void; // New callback to handle post-save actions
}

const LabRegistrationForm: React.FC<LabRegistrationFormProps> = React.memo(({
  onPatientActivated,
  isVisible,
  onSearchChange,
  onNameSearchChange,
  onDoctorChange,
  setActiveVisitId,
  setFormVisible,
  onPatientSaved
}) => {
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const form = useForm<LabRegistrationFormValues>({
    defaultValues: {
      phone: "0", name: "", doctor: null, gender: "female",
      age_year: "0",
    },
  });
  const { control, handleSubmit, reset, setValue, watch } = form;
  
  // Only watch company_id for conditional rendering, not for every keystroke
  const companyId = watch("company_id");
  const isCompanySelected = useMemo(() => !!companyId && companyId !== "", [companyId]);

  // Use a state to track the name value for debounced search
  const [nameValue, setNameValue] = useState<string>("");
  const debouncedNameSearch = useDebounce(nameValue, 500);

  // Trigger name search when debounced value changes
  useEffect(() => {
    if (debouncedNameSearch && debouncedNameSearch.length >= 2) {
      onNameSearchChange(debouncedNameSearch);
    } else if (debouncedNameSearch === "") {
      onNameSearchChange(""); // Clear search when name is empty
    }
  }, [debouncedNameSearch, onNameSearchChange]);

  // لم يعد هناك Zod؛ التحقق البسيط سيكون عند الإرسال

  // Autofocus on name field when the form becomes visible
  useEffect(() => {
    if (isVisible && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useCachedDoctorsList();
  const { data: companies = [], isLoading: isLoadingCompanies } = useCachedCompaniesList();

  // Auto-select default doctor if available and none selected yet
  const selectedDoctor = watch("doctor");
  useEffect(() => {
    if (!selectedDoctor && doctorsList && doctorsList.length > 0) {
      const defaultDoctor = doctorsList.find((d) => (d as DoctorStripped & { is_default?: boolean })?.is_default === true);
      if (defaultDoctor) {
        setValue("doctor", defaultDoctor, { shouldValidate: true, shouldDirty: true });
        onDoctorChange(defaultDoctor);
      }
    }
  }, [doctorsList, selectedDoctor, setValue, onDoctorChange]);

  const handleDoctorChange = useCallback((doctor: DoctorStripped | null) => {
    onDoctorChange(doctor);
  }, [onDoctorChange]);

  const { data: subcompanies = [] } = useQuery<Subcompany[], Error>({
    queryKey: ["subcompaniesList", companyId],
    queryFn: () => companyId ? getSubcompaniesList(Number(companyId)) : Promise.resolve([]),
    enabled: !!companyId,
  });
  const { data: companyRelations = [] } = useCachedCompanyRelationsList();

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
      console.log("API Response - newPatientWithVisit:", newPatientWithVisit);
      console.log("API Response - doctor_visit:", newPatientWithVisit?.doctor_visit);
      console.log("API Response - doctorVisit:", newPatientWithVisit?.doctorVisit);
      onPatientActivated(newPatientWithVisit);
      reset(); // Reset form for next entry
      phoneInputRef.current?.focus();
      setActiveVisitId(newPatientWithVisit?.doctor_visit?.id ?? 0);
      setFormVisible(false);
      
      // Call the onPatientSaved callback to trigger additional actions
      if (onPatientSaved) {
        onPatientSaved();
      }
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'فشل تسجيل المريض');
    },
  });

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValue(name as keyof LabRegistrationFormValues, value, { shouldValidate: true });
    // Only trigger search for phone field, not name field
    if (name === 'phone') {
      onSearchChange(value);
    }
  }, [setValue, onSearchChange]);

  const handleNameInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValue('name', value, { shouldValidate: true });
    // Update the state for debounced search
    setNameValue(value);
  }, [setValue]);

  const onSubmit = useCallback((data: LabRegistrationFormValues) => {
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
  }, [isCompanySelected, registrationMutation]);
  const handleSubcompanyAdded = useCallback((newSubcompany: Subcompany) => {
    queryClient.invalidateQueries({ queryKey: ["subcompaniesList", companyId] });
    setValue("subcompany_id", newSubcompany.id.toString());
    setShowSubcompanyDialog(false);
  }, [queryClient, companyId, setValue]);

  const handleRelationAdded = useCallback((newRelation: CompanyRelation) => {
    queryClient.invalidateQueries({ queryKey: ["companyRelationsList"] });
    setValue("company_relation_id", newRelation.id.toString());
    setShowRelationDialog(false);
  }, [queryClient, setValue]);

  const currentIsLoading = useMemo(() => 
    isLoadingDoctors || isLoadingCompanies || registrationMutation.isPending,
    [isLoadingDoctors, isLoadingCompanies, registrationMutation.isPending]
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h6">تسجيل مريض جديد</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField fullWidth label="رقم الهاتف" id="lab-phone" type="tel" inputProps={{ maxLength: 10 }} placeholder="0xxxxxxxxx" autoComplete="off" {...field} value={field.value || ""} inputRef={phoneInputRef} onChange={handleSearchInputChange} disabled={currentIsLoading}/>
              )} />
              <Controller name="name" control={control} render={({ field }) => (
                <TextField fullWidth label="اسم المريض" id="lab-name" autoComplete="off" {...field} inputRef={nameInputRef} onChange={handleNameInputChange} />
              )} />
              <Controller name="doctor" control={control} render={({ field, fieldState }) => (
                <FormControl fullWidth size="small">
                  {/* <InputLabel shrink>الطبيب المحوِّل</InputLabel> */}
                  <Autocomplete
                    {...field}
                    options={doctorsList}
                    loading={isLoadingDoctors}
                    getOptionLabel={(option) => `${option.name} ${option.specialist_name ? `(${option.specialist_name})` : ""}`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, data) => {
                      field.onChange(data);
                      handleDoctorChange(data);
                    }}
                    size="small"
                    renderInput={(params) => (
                      <TextField {...params} placeholder="اختر الطبيب" variant="outlined" error={!!fieldState.error} helperText={fieldState.error?.message} InputProps={{ ...params.InputProps, endAdornment: (<>{isLoadingDoctors ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>) }} />
                    )}
                    PaperComponent={(props) => (<Paper {...props} />)}
                  />
                  <FormHelperText />
                </FormControl>
              )} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Controller name="gender" control={control} render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel id="gender-label">النوع</InputLabel>
                    <Select labelId="gender-label" value={field.value} label="النوع" onChange={(e) => field.onChange(e.target.value)} disabled={currentIsLoading}>
                      <MenuItem value="male">ذكر</MenuItem>
                      <MenuItem value="female">أنثى</MenuItem>
                    </Select>
                  </FormControl>
                )} />
                <Controller name="company_id" control={control} render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel id="company-label">الشركة</InputLabel>
                    <Select labelId="company-label" value={field.value || ""} label="الشركة" onChange={(e) => field.onChange(e.target.value)} disabled={currentIsLoading}>
                      <MenuItem value=" ">لا يوجد</MenuItem>
                      {companies.map((company) => (
                        <MenuItem key={company.id} value={company.id.toString()}>{company.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>العمر</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Controller name="age_year" control={control} render={({ field }) => (
                    <TextField fullWidth label="سنوات" type="number" {...field} value={field.value || ""} disabled={currentIsLoading}/>
                  )} />
                  <Controller name="age_month" control={control} render={({ field }) => (
                    <TextField fullWidth label="أشهر" type="number" {...field} value={field.value || ""} disabled={currentIsLoading}/>
                  )} />
                  <Controller name="age_day" control={control} render={({ field }) => (
                    <TextField fullWidth label="أيام" type="number" {...field} value={field.value || ""} disabled={currentIsLoading}/>
                  )} />
                </Box>
                <FormHelperText>{form.formState.errors.age_year?.message || form.formState.errors.age_month?.message || form.formState.errors.age_day?.message}</FormHelperText>
              </Box>
              {isCompanySelected && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>
                    تفاصيل التأمين
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Controller name="insurance_no" control={control} render={({ field }) => (
                      <TextField fullWidth label="رقم التأمين" {...field} value={field.value || ""} disabled={currentIsLoading} size="small"/>
                    )} />
                    <Controller name="guarantor" control={control} render={({ field }) => (
                      <TextField fullWidth label="الضامن" placeholder="اسم الضامن (اختياري)" {...field} value={field.value || ""} disabled={currentIsLoading} size="small"/>
                    )} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="subcompany-label">الشركة الفرعية</InputLabel>
                        <Select labelId="subcompany-label" value={form.getValues('subcompany_id') || ''} label="الشركة الفرعية" onChange={(e) => setValue('subcompany_id', String(e.target.value))} disabled={currentIsLoading}>
                          <MenuItem value=" ">لا يوجد</MenuItem>
                          {subcompanies.map((sub) => (
                            <MenuItem key={sub.id} value={String(sub.id)}>{sub.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button onClick={() => setShowSubcompanyDialog(true)} disabled={currentIsLoading} size="small">إضافة</Button>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="relation-label">العلاقة</InputLabel>
                        <Select labelId="relation-label" value={form.getValues('company_relation_id') || ''} label="العلاقة" onChange={(e) => setValue('company_relation_id', String(e.target.value))} disabled={currentIsLoading}>
                          <MenuItem value=" ">لا يوجد</MenuItem>
                          {companyRelations.map((rel) => (
                            <MenuItem key={rel.id} value={String(rel.id)}>{rel.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button onClick={() => setShowRelationDialog(true)} disabled={currentIsLoading} size="small">إضافة</Button>
                    </Box>
                  </Box>
                </Card>
              )}
              <Button type="submit" variant="contained" fullWidth disabled={currentIsLoading} startIcon={registrationMutation.isPending ? <CircularProgress size={20} /> : null}>
                {registrationMutation.isPending ? 'جاري التسجيل...' : 'تسجيل المريض'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
 
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
    </Box>
  );
});

LabRegistrationForm.displayName = 'LabRegistrationForm';

export default LabRegistrationForm;
