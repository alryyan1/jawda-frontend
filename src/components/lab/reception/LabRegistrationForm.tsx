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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Card, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import LabPatientSearchResultDisplay from "./LabPatientSearchResultDisplay";
import AddSubcompanyDialog from "@/components/clinic/AddSubcompanyDialog";
import AddCompanyRelationDialog from "@/components/clinic/AddCompanyRelationDialog";

// Services & Types
import {
  registerNewPatientFromLab,
  searchExistingPatients,
  createLabVisitForExistingPatient,
} from "@/services/patientService";
import {
  getCompaniesList,
  getSubcompaniesList,
  getCompanyRelationsList,
} from "@/services/companyService";
import { getDoctorsList } from "@/services/doctorService";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  Patient,
  PatientSearchResult,
} from "@/types/patients";
import type { DoctorStripped } from "@/types/doctors";
import type { Company, Subcompany, CompanyRelation } from "@/types/companies";

// Zod Schema Definition
const getLabRegistrationSchema = (t: TFunction, isCompanySelected: boolean) =>
  z
    .object({
      phone: z.string().optional().nullable(),
      name: z.string().min(1, { message: t("clinic:validation.nameRequired") }),
      doctor: z.custom<DoctorStripped | null>((val) => val !== null, {
        message: t("labReception:validation.doctorRequired"),
      }),
      gender: z.enum(["male", "female"], {
        required_error: t("clinic:validation.genderRequired"),
      }),
      age_year: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) => !val || /^\d+$/.test(val),
          t("common:validation.invalidNumber")
        ),
      age_month: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) => !val || /^\d+$/.test(val),
          t("common:validation.invalidNumber")
        ),
      age_day: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) => !val || /^\d+$/.test(val),
          t("common:validation.invalidNumber")
        ),
      address: z.string().optional().nullable(),
      company_id: z.string().optional().nullable(),
      insurance_no: z.string().optional().nullable(),
      guarantor: z.string().optional().nullable(),
      subcompany_id: z.string().optional().nullable(),
      company_relation_id: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      if (
        data.company_id &&
        data.company_id !== "" &&
        !data.insurance_no?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:validation.requiredField", {
            field: t("patients:fields.insuranceNo"),
          }),
          path: ["insurance_no"],
        });
      }
    });

type LabRegistrationFormValues = z.infer<
  ReturnType<typeof getLabRegistrationSchema>
>;

// Type for the lab registration submission data
interface LabRegistrationSubmissionData {
  name: string;
  phone?: string | null;
  gender: "male" | "female";
  age_year?: number;
  age_month?: number;
  age_day?: number;
  address?: string | null;
  doctor_id: number;
  company_id?: number;
  insurance_no?: string;
  guarantor?: string;
  subcompany_id?: number;
  company_relation_id?: number;
}

interface LabRegistrationFormProps {
  onPatientActivated: (patientWithVisit: Patient) => void;
  isVisible?: boolean;
}

const LabRegistrationForm: React.FC<LabRegistrationFormProps> = ({
  onPatientActivated,
  isVisible,
}) => {
  const { t } = useTranslation([
    "labReception",
    "clinic",
    "common",
    "patients",
  ]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchAnchor, setSearchAnchor] = useState<HTMLInputElement | null>(
    null
  );
  const [doctorSearchInput, setDoctorSearchInput] = useState("");

  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  const form = useForm<LabRegistrationFormValues>({
    resolver: zodResolver(getLabRegistrationSchema(t, false)), // initial resolver
    defaultValues: {
      phone: "",
      name: "",
      doctor: null,
      gender: "female",
      age_year: "",
      age_month: "",
      age_day: "",
    },
  });
  const { control, handleSubmit, reset, setValue, watch, trigger, getValues } = form;

  const companyId = watch("company_id");
  const isCompanySelected = !!companyId && companyId !== "";

  useEffect(() => {
    const newSchema = getLabRegistrationSchema(t, isCompanySelected);
    form.reset(form.getValues(), {
      // @ts-ignore
      resolver: zodResolver(newSchema),
    });
    if (isCompanySelected) {
      trigger("insurance_no");
    }
  }, [isCompanySelected, t, form, trigger]);

  useEffect(() => {
    if (isVisible && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  // Data fetching
  const { data: searchResults = [], isLoading: isLoadingSearchResults } =
    useQuery<PatientSearchResult[], Error>({
      queryKey: ["patientSearchExistingLab", debouncedSearchQuery],
      queryFn: () =>
        debouncedSearchQuery.length >= 2
          ? searchExistingPatients(debouncedSearchQuery)
          : Promise.resolve([]),
      enabled: debouncedSearchQuery.length >= 2 && showSearchResults,
    });
  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useQuery<
    DoctorStripped[],
    Error
  >({
    queryKey: ["doctorsListForLabRegistration"],
    queryFn: () => getDoctorsList({ active: true }),
  });
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<
    Company[],
    Error
  >({
    queryKey: ["companiesListActive"],
    queryFn: () => getCompaniesList({ status: true }),
  });
  const { data: subcompanies = [], isLoading: isLoadingSubcompanies } =
    useQuery<Subcompany[], Error>({
      queryKey: ["subcompaniesList", companyId],
      queryFn: () =>
        companyId
          ? getSubcompaniesList(Number(companyId))
          : Promise.resolve([]),
      enabled: !!companyId,
    });
  const { data: companyRelations = [], isLoading: isLoadingRelations } =
    useQuery<CompanyRelation[], Error>({
      queryKey: ["companyRelationsList"],
      queryFn: getCompanyRelationsList,
      enabled: isCompanySelected,
    });

  // Mutations
  const registrationMutation = useMutation({
    mutationFn: (data: LabRegistrationFormValues) => {
      if (!data.doctor?.id) throw new Error("Doctor is required.");
      const submissionData = {
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        age_year: data.age_year ? parseInt(data.age_year) : undefined,
        age_month: data.age_month ? parseInt(data.age_month) : undefined,
        age_day: data.age_day ? parseInt(data.age_day) : undefined,
        address: data.address,
        doctor_id: data.doctor.id,
        company_id:
          isCompanySelected && data.company_id
            ? parseInt(data.company_id)
            : undefined,
        insurance_no: isCompanySelected ? data.insurance_no : undefined,
        guarantor: isCompanySelected ? data.guarantor : undefined,
        subcompany_id:
          isCompanySelected && data.subcompany_id
            ? parseInt(data.subcompany_id)
            : undefined,
        company_relation_id:
          isCompanySelected && data.company_relation_id
            ? parseInt(data.company_relation_id)
            : undefined,
      };
      return registerNewPatientFromLab(submissionData as Partial<LabRegistrationSubmissionData>);
    },
    onSuccess: (newPatientWithVisit) => {
      toast.success(t("clinic:patientRegistration.registrationSuccess"));
      // Invalidate the lab patient queue to show the newly added patient
      queryClient.invalidateQueries({
        queryKey: ["labReceptionQueue"],
      });
      onPatientActivated(newPatientWithVisit);
      reset();
      phoneInputRef.current?.focus();
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message ||
          t("clinic:patientRegistration.registrationFailed")
      );
    },
  });

  const createVisitFromHistoryMutation = useMutation({
    mutationFn: (payload: { patientId: number; doctorId: number }) =>
      createLabVisitForExistingPatient(payload.patientId, {
        doctor_id: payload.doctorId,
      }),
    onSuccess: (newPatientWithVisit) => {
      toast.success(
        t("patients:search.visitCreatedSuccess", {
          patientName: newPatientWithVisit.name,
        })
      );
      onPatientActivated(newPatientWithVisit);
      reset();
      setShowSearchResults(false);
      setSearchQuery("");
    },
    onError: (error: AxiosError) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || t("clinic:errors.visitCreationFailed")
      );
    },
  });

  // Handlers
  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setValue(name as keyof LabRegistrationFormValues, value, {
      shouldValidate: true,
    });
    setSearchQuery(value);
    if (value.length >= 2) {
      setShowSearchResults(true);
      setSearchAnchor(event.currentTarget);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSelectPatientFromSearch = (patientId: number) => {
    const selectedDoctor = getValues("doctor");
    if (!selectedDoctor?.id) {
      toast.error(t("labReception:validation.selectDoctorFirst"));
      return;
    }
    setShowSearchResults(false);
    createVisitFromHistoryMutation.mutate({
      patientId,
      doctorId: selectedDoctor.id,
    });
  };

  const onSubmit = handleSubmit((data) => {
    registrationMutation.mutate(data);
  });

  const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
    queryClient
      .invalidateQueries({ queryKey: ["subcompaniesList", companyId] })
      .then(() => {
        setValue("subcompany_id", String(newSubcompany.id), {
          shouldValidate: true,
          shouldDirty: true,
        });
      });
    setShowSubcompanyDialog(false);
  };
  const handleRelationAdded = (newRelation: CompanyRelation) => {
    queryClient
      .invalidateQueries({ queryKey: ["companyRelationsList"] })
      .then(() => {
        setValue("company_relation_id", String(newRelation.id), {
          shouldValidate: true,
          shouldDirty: true,
        });
      });
    setShowRelationDialog(false);
  };

  const currentIsLoading =
    isLoadingDoctors ||
    registrationMutation.isPending ||
    createVisitFromHistoryMutation.isPending;

  return (
    <>
      <div className="w-full h-full flex flex-col">
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <Popover
              open={showSearchResults}
              onOpenChange={setShowSearchResults}
            >
              <PopoverAnchor asChild>
                <div className="space-y-4">
                  <FormField
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("clinic:patientRegistration.phoneLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            maxLength={10}
                            placeholder="0xxxxxxxxx"
                            autoComplete="off"
                            {...field}
                            value={field.value || ""}
                            ref={phoneInputRef}
                            onChange={handleSearchInputChange}
                            onFocus={(e) => {
                              if (e.target.value.length >= 2)
                                setSearchAnchor(e.currentTarget);
                              setShowSearchResults(e.target.value.length >= 2);
                            }}
                            disabled={currentIsLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("clinic:patientRegistration.nameLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t(
                              "clinic:patientRegistration.namePlaceholder"
                            )}
                            autoComplete="off"
                            {...field}
                            ref={nameInputRef}
                            onChange={handleSearchInputChange}
                            onFocus={(e) => {
                              if (e.target.value.length >= 2)
                                setSearchAnchor(e.currentTarget);
                              setShowSearchResults(e.target.value.length >= 2);
                            }}
                            disabled={currentIsLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl"
                side="bottom"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <LabPatientSearchResultDisplay
                  results={searchResults}
                  onSelectPatient={handleSelectPatientFromSearch}
                  isLoading={isLoadingSearchResults}
                />
              </PopoverContent>
            </Popover>

            <Controller
              name="doctor"
              control={control}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("referringDoctor")}</FormLabel>
                  <Autocomplete
                    {...field}
                    options={doctorsList}
                    loading={isLoadingDoctors}
                    getOptionLabel={(option) =>
                      `${option.name} ${
                        option.specialist_name
                          ? `(${option.specialist_name})`
                          : ""
                      }`
                    }
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    onChange={(_, data) => field.onChange(data)}
                    onInputChange={(_, newInputValue) =>
                      setDoctorSearchInput(newInputValue)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label=""
                        placeholder={t("patients:search.selectDoctor")}
                        variant="outlined"
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingDoctors ? (
                                <CircularProgress size={16} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "var(--background)",
                            paddingTop: "1px !important",
                            paddingBottom: "1px !important",
                          },
                        }}
                      />
                    )}
                    PaperComponent={(props) => (
                      <Paper
                        {...props}
                        className="dark:bg-slate-800 dark:text-slate-100"
                      />
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("clinic:patientRegistration.genderLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                      disabled={currentIsLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="female">
                          {t("clinic:patientRegistration.female")}
                        </SelectItem>
                        <SelectItem value="male">
                          {t("clinic:patientRegistration.male")}
                        </SelectItem>
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
                    <FormLabel>
                      {t("clinic:patientRegistration.companyLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={isLoadingCompanies || currentIsLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={t(
                              "clinic:patientRegistration.selectCompany"
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t("common:none")}</SelectItem>
                        {companies?.map((comp) => (
                          <SelectItem key={comp.id} value={String(comp.id)}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>{t("clinic:patientRegistration.ageLabel")}</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={control}
                  name="age_year"
                  render={({ field }) => (
                    <Input
                      className="h-9"
                      type="number"
                      placeholder={t(
                        "clinic:patientRegistration.ageYearsPlaceholder"
                      )}
                      {...field}
                      value={field.value || ""}
                      disabled={currentIsLoading}
                    />
                  )}
                />
                <FormField
                  control={control}
                  name="age_month"
                  render={({ field }) => (
                    <Input
                      className="h-9"
                      type="number"
                      placeholder={t(
                        "clinic:patientRegistration.ageMonthsPlaceholder"
                      )}
                      {...field}
                      value={field.value || ""}
                      disabled={currentIsLoading}
                    />
                  )}
                />
                <FormField
                  control={control}
                  name="age_day"
                  render={({ field }) => (
                    <Input
                      className="h-9"
                      type="number"
                      placeholder={t(
                        "clinic:patientRegistration.ageDaysPlaceholder"
                      )}
                      {...field}
                      value={field.value || ""}
                      disabled={currentIsLoading}
                    />
                  )}
                />
              </div>
              <FormMessage>
                {form.formState.errors.age_year?.message ||
                  form.formState.errors.age_month?.message ||
                  form.formState.errors.age_day?.message}
              </FormMessage>
            </FormItem>

            {isCompanySelected && (
              <Card className="p-3 pt-2 mt-4 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10">
                <CardDescription className="text-xs mb-2 text-primary font-medium">
                  {t("patients:insuranceDetailsSectionTitle")}
                </CardDescription>
                <div className="space-y-3">
                  <FormField
                    control={control}
                    name="insurance_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("patients:fields.insuranceNo")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            className="h-8 text-xs"
                            disabled={currentIsLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="subcompany_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("patients:fields.subCompany")}
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={isLoadingSubcompanies || currentIsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs flex-grow">
                                <SelectValue
                                  placeholder={t(
                                    "patients:fields.selectSubCompany"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("common:none")}
                              </SelectItem>
                              {subcompanies?.map((sub) => (
                                <SelectItem key={sub.id} value={String(sub.id)}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddSubcompanyDialog
                            onSubcompanyAdded={handleSubcompanyAdded}
                            companyId={companyId ? Number(companyId) : null}
                          />
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="company_relation_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("patients:fields.relation")}
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={isLoadingRelations || currentIsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs flex-grow">
                                <SelectValue
                                  placeholder={t(
                                    "patients:fields.selectRelation"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("common:none")}
                              </SelectItem>
                              {companyRelations?.map((rel) => (
                                <SelectItem key={rel.id} value={String(rel.id)}>
                                  {rel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddCompanyRelationDialog
                            onCompanyRelationAdded={handleRelationAdded}
                            companyId={companyId ? Number(companyId) : null}
                          />
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={currentIsLoading}
              >
                {registrationMutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
                {t("clinic:patientRegistration.registerButton")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

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
    </>
  );
};
export default LabRegistrationForm;
