// src/components/lab/reception/LabRegistrationForm.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm, Controller, type Control } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

// MUI
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

// Services & Types
import { registerNewPatientFromLab } from "@/services/patientService";
import { getSettings } from "@/services/settingService";
import smsService from "@/services/smsService";
import { getSubcompaniesList } from "@/services/companyService";
import { useCachedDoctorsList, useCachedCompaniesList, useCachedCompanyRelationsList } from "@/hooks/useCachedData";
import { useDebounce } from "@/hooks/useDebounce";
import type { Patient } from "@/types/patients";
import type { DoctorVisit } from "@/types/visits";
import type { DoctorStripped } from "@/types/doctors";
import type { Subcompany } from "@/types/companies";

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
  onNameSearchChange: (query: string) => void;
  onDoctorChange: (doctor: DoctorStripped | null) => void;
  referringDoctor: DoctorStripped | null;
  setActiveVisitId: (visitId: number) => void;
  setFormVisible: (visible: boolean) => void;
  onPatientSaved?: () => void;
}

/** Three side-by-side numeric inputs for years / months / days. */
const AgeFields: React.FC<{ control: Control<LabRegistrationFormValues>; disabled: boolean }> = ({ control, disabled }) => (
  <Box sx={{ display: "flex", gap: 1 }}>
    <Controller
      name="age_year"
      control={control}
      render={({ field }) => (
        <TextField fullWidth size="small" label="سنوات" type="number" {...field} value={field.value || ""} disabled={disabled} />
      )}
    />
    <Controller
      name="age_month"
      control={control}
      render={({ field }) => (
        <TextField fullWidth size="small" label="أشهر" type="number" {...field} value={field.value || ""} disabled={disabled} />
      )}
    />
    <Controller
      name="age_day"
      control={control}
      render={({ field }) => (
        <TextField fullWidth size="small" label="أيام" type="number" {...field} value={field.value || ""} disabled={disabled} />
      )}
    />
  </Box>
);

const LabRegistrationForm: React.FC<LabRegistrationFormProps> = React.memo(
  ({ onPatientActivated, isVisible, onSearchChange, onNameSearchChange, onDoctorChange, setActiveVisitId, setFormVisible, onPatientSaved }) => {
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<LabRegistrationFormValues>({
      defaultValues: {
        phone: "0",
        name: "",
        doctor: null,
        gender: "female",
        age_year: "0",
      },
    });
    const { control, handleSubmit, reset, setValue, watch } = form;

    // Watch only company_id — it drives the insurance section visibility
    const companyId = watch("company_id");
    const isCompanySelected = useMemo(() => !!companyId && companyId !== "", [companyId]);

    // Reset relation when the company changes
    useEffect(() => {
      setValue("company_relation_id", null);
    }, [companyId, setValue]);

    // Debounced name search feeding the patient-history overlay
    const [nameValue, setNameValue] = useState<string>("");
    const debouncedNameSearch = useDebounce(nameValue, 500);
    useEffect(() => {
      if (debouncedNameSearch && debouncedNameSearch.length >= 2) {
        onNameSearchChange(debouncedNameSearch);
      } else if (debouncedNameSearch === "") {
        onNameSearchChange("");
      }
    }, [debouncedNameSearch, onNameSearchChange]);

    // Autofocus the name field whenever the form slides into view
    useEffect(() => {
      if (isVisible && nameInputRef.current) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      }
    }, [isVisible]);

    const { data: doctorsList = [], isLoading: isLoadingDoctors } = useCachedDoctorsList();
    const { data: companies = [], isLoading: isLoadingCompanies } = useCachedCompaniesList();

    // Auto-select the default doctor when none is chosen yet
    const selectedDoctor = watch("doctor");
    useEffect(() => {
      if (!selectedDoctor && doctorsList && doctorsList.length > 0) {
        const defaultDoctor = doctorsList.find(
          (d) => (d as DoctorStripped & { is_default?: boolean })?.is_default === true
        );
        if (defaultDoctor) {
          setValue("doctor", defaultDoctor, { shouldValidate: true, shouldDirty: true });
          onDoctorChange(defaultDoctor);
        }
      }
    }, [doctorsList, selectedDoctor, setValue, onDoctorChange]);

    const handleDoctorChange = useCallback(
      (doctor: DoctorStripped | null) => {
        onDoctorChange(doctor);
      },
      [onDoctorChange]
    );

    const { data: subcompanies = [] } = useQuery<Subcompany[], Error>({
      queryKey: ["subcompaniesList", companyId],
      queryFn: () => (companyId ? getSubcompaniesList(Number(companyId)) : Promise.resolve([])),
      enabled: !!companyId,
    });
    const { data: companyRelations = [] } = useCachedCompanyRelationsList();

    const filteredCompanyRelations = useMemo(() => {
      if (!companyId || companyId === "") return [];
      const companyIdNum = Number(companyId);
      return companyRelations.filter((rel) => rel.company_id === companyIdNum);
    }, [companyRelations, companyId]);

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
        // Header suppresses the global interceptor toast so we can show our own
        return registerNewPatientFromLab(submissionData, { headers: { "X-Suppress-Error-Toast": "1" } });
      },
      onSuccess: async (newPatientWithVisit) => {
        toast.success("تم تسجيل المريض بنجاح");
        onPatientActivated(newPatientWithVisit);
        reset();
        phoneInputRef.current?.focus();
        setActiveVisitId(newPatientWithVisit?.doctor_visit?.id ?? 0);
        setFormVisible(false);
        onPatientSaved?.();

        // Welcome SMS when configured and a phone number exists
        const phone = newPatientWithVisit?.phone;
        if (phone) {
          try {
            const settings = await getSettings();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message = (settings as any)?.lab_welcome_sms_message?.trim();
            if (message) {
              const normalized = phone.startsWith("249") ? phone : `249${phone.replace(/^0/, "")}`;
              await smsService.sendSms(normalized, message);
            }
          } catch (e) {
            console.error("Failed to send welcome SMS:", e);
          }
        }
      },
      onError: (error: AxiosError) => {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || "فشل تسجيل المريض");
      },
    });

    const handleSearchInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setValue(name as keyof LabRegistrationFormValues, value, { shouldValidate: true });
        if (name === "phone") {
          onSearchChange(value);
        }
      },
      [setValue, onSearchChange]
    );

    const handleNameInputChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setValue("name", value, { shouldValidate: true });
        setNameValue(value);
      },
      [setValue]
    );

    const onSubmit = useCallback(
      (data: LabRegistrationFormValues) => {
        if (!data.name?.trim()) {
          toast.error("الاسم مطلوب");
          return;
        }
        if (!data.doctor) {
          toast.error("يجب اختيار طبيب محوِّل");
          return;
        }
        if (isCompanySelected && !data.insurance_no?.trim()) {
          toast.error("رقم التأمين مطلوب");
          return;
        }
        if (data.age_year && !/^\d+$/.test(data.age_year)) {
          toast.error("قيمة غير صالحة في السنوات");
          return;
        }
        if (data.age_month && !/^\d+$/.test(data.age_month)) {
          toast.error("قيمة غير صالحة في الأشهر");
          return;
        }
        if (data.age_day && !/^\d+$/.test(data.age_day)) {
          toast.error("قيمة غير صالحة في الأيام");
          return;
        }
        registrationMutation.mutate(data);
      },
      [isCompanySelected, registrationMutation]
    );

    const currentIsLoading = useMemo(
      () => isLoadingDoctors || isLoadingCompanies || registrationMutation.isPending,
      [isLoadingDoctors, isLoadingCompanies, registrationMutation.isPending]
    );

    return (
      <Box sx={{ width: "100%", height: "100%", overflowY: "auto" }}>
        <Card elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, height: "100%" }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              تسجيل مريض جديد
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      size="small"
                      label="رقم الهاتف"
                      id="lab-phone"
                      type="tel"
                      inputProps={{ maxLength: 10 }}
                      placeholder="0xxxxxxxxx"
                      autoComplete="off"
                      {...field}
                      value={field.value || ""}
                      inputRef={phoneInputRef}
                      onChange={handleSearchInputChange}
                      disabled={currentIsLoading}
                    />
                  )}
                />

                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      size="small"
                      label="اسم المريض"
                      id="lab-name"
                      autoComplete="off"
                      {...field}
                      inputRef={nameInputRef}
                      onChange={handleNameInputChange}
                    />
                  )}
                />

                <Controller
                  name="doctor"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth size="small">
                      <Autocomplete
                        {...field}
                        options={doctorsList}
                        loading={isLoadingDoctors}
                        getOptionLabel={(option) =>
                          `${option.name} ${option.specialist_name ? `(${option.specialist_name})` : ""}`
                        }
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, data) => {
                          field.onChange(data);
                          handleDoctorChange(data);
                        }}
                        size="small"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="اختر الطبيب"
                            variant="outlined"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {isLoadingDoctors ? <CircularProgress size={16} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        PaperComponent={(props) => <Paper {...props} />}
                      />
                      <FormHelperText />
                    </FormControl>
                  )}
                />

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small">
                        <InputLabel id="gender-label">النوع</InputLabel>
                        <Select
                          labelId="gender-label"
                          value={field.value}
                          label="النوع"
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={currentIsLoading}
                        >
                          <MenuItem value="male">ذكر</MenuItem>
                          <MenuItem value="female">أنثى</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name="company_id"
                    control={control}
                    render={({ field, fieldState }) => {
                      const selectedCompany = companies.find((company) => company.id.toString() === field.value) || null;
                      return (
                        <FormControl fullWidth size="small">
                          <Autocomplete
                            value={selectedCompany}
                            options={companies}
                            loading={isLoadingCompanies}
                            getOptionLabel={(option) => option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            onChange={(_, newValue) => {
                              field.onChange(newValue ? newValue.id.toString() : null);
                            }}
                            size="small"
                            disabled={currentIsLoading}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="اختر الشركة"
                                variant="outlined"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {isLoadingCompanies ? <CircularProgress size={16} /> : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                            PaperComponent={(props) => <Paper {...props} />}
                          />
                        </FormControl>
                      );
                    }}
                  />
                </Box>

                <Box component="fieldset" sx={{ border: 0, m: 0, p: 0 }}>
                  <Typography component="legend" variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                    العمر
                  </Typography>
                  <AgeFields control={control} disabled={currentIsLoading} />
                  <FormHelperText>
                    {form.formState.errors.age_year?.message ||
                      form.formState.errors.age_month?.message ||
                      form.formState.errors.age_day?.message}
                  </FormHelperText>
                </Box>

                {isCompanySelected && (
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "primary.50" }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: "primary.main", fontWeight: 700 }}>
                      تفاصيل التأمين
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Controller
                        name="insurance_no"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            label="رقم التأمين"
                            {...field}
                            value={field.value || ""}
                            disabled={currentIsLoading}
                            size="small"
                          />
                        )}
                      />
                      <Controller
                        name="guarantor"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            fullWidth
                            label="الضامن"
                            placeholder="اسم الضامن (اختياري)"
                            {...field}
                            value={field.value || ""}
                            disabled={currentIsLoading}
                            size="small"
                          />
                        )}
                      />

                      <FormControl fullWidth size="small">
                        <Controller
                          name="subcompany_id"
                          control={control}
                          render={({ field, fieldState }) => {
                            const selectedSubcompany = subcompanies.find((sub) => sub.id.toString() === field.value) || null;
                            return (
                              <Autocomplete
                                value={selectedSubcompany}
                                options={subcompanies}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                onChange={(_, newValue) => {
                                  field.onChange(newValue ? newValue.id.toString() : null);
                                }}
                                size="small"
                                disabled={currentIsLoading}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="اختر الشركة الفرعية"
                                    variant="outlined"
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                  />
                                )}
                                PaperComponent={(props) => <Paper {...props} />}
                              />
                            );
                          }}
                        />
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <Controller
                          name="company_relation_id"
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <InputLabel id="relation-label">العلاقة</InputLabel>
                              <Select
                                labelId="relation-label"
                                value={field.value || " "}
                                label="العلاقة"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === " " ? null : value);
                                }}
                                disabled={currentIsLoading}
                                error={!!fieldState.error}
                              >
                                <MenuItem value=" ">لا يوجد</MenuItem>
                                {filteredCompanyRelations.map((rel) => (
                                  <MenuItem key={rel.id} value={String(rel.id)}>
                                    {rel.name}
                                  </MenuItem>
                                ))}
                              </Select>
                              {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                            </>
                          )}
                        />
                      </FormControl>
                    </Box>
                  </Card>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={currentIsLoading}
                  startIcon={registrationMutation.isPending ? <CircularProgress size={20} /> : null}
                >
                  {registrationMutation.isPending ? "جاري التسجيل..." : "تسجيل المريض"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }
);

LabRegistrationForm.displayName = "LabRegistrationForm";

export default LabRegistrationForm;
