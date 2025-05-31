// src/pages/audit/AuditRecordPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import {
  Loader2,
  ArrowLeft,
  XSquare,
  Copy,
  FileWarning,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";

import type { AuditedPatientRecord, AuditStatus } from "@/types/auditing";
import type { UpdatePatientApiPayload } from "@/types/patients";
import {
  getOrCreateAuditRecordForVisit,
  updateAuditedPatientInfo,
  copyServicesToAuditRecord,
  verifyAuditRecord,
} from "@/services/insuranceAuditService";

import AuditedPatientInfoForm from "@/components/audit/AuditedPatientInfoForm";
import AuditedServicesTable from "@/components/audit/AuditedServicesTable";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const auditStatusSchema = z.object({
  status: z.enum(["verified", "needs_correction", "rejected"], {
    required_error: "Final audit status is required.",
  }),
  auditor_notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or less.")
    .optional()
    .nullable(),
});
type AuditStatusFormValues = z.infer<typeof auditStatusSchema>;

const AuditRecordPage: React.FC = () => {
  const { visitId: visitIdParam } = useParams<{ visitId: string }>();
  const visitId = Number(visitIdParam);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["audit", "common", "patients"]);
  const queryClient = useQueryClient();
  const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(true); // NEW for collapsible patient info

  const auditRecordQueryKey = ["auditRecordForVisit", visitId] as const;

  const {
    data: auditRecord,
    isLoading,
    error,
  } = useQuery<AuditedPatientRecord, Error>({
    queryKey: auditRecordQueryKey,
    queryFn: () => getOrCreateAuditRecordForVisit(visitId),
    enabled: !!visitId,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  console.log('Audit Record Data:', auditRecord);
  console.log('Audited Services:', auditRecord?.audited_requested_services);

  const auditStatusForm = useForm<AuditStatusFormValues>({
    resolver: zodResolver(auditStatusSchema),
    defaultValues: {
      status: undefined,
      auditor_notes: "",
    },
  });

  useEffect(() => {
    if (auditRecord) {
      auditStatusForm.reset({
        status:
          auditRecord.status && auditRecord.status !== "pending_review"
            ? (auditRecord.status as
                | "verified"
                | "needs_correction"
                | "rejected")
            : undefined,
        auditor_notes: auditRecord.auditor_notes || "",
      });
    }
  }, [auditRecord, auditStatusForm.reset]);

  const updatePatientInfoMutation = useMutation({
    mutationFn: (data: Partial<UpdatePatientApiPayload>) =>
      updateAuditedPatientInfo(auditRecord!.id, data),
    onSuccess: (updatedAuditRecord) => {
      toast.success(t("audit:patientInfo.updatedSuccess"));
      queryClient.setQueryData(auditRecordQueryKey, updatedAuditRecord);
    },
    onError: (err: ApiError) =>
      toast.error(
        err.response?.data?.message || t("common:error.updateFailed")
      ),
  });

  const copyServicesMutation = useMutation({
    mutationFn: () => copyServicesToAuditRecord(auditRecord!.id),
    onSuccess: (response) => {
      toast.success(response.message || t("audit:actions.copyServicesSuccess"));
      queryClient.invalidateQueries({ queryKey: auditRecordQueryKey });
    },
    onError: (err: ApiError) =>
      toast.error(
        err.response?.data?.message || t("common:error.operationFailed")
      ),
  });

  const verifyRecordMutation = useMutation({
    mutationFn: (data: AuditStatusFormValues) =>
      verifyAuditRecord(auditRecord!.id, {
        status: data.status as Exclude<AuditStatus, "all" | "pending_review">,
        auditor_notes: data.auditor_notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t("audit:actions.statusUpdatedSuccess"));
      queryClient.invalidateQueries({ queryKey: auditRecordQueryKey });
      queryClient.invalidateQueries({ queryKey: ["insuranceAuditList"] });
      navigate("/settings/insurance-audit");
    },
    onError: (err: ApiError) =>
      toast.error(
        err.response?.data?.message || t("common:error.operationFailed")
      ),
  });

  const handlePatientInfoSave = async (
    data: Partial<UpdatePatientApiPayload>
  ) => {
    if (!auditRecord) return;
    return updatePatientInfoMutation.mutateAsync(data); // Return promise for form state
  };

  if (isLoading && !auditRecord)
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <div className="container mx-auto py-6 text-center text-destructive">
        <p className="font-semibold">{t("common:error.loadFailed")}:</p>
        <p>{error.message}</p>
        <Button
          variant="outline"
          onClick={() => navigate("/settings/insurance-audit")}
          className="mt-4"
        >
          {t("common:backToList")}
        </Button>
      </div>
    );

  if (!auditRecord)
    return (
      <div className="container mx-auto py-6 text-center text-muted-foreground">
        {t("audit:recordNotFoundForVisit", { visitId })}
        <Button
          variant="outline"
          onClick={() => navigate("/settings/insurance-audit")}
          className="mt-4"
        >
          {t("common:backToList")}
        </Button>
      </div>
    );

  const canEditRecord =
    auditRecord.status === "pending_review" ||
    auditRecord.status === "needs_correction";
  const isFinalized =
    auditRecord.status === "verified" || auditRecord.status === "rejected";

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/settings/insurance-audit")}
        >
          <ArrowLeft className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("audit:backToListPage")}
        </Button>
        {auditRecord.audited_at && (
          <div className="text-xs text-muted-foreground">
            {t("audit:lastAudited")}:
            {format(parseISO(auditRecord.audited_at), "Pp", {
              locale: i18n.language.startsWith("ar") ? arSA : enUS,
            })}
            {t("common:by")} {auditRecord.auditor?.name || "N/A"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow">
        <div>
          <h1 className="text-xl font-bold">
            {t("audit:auditRecordPageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("audit:forPatientVisit", {
              patientName: auditRecord.patient?.name,
              visitId: auditRecord.doctor_visit_id,
            })}
          </p>
        </div>
        <Badge
          variant={
            auditRecord.status === "verified"
              ? "success"
              : auditRecord.status === "rejected"
              ? "destructive"
              : auditRecord.status === "needs_correction"
              ? "secondary"
              : "outline"
          }
        >
          {t(`audit:status.${auditRecord.status}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Patient Info & Services */}
        <div className="space-y-6">
          {/* === MODIFIED PATIENT INFO SECTION === */}
          <Collapsible open={isPatientInfoOpen} onOpenChange={setIsPatientInfoOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer flex flex-row justify-between items-center py-3">
                  <div>
                    <CardTitle>{t('audit:patientInfo.title')}</CardTitle>
                    <CardDescription>{t('audit:patientInfo.descriptionAudit')}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isPatientInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle Patient Info</span>
                  </Button>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent> {/* CardContent is now inside CollapsibleContent */}
                <CardContent className="pt-0 pb-4"> {/* Adjust padding if needed */}
                  <AuditedPatientInfoForm 
                    auditRecord={auditRecord} 
                    onSave={handlePatientInfoSave} 
                    disabled={!canEditRecord || verifyRecordMutation.isPending}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          {/* === END MODIFIED PATIENT INFO SECTION === */}

          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle>{t("audit:auditedServices.title")}</CardTitle>
                <CardDescription>
                  {t("audit:auditedServices.description")}
                </CardDescription>
              </div>
              {canEditRecord &&
                (!auditRecord.audited_requested_services ||
                  (Array.isArray(auditRecord.audited_requested_services) 
                    ? auditRecord.audited_requested_services.length === 0
                    : !auditRecord.audited_requested_services)) && (
                <Button
                  size="sm"
                  onClick={() => copyServicesMutation.mutate()}
                  disabled={copyServicesMutation.isPending}
                >
                  {copyServicesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                  ) : (
                    <Copy className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  )}
                  {t("audit:actions.copyServices")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {copyServicesMutation.isPending && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              <AuditedServicesTable
                auditRecordId={auditRecord.id}
                initialAuditedServices={Array.isArray(auditRecord.audited_requested_services) 
                  ? auditRecord.audited_requested_services 
                  : auditRecord.audited_requested_services ? [auditRecord.audited_requested_services] : []}
                disabled={!canEditRecord || verifyRecordMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Audit Actions & Notes */}
        <Card className="sticky top-20 lg:top-24">
          
          {/* Adjust top based on AppLayout header height */}
          <CardHeader>
            <CardTitle>{t("audit:submission.title")}</CardTitle>
            {isFinalized && (
              <CardDescription className="text-xs">
                {t("audit:submission.alreadyFinalized")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Form {...auditStatusForm}>
              <form
                onSubmit={auditStatusForm.handleSubmit((data) =>
                  verifyRecordMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={auditStatusForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("audit:submission.statusLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "pending_review"}
                        disabled={
                          !canEditRecord || verifyRecordMutation.isPending
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "audit:submission.selectStatusPlaceholder"
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="verified">
                            <ShieldCheck className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-green-500" />
                            {t("audit:status.verified")}
                          </SelectItem>
                          <SelectItem value="needs_correction">
                            <FileWarning className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-yellow-500" />
                            {t("audit:status.needs_correction")}
                          </SelectItem>
                          <SelectItem value="rejected">
                            <XSquare className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-red-500" />
                            {t("audit:status.rejected")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={auditStatusForm.control}
                  name="auditor_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("audit:submission.notesLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          rows={5}
                          placeholder={t("audit:submission.notesPlaceholder")}
                          disabled={
                            !canEditRecord || verifyRecordMutation.isPending
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !canEditRecord ||
                    verifyRecordMutation.isPending ||
                    !auditStatusForm.formState.isValid
                  }
                >
                  {verifyRecordMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                  )}
                  {t("audit:submission.submitButton")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default AuditRecordPage;
