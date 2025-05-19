// src/pages/doctors/DoctorFormPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // For calc_insurance
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import type {
  DoctorFormData,
  Doctor,
  Specialist,
  FinanceAccount,
} from "@/types/doctors";
import {
  createDoctor,
  updateDoctor,
  getDoctorById,
  getSpecialistsList,
  getFinanceAccountsList,
  DoctorFormMode,
} from "@/services/doctorService";
import AddSpecialistDialog from "./AddSpecialistDialog";

interface DoctorFormPageProps {
  mode: DoctorFormMode;
}

const getDoctorFormSchema = (t: Function) =>
  z.object({
    name: z.string().min(1, {
      message: t("common:validation.required", {
        field: t("doctors:form.nameLabel"),
      }),
    }),
    phone: z.string().min(1, {
      message: t("common:validation.required", {
        field: t("doctors:form.phoneLabel"),
      }),
    }),
    specialist_id: z
      .string({
        required_error: t("common:validation.required", {
          field: t("doctors:form.specialistLabel"),
        }),
      })
      .min(1, {
        message: t("common:validation.required", {
          field: t("doctors:form.specialistLabel"),
        }),
      }),
    cash_percentage: z
      .string()
      .refine(
        (val) =>
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100,
        { message: "0-100" }
      ),
    company_percentage: z
      .string()
      .refine(
        (val) =>
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100,
        { message: "0-100" }
      ),
    static_wage: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
        message: ">= 0",
      }),
    lab_percentage: z
      .string()
      .refine(
        (val) =>
          !isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100,
        { message: "0-100" }
      ),
    start: z.string().refine((val) => !isNaN(parseInt(val)), {
      message: t("common:validation.mustBeNumber"),
    }),
    image_file: z.any().optional(), // Now fully optional
    image: z.string().nullable().optional(),
    finance_account_id: z.string().optional(),
    finance_account_id_insurance: z.string().optional(),
    calc_insurance: z.boolean(),
  });

type DoctorFormValues = z.infer<ReturnType<typeof getDoctorFormSchema>>;

const DoctorFormPage: React.FC<DoctorFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(["doctors", "common"]);
  const navigate = useNavigate();
  const { doctorId } = useParams<{ doctorId?: string }>();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEditMode = mode === DoctorFormMode.EDIT;
  const doctorFormSchema = getDoctorFormSchema(t);
  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery<
    Specialist[],
    Error
  >({
    queryKey: ["specialistsList"],
    queryFn: getSpecialistsList,
  });
  const {
    data: doctorData,
    isLoading: isLoadingDoctor,
    isFetching: isFetchingDoctor,
  } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctorById(Number(doctorId)).then((res) => res.data),
    enabled: isEditMode && !!doctorId,
  });

  // Handle image preview side effect when doctorData changes
  useEffect(() => {
    if (doctorData?.image) {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.replace("/api", "/storage/") ||
        "/storage/";
      setImagePreview(
        doctorData.image.startsWith("http")
          ? doctorData.image
          : `${baseUrl}${doctorData.image}`
      );
    }
  }, [doctorData]);


  const { data: financeAccounts, isLoading: isLoadingFinanceAccounts } =
    useQuery<FinanceAccount[], Error>({
      queryKey: ["financeAccountsList"],
      queryFn: getFinanceAccountsList,
    });

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      specialist_id: undefined,
      cash_percentage: "0",
      company_percentage: "0",
      static_wage: "0",
      lab_percentage: "0",
      start: "0",
      image_file: undefined,
      image: null,
      finance_account_id: undefined,
      finance_account_id_insurance: undefined,
      calc_insurance: false,
    },
  });
  const { control, handleSubmit, reset, watch, setValue, formState } = form;
  // console.log("Form State:", doctorData?.specialist_id); // Debugging line
  // Populate form with doctorData when it loads in edit mode
  useEffect(() => {
    console.log("useEffect ran");
    if (isEditMode && doctorData) {
      console.log(doctorData.specialist_id, "doctorData.specialist_id");
      reset({
        name: doctorData.name,
        phone: doctorData.phone,
        specialist_id: String(doctorData.specialist_id),
        cash_percentage: String(doctorData.cash_percentage),
        company_percentage: String(doctorData.company_percentage),
        static_wage: String(doctorData.static_wage),
        lab_percentage: String(doctorData.lab_percentage),
        start: String(doctorData.start),
        image: doctorData.image || null, // Store existing image path
        image_file: undefined, // Clear any stale file object
        finance_account_id: doctorData.finance_account_id
          ? String(doctorData.finance_account_id)
          : undefined,
        finance_account_id_insurance: String(
          doctorData.finance_account_id_insurance
        ),
        calc_insurance: doctorData.calc_insurance,
      });
    }
  }, [isEditMode, doctorData, reset]);

  const imageFileWatch = watch("image_file");
  useEffect(() => {
    if (imageFileWatch && imageFileWatch instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(imageFileWatch);
    } else if (!imageFileWatch && isEditMode && doctorData?.image) {
      // Revert to existing image if new file is removed
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.replace("/api", "/storage/") ||
        "/storage/";
      setImagePreview(
        doctorData.image.startsWith("http")
          ? doctorData.image
          : `${baseUrl}${doctorData.image}`
      );
    } else if (!imageFileWatch) {
      setImagePreview(null);
    }
  }, [imageFileWatch, isEditMode, doctorData]);

  const mutation = useMutation({
    mutationFn: (data: DoctorFormData) =>
      isEditMode && doctorId
        ? updateDoctor(Number(doctorId), data)
        : createDoctor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] }); // Refetch doctors list
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] }); // Refetch this doctor if editing
      navigate("/doctors"); // Redirect to doctors list
    },
    onError: (error: any) => {
      console.error("Save error:", error.response?.data || error.message);
      toast.error(
        error.response?.data?.message || t("doctors:form.doctorSaveError")
      );
    },
  });

  const onSubmit = (data: DoctorFormValues) => {
    // Ensure numeric fields are numbers, not strings, if backend expects numbers
    const submissionData: DoctorFormData = {
      ...data,
      cash_percentage: String(data.cash_percentage), // Keep as string for FormData
      company_percentage: String(data.company_percentage),
      static_wage: String(data.static_wage),
      lab_percentage: String(data.lab_percentage),
      start: String(data.start),
      // image_file is already File or undefined
      // specialist_id, finance_account_id, finance_account_id_insurance are already strings
    };
    // if (!isEditMode && !data.image_file) {
    //     form.setError("image_file", { type: "manual", message: t('common:validation.required', { field: t('doctors:form.imageLabel')}) });
    //     return;
    // }
    mutation.mutate(submissionData);
  };

  const handleSpecialistAdded = (newSpecialist: Specialist) => {
    // Optionally, automatically select the newly added specialist
    console.log(watch("specialist_id"), newSpecialist.id);
    // Ensure newSpecialist.id is a string if your form field expects a string
    setValue("specialist_id", String(newSpecialist.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
    // The specialistsList query is already invalidated by the dialog, so the dropdown will update.
  };
  const isLoading =
    isLoadingDoctor ||
    isLoadingSpecialists ||
    isLoadingFinanceAccounts ||
    mutation.isLoading;

  if (isEditMode && isLoadingDoctor)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" /> {t("common:loading")}
      </div>
    );
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditMode
            ? t("doctors:editDoctorTitle")
            : t("doctors:createDoctorTitle")}
        </CardTitle>
        <CardDescription>{t("common:form.fillDetails")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("doctors:form.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("doctors:form.namePlaceholder")}
                        {...field}
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
                    <FormLabel>{t("doctors:form.phoneLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t("doctors:form.phonePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="specialist_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("doctors:form.specialistLabel")}</FormLabel>
                  <div className="flex items-center gap-2">
                    {console.log("Selected specialist_id:", field.value)}
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      // defaultValue={'1'} // Important for react-hook-form with Select
                      disabled={isLoadingSpecialists || formState.isSubmitting}
                    >
                      <FormControl className="flex-grow">
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("doctors:form.selectSpecialist")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingSpecialists ? (
                          <SelectItem value="loading" disabled>
                            {t("common:loading")}
                          </SelectItem>
                        ) : (
                          specialists?.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {/* Add the Dialog Trigger Here */}
                    <AddSpecialistDialog
                      onSpecialistAdded={handleSpecialistAdded}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={control}
                name="cash_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("doctors:form.cashPercentageLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="company_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("doctors:form.companyPercentageLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="static_wage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("doctors:form.staticWageLabel")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="lab_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("doctors:form.labPercentageLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("doctors:form.startLabel")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="image_file"
              render={({ field: { onChange, value, ...restField } }) => (
                <FormItem>
                  <FormLabel>{t("doctors:form.imageLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        onChange(e.target.files ? e.target.files[0] : null)
                      }
                      {...restField}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                  </FormControl>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 h-32 w-32 object-cover rounded-md"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="finance_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("doctors:form.financeAccountLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("doctors:form.selectFinanceAccount")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingFinanceAccounts ? (
                          <SelectItem value="loading" disabled>
                            {t("common:loading")}
                          </SelectItem>
                        ) : (
                          financeAccounts?.map((fa) => (
                            <SelectItem key={fa.id} value={String(fa.id)}>
                              {fa.name} ({fa.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="finance_account_id_insurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("doctors:form.financeAccountInsuranceLabel")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      defaultValue={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("doctors:form.selectFinanceAccount")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingFinanceAccounts ? (
                          <SelectItem value="loading" disabled>
                            {t("common:loading")}
                          </SelectItem>
                        ) : (
                          financeAccounts?.map((fa) => (
                            <SelectItem key={fa.id} value={String(fa.id)}>
                              {fa.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="calc_insurance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 rtl:space-x-reverse">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t("doctors:form.calcInsuranceLabel")}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/doctors")}
              >
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("doctors:form.saveButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DoctorFormPage;
