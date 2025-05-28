import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale"; // For localized date formatting

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  UserCircle,
  FileText,
  Printer,
  AlertTriangle,
  Info,
  ClipboardList,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

import type { Patient } from "@/types/patients";
import type { LabRequest } from "@/types/visits";
import { getPatientById } from "@/services/patientService";
import { getFullLabRequestDetails } from "@/services/labRequestService"; // If fetching full details here
import type { ChildTestWithResult } from "@/types/labWorkflow";

interface StatusAndInfoPanelProps {
  patientId: number | null;
  // visitId: number | null; // Not directly used for fetching here, but good for context if needed
  selectedLabRequest: LabRequest | null; // The LabRequest object selected for result entry
  focusedChildTest: ChildTestWithResult | null; // NEW PROP

}

// Reusable Detail Row component
const DetailRowDisplay: React.FC<{
  label: string;
  value?: string | number | React.ReactNode | null;
  icon?: React.ElementType;
  valueClassName?: string;
  labelClassName?: string;
  titleValue?: string; // For long values that might be truncated
  className?: string;

}> = ({
  label,
  value,
  icon: Icon,
  valueClassName,
  labelClassName,
  titleValue,
  className
}) => {
  const { t } = useTranslation("common");
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] items-start gap-x-2 py-1.5",
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn("h-4 w-4 text-muted-foreground mt-0.5", labelClassName)}
        />
      ) : (
        <div className="w-4" />
      )}
      <div className="min-w-0">
        
        {/* For truncation */}
        <p className={cn("text-xs text-muted-foreground", labelClassName)}>
          {label}:
        </p>
        <div
          className={cn("text-sm font-medium truncate", valueClassName)}
          title={
            titleValue ||
            (typeof value === "string" || typeof value === "number"
              ? String(value)
              : undefined)
          }
        >
          {value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim() === "") ? (
            <span className="text-xs italic text-slate-400 dark:text-slate-500">
              {t("notAvailable_short", "N/A")}
            </span>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
};

const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  patientId,
  selectedLabRequest,
  focusedChildTest,
}) => {
  const { t, i18n } = useTranslation([
    "labResults",
    "common",
    "patients",
    "labTests",
    "payments",
  ]);
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const {
    data: patient,
    isLoading: isLoadingPatient,
    error: patientError,
  } = useQuery<Patient, Error>({
    queryKey: ["patientDetailsForInfoPanel", patientId],
    queryFn: async () => {
      if (!patientId)
        throw new Error(t("patients:validation.patientIdRequired"));
      return getPatientById(patientId);
    },
    enabled: !!patientId,
    retry: 1,
  });

  const isCompanyPatient = !!patient?.company_id;

  const getAgeString = (p?: Patient | null): string => {
    if (!p) return t("common:notAvailable_short");
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0)
      parts.push(`${p.age_year}${t("common:years_shortInitial")}`);
    if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0)
      parts.push(`${p.age_month}${t("common:months_shortInitial")}`);
    if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0)
      parts.push(`${p.age_day}${t("common:days_shortInitial")}`);
    if (
      parts.length === 0 &&
      (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)
    )
      return `0${t("common:days_shortInitial")}`; // For newborns
    return parts.length > 0 ? parts.join(" ") : t("common:notAvailable_short");
  };

  const calculateLabRequestBalance = (lr?: LabRequest | null): number => {
    if (!lr) return 0;
    const price = Number(lr.price) || 0;
    const itemSubTotal = price;
    const discountAmount =
      (itemSubTotal * (Number(lr.discount_per) || 0)) / 100;
    const enduranceAmount = Number(lr.endurance) || 0;
    const netPrice =
      itemSubTotal -
      discountAmount -
      (isCompanyPatient ? enduranceAmount : 0);
    return netPrice - (Number(lr.amount_paid) || 0);
  };

  const handlePrintSampleLabels = () =>
    toast.info(
      t("common:featureNotImplemented", {
        feature: t("labResults:statusInfo.printSampleLabels"),
      })
    );
  const handleViewReportPreview = () =>
    toast.info(
      t("common:featureNotImplemented", {
        feature: t("labResults:statusInfo.viewReportPreview"),
      })
    );

  if (!patientId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground text-center bg-card dark:bg-slate-800/50">
        <Info size={36} className="mb-3 opacity-40" />
        <p className="text-sm">{t("labResults:noInfoToShow")}</p>
        <p className="text-xs">
          {t("labResults:selectPatientFromQueueToSeeInfo")}
        </p>
      </div>
    );
  }

  const isDataLoading = isLoadingPatient && !patient;

  return (
    <ScrollArea className="h-full bg-card dark:bg-slate-800/50">
      <div className="p-3 space-y-3">
        {isDataLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("common:loadingDetails")}
            </p>
          </div>
        ) : patientError ? (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader className="pb-2 pt-3 items-center text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-1" />
              <CardTitle className="text-destructive text-sm font-semibold">
                {t("common:error.fetchFailed", {
                  entity: t("patients:entityName"),
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-destructive text-center pb-3">
              {patientError.message}
            </CardContent>
          </Card>
        ) : patient ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                {t("labResults:statusInfo.patientInfoTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <DetailRowDisplay
                label={t("patients:fields.name")}
                value={patient.name}
                valueClassName="text-primary font-semibold"
              />
              <DetailRowDisplay
                label={t("common:phone")}
                value={patient.phone}
              />
              <DetailRowDisplay
                label={t("common:gender")}
                value={t(`common:genderEnum.${patient.gender}`)}
              />
              <DetailRowDisplay
                label={t("common:age")}
                value={getAgeString(patient)}
              />
              {patient.company && (
                <DetailRowDisplay
                  label={t("patients:fields.company")}
                  value={patient.company.name}
                />
              )}
              {patient.insurance_no && (
                <DetailRowDisplay
                  label={t("patients:fields.insuranceNo")}
                  value={patient.insurance_no}
                />
              )}
              <DetailRowDisplay
                label={t("patients:fields.address")}
                value={patient.address}
                titleValue={patient.address || undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-900/20">
            <CardContent className="text-center py-6 text-amber-700 dark:text-amber-400">
              <Info className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm font-medium">
                {t("labResults:patientDataNotAvailable")}
              </p>
            </CardContent>
          </Card>
        )}
 {focusedChildTest && (
          <Card className="shadow-sm border-primary/50">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary"/> 
                {t('labResults:statusInfo.parameterDetails')}: {focusedChildTest.child_test_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <DetailRowDisplay 
                 label={t('labTests:childTests.form.normalRangeText')} 
                 value={focusedChildTest.normalRange || 
                        ((focusedChildTest.low !== null && focusedChildTest.low !== undefined) && 
                         (focusedChildTest.upper !== null && focusedChildTest.upper !== undefined) ? 
                         `${focusedChildTest.low} - ${focusedChildTest.upper}` : t('common:notSet'))
                       } 
              />
              <DetailRowDisplay label={t('labTests:childTests.form.unit')} value={focusedChildTest.unit?.name || focusedChildTest.unit_name} />
              {focusedChildTest.defval && <DetailRowDisplay label={t('labTests:childTests.form.defaultValue')} value={focusedChildTest.defval} />}
              {/* Add Critical Low/High if available on focusedChildTest */}
              {(focusedChildTest.lowest || focusedChildTest.max) && <Separator className="my-1"/>}
              {focusedChildTest.lowest && <DetailRowDisplay label={t('labTests:childTests.form.criticalLow')} value={String(focusedChildTest.lowest)} valueClassName="text-orange-600 font-bold"/>}
              {focusedChildTest.max && <DetailRowDisplay label={t('labTests:childTests.form.criticalHigh')} value={String(focusedChildTest.max)} valueClassName="text-red-600 font-bold"/>}
            </CardContent>
          </Card>
        )}
        {/* Lab Request Status Card */}
        {selectedLabRequest && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                {t("labResults:statusInfo.requestStatusTitle")}
              </CardTitle>
              <CardDescription
                className="text-xs truncate"
                title={selectedLabRequest.main_test?.main_test_name}
              >
                {selectedLabRequest.main_test?.main_test_name ||
                  t("common:test")}
                (ID: {selectedLabRequest.id})
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs">
              <DetailRowDisplay
                label={t("labResults:statusInfo.paymentStatus")}
                value={
                  selectedLabRequest.is_paid ? (
                    <Badge variant="success" className="text-xs px-1.5 py-0.5">
                      {t("payments:status.paid")}
                    </Badge>
                  ) : Number(selectedLabRequest.amount_paid) > 0 ? (
                    <Badge variant="info" className="text-xs px-1.5 py-0.5">
                      {t("payments:status.partiallyPaid")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {t("payments:status.unpaid")}
                    </Badge>
                  )
                }
              />
              <DetailRowDisplay
                label={t("labResults:statusInfo.sampleStatus")}
                value={
                  selectedLabRequest.no_sample ? (
                    <Badge
                      variant="destructive"
                      className="text-xs px-1.5 py-0.5"
                    >
                      {t("labResults:statusInfo.sampleNotCollected")}
                    </Badge>
                  ) : selectedLabRequest.sample_id ? (
                    <Badge variant="info" className="text-xs px-1.5 py-0.5">
                      {t("labResults:statusInfo.sampleCollectedWithId", {
                        id: selectedLabRequest.sample_id,
                      })}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {t("labResults:statusInfo.samplePending")}
                    </Badge>
                  )
                }
              />
              <DetailRowDisplay
                label={t("labResults:statusInfo.approvalStatus")}
                value={
                  selectedLabRequest.approve ? (
                    <Badge variant="success" className="text-xs px-1.5 py-0.5">
                      {t("labResults:statusInfo.approved")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {t("labResults:statusInfo.pendingApproval")}
                    </Badge>
                  )
                }
              />
              <Separator className="my-1.5" />
              <DetailRowDisplay
                label={t("common:price")}
                value={Number(selectedLabRequest.price).toFixed(1)}
              />
              {isCompanyPatient && (
                <DetailRowDisplay
                  label={t("labTests:table.endurance")}
                  value={Number(selectedLabRequest.endurance).toFixed(1)}
                />
              )}
              <DetailRowDisplay
                label={t("labTests:table.discountPercentageShort")}
                value={`${selectedLabRequest.discount_per || 0}%`}
              />
              <DetailRowDisplay
                label={t("payments:amountPaid")}
                value={Number(selectedLabRequest.amount_paid).toFixed(1)}
                valueClassName="text-green-600 dark:text-green-400 font-semibold"
              />
              <DetailRowDisplay
                label={t("payments:balanceDue")}
                value={calculateLabRequestBalance(selectedLabRequest).toFixed(1)}
                valueClassName={cn(
                  "font-bold",
                  calculateLabRequestBalance(selectedLabRequest) > 0.09
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              />
              {selectedLabRequest.created_at && (
                <DetailRowDisplay
                  label={t("common:requestedAt")}
                  value={format(
                    parseISO(selectedLabRequest.created_at),
                    "Pp",
                    { locale: dateLocale }
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}
 {/* NEW: Focused Child Test Info Card */}

        {/* Actions Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {t("labResults:statusInfo.actionsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={handlePrintSampleLabels}
              disabled={!selectedLabRequest}
            >
              <Printer className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
              {t("labResults:statusInfo.printSampleLabels")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={handleViewReportPreview}
              disabled={!selectedLabRequest}
            >
              <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
              {t("labResults:statusInfo.viewReportPreview")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default StatusAndInfoPanel;
