// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  UserCircle,
  FileText,
  Printer,
  ClipboardList,
  Receipt,
  ChevronDown,
  ChevronUp,
  GripVertical,
  BarChart3,
  Palette,
  Hash,
  User,
  CalendarDays,
  Briefcase,
  IdCard,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { Patient } from "@/types/patients";
import type { LabRequest } from "@/types/visits";
import { getPatientById } from "@/services/patientService";
import type { ChildTestWithResult } from "@/types/labWorkflow";
import {
  getPanelOrder,
  savePanelOrder,
  getPanelCollapsedState,
  savePanelCollapsedState,
} from "@/lib/panel-settings-store";
import type { PanelId } from "@/lib/panel-settings-store";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import apiClient from "@/services/api";

interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null;
  selectedLabRequest: LabRequest | null;
  focusedChildTest: ChildTestWithResult | null;
}

// Reusable Detail Row
const DetailRowDisplay: React.FC<{
  label: string;
  value?: string | number | React.ReactNode | null;
  icon?: React.ElementType;
  valueClassName?: string;
  titleValue?: string;
  className?: string;
}> = ({ label, value, icon: Icon, valueClassName, titleValue, className }) => {
  const { t } = useTranslation("common");
  return (
    <div
      className={cn(
        "grid grid-cols-[20px_auto_1fr] items-start gap-x-2 py-1",
        className
      )}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      ) : (
        <div className="w-3.5" />
      )}
      <p className="text-xs text-muted-foreground min-w-[80px] whitespace-nowrap">
        {label}:
      </p>
      <div
        className={cn("text-xs font-medium truncate", valueClassName)}
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
          <span className="italic text-slate-400 dark:text-slate-500">
            {t("notAvailable_short", "N/A")}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
};

// --- Sortable Collapsible Card Item ---
interface SortableInfoCardProps {
  id: PanelId;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  defaultCollapsed?: boolean;
  cardClassName?: string;
}

const SortableInfoCard: React.FC<SortableInfoCardProps> = ({
  id,
  title,
  icon: Icon,
  children,
  isLoading,
  error,
  defaultCollapsed = false,
  cardClassName,
}) => {
  const { t } = useTranslation("common");
  const [isCollapsed, setIsCollapsed] = useState(() =>
    getPanelCollapsedState(id, defaultCollapsed)
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      savePanelCollapsedState(id, !prev);
      return !prev;
    });
  };

  useEffect(() => {
    const storedState = getPanelCollapsedState(id, defaultCollapsed);
    if (storedState !== isCollapsed) {
      setIsCollapsed(storedState);
    }
  }, [id, defaultCollapsed]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", cardClassName)}
    >
      <Collapsible
        open={!isCollapsed}
        onOpenChange={handleToggleCollapse}
      >
        <Card
          className={cn(
            "shadow-md overflow-hidden",
            isDragging && "ring-2 ring-primary"
          )}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {canDrag && (
                  <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 -ml-1"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <Icon className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-3 pt-1 pb-2 text-xs">
              {isLoading ? (
                <div className="py-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-destructive py-2 text-center text-xs">
                  {t("error.loadFailed")}: {error.message}
                </div>
              ) : (
                children
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

// Global state to enable/disable dragging
const canDrag = true;

const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  patientId,
  visitId,
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
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(getPanelOrder);

  // State for PDF Preview
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfFileName, setPdfFileName] = useState('document.pdf');
  const {
    data: patient,
    isLoading: isLoadingPatient,
    error: patientError,
  } = useQuery<Patient, Error>({
    queryKey: ["patientDetailsForInfoPanel", patientId],
    queryFn: () =>
      patientId
        ? getPatientById(patientId)
        : Promise.reject(new Error("Patient ID required")),
    enabled: !!patientId,
  });

  const isCompanyPatient = !!patient?.company_id;

  const getAgeString = useCallback(
    (p?: Patient | null): string => {
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
        return `0${t("common:days_shortInitial")}`;
      return parts.length > 0
        ? parts.join(" ")
        : t("common:notAvailable_short");
    },
    [t]
  );
  const generateAndShowPdf = async (
    title: string,
    fileNamePrefix: string,
    fetchFunction: () => Promise<Blob>
  ) => {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfPreviewTitle(title);
    setIsPdfPreviewOpen(true);

    try {
      const blob = await fetchFunction();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      const patientNameSanitized = patient?.name.replace(/[^A-Za-z0-9\-\_]/g, '_') || 'patient';
      setPdfFileName(`${fileNamePrefix}_${visitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error: any) {
      console.error(`Error generating ${title}:`, error);
      toast.error(t('common:error.generatePdfFailed'), {
        description: error.response?.data?.message || error.message,
      });
      setIsPdfPreviewOpen(false); // Close dialog on error
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!visitId) return;
    generateAndShowPdf(
      t('common:printReceiptDialogTitle', { visitId }),
      'LabReceipt',
      () => apiClient.get(`/visits/${visitId}/lab-thermal-receipt/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const handlePrintSampleLabels = () => {
    if (!visitId) return; // Needs visit context for all its lab requests
    generateAndShowPdf(
      t('labResults:statusInfo.printSampleLabelsDialogTitle'),
      'SampleLabels',
      () => apiClient.get(`/visits/${visitId}/lab-sample-labels/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const handleViewReportPreview = () => {
    if (!visitId) return;
    generateAndShowPdf(
      t('labResults:statusInfo.viewReportPreviewDialogTitle'),
      'LabReport',
      () => apiClient.get(`/visits/${visitId}/lab-report/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const calculateLabRequestBalance = useCallback(
    (lr?: LabRequest | null): number => {
      if (!lr) return 0;
      const price = Number(lr.price) || 0;
      const count = 1; // LabRequest doesn't have count property, using default
      const itemSubTotal = price * count;
      const discountAmount =
        (itemSubTotal * (Number(lr.discount_per) || 0)) / 100;
      const enduranceAmount = Number(lr.endurance) || 0;
      const netPrice =
        itemSubTotal -
        discountAmount -
        (isCompanyPatient ? enduranceAmount * count : 0);
      return netPrice - (Number(lr.amount_paid) || 0);
    },
    [isCompanyPatient]
  );

  const getPaymentStatusBadge = (lr: LabRequest) => {
    const balance = calculateLabRequestBalance(lr);
    if (balance <= 0.09) {
      return <Badge variant="default" className="bg-green-500 text-white text-xs">Paid</Badge>;
    } else {
      return <Badge variant="destructive" className="text-xs">Pending</Badge>;
    }
  };

  const getSampleStatusBadge = (lr: LabRequest) => {
    // Check if sample is collected based on available properties
    if (lr.sample_id && lr.sample_id.trim() !== "") {
      return <Badge variant="default" className="bg-blue-500 text-white text-xs">Collected</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getApprovalStatusBadge = (lr: LabRequest) => {
    if (lr.approve) {
      return <Badge variant="default" className="bg-purple-500 text-white text-xs">Authorized</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

 

 


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPanelOrder((items) => {
        const oldIndex = items.indexOf(active.id as PanelId);
        const newIndex = items.indexOf(over.id as PanelId);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        savePanelOrder(newOrder);
        return newOrder;
      });
    }
  };

  const panelComponents: Record<PanelId, React.ReactNode> = {
    patientInfo: (
      <SortableInfoCard
        id="patientInfo"
        title={t("labResults:statusInfo.patientInfoTitle")}
        icon={UserCircle}
        isLoading={isLoadingPatient && !patient}
        error={patientError}
        cardClassName="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/40"
      >
        {patient ? (
          <>
           <DetailRowDisplay 
              label={t("common:visitIdShort")} 
              value={visitId} 
              icon={Hash} 
              valueClassName="text-lg font-bold text-sky-600 dark:text-sky-400" 
            />
            <DetailRowDisplay
              label={t("patients:fields.name")}
              value={patient.name}
              valueClassName="text-primary font-semibold"
            />
             <DetailRowDisplay 
              label={t("common:visitDate")} 
              value={patient.created_at ? format(parseISO(patient.created_at as unknown as string), "PPP", { locale: dateLocale }) : 'N/A'}
              icon={CalendarDays}
            />
            {patient.doctor && (
                <DetailRowDisplay 
                    label={t("common:doctor")} 
                    value={patient.doctor.name} 
                    icon={User} 
                />
            )}
            <DetailRowDisplay label={t("common:phone")} value={patient.phone} />
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
               {/* Company Info if applicable */}
               {isCompanyPatient && patient.company && (
              <>
                <Separator className="my-2" />
                <DetailRowDisplay 
                    label={t("patients:fields.company")} 
                    value={patient.company.name} 
                    icon={Briefcase} 
                    valueClassName="font-semibold"
                />
                {patient.insurance_no && 
                    <DetailRowDisplay 
                        label={t("patients:fields.insuranceNo")} 
                        value={patient.insurance_no} 
                        icon={IdCard}
                    />
                }
                {patient.subcompany && 
                    <DetailRowDisplay 
                        label={t("patients:fields.subCompanyShort")} 
                        value={patient.subcompany.name} 
                        icon={Tags}
                    />
                }
                {patient.company_relation && 
                    <DetailRowDisplay 
                        label={t("patients:fields.relationShort")} 
                        value={patient.company_relation.name} 
                        icon={Tags}
                    />
                }
                {patient.guarantor && 
                    <DetailRowDisplay 
                        label={t("patients:fields.guarantor")} 
                        value={patient.guarantor} 
                    />
                }
                </>
            )}
            <DetailRowDisplay
              label={t("patients:fields.address")}
              value={patient.address}
              titleValue={patient.address || undefined}
            />
          </>
        ) : !isLoadingPatient ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            {t("labResults:patientDataNotAvailable")}
          </p>
        ) : null}
      </SortableInfoCard>
    ),
    requestStatus: selectedLabRequest ? (
      <SortableInfoCard
        id="requestStatus"
        title={t("labResults:statusInfo.requestStatusTitle")}
        icon={ClipboardList}
        defaultCollapsed={false}
        cardClassName="bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/40"
      >
        <p
          className="text-[11px] text-muted-foreground mb-1 truncate"
          title={selectedLabRequest.main_test?.main_test_name}
        >
          {selectedLabRequest.main_test?.main_test_name || t("common:test")}{" "}
          (ID: {selectedLabRequest.id})
        </p>
        <DetailRowDisplay
          label={t("labResults:statusInfo.paymentStatus")}
          value={getPaymentStatusBadge(selectedLabRequest)}
        />
        <DetailRowDisplay
          label={t("labResults:statusInfo.sampleStatus")}
          value={getSampleStatusBadge(selectedLabRequest)}
        />
        <DetailRowDisplay
          label={t("labResults:statusInfo.approvalStatus")}
          value={getApprovalStatusBadge(selectedLabRequest)}
        />
        <Separator className="my-1" />
        <DetailRowDisplay
          label={t("common:price")}
          value={Number(selectedLabRequest.price).toFixed(1)}
        />
        {isCompanyPatient && (
          <DetailRowDisplay
            label={t("labTests:table.endurance")}
            value={Number(selectedLabRequest.endurance || 0).toFixed(1)}
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
            value={format(parseISO(selectedLabRequest.created_at), "Pp", {
              locale: dateLocale,
            })}
          />
        )}
      </SortableInfoCard>
    ) : null,
    parameterDetails: focusedChildTest ? (
      <SortableInfoCard
        id="parameterDetails"
        title={`${t("labResults:statusInfo.parameterDetails")}: ${
          focusedChildTest.child_test_name
        }`}
        icon={BarChart3}
        defaultCollapsed={false}
        cardClassName="bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/40"
      >
        <DetailRowDisplay
          label={t("labTests:childTests.form.normalRangeText")}
          value={
            focusedChildTest.normalRange ||
            (focusedChildTest.low !== null && focusedChildTest.upper !== null
              ? `${focusedChildTest.low} - ${focusedChildTest.upper}`
              : t("common:notSet"))
          }
        />
        <DetailRowDisplay
          label={t("labTests:childTests.form.unit")}
          value={focusedChildTest.unit?.name || focusedChildTest.unit_name}
        />
        {focusedChildTest.defval && (
          <DetailRowDisplay
            label={t("labTests:childTests.form.defaultValue")}
            value={focusedChildTest.defval}
          />
        )}
        {(focusedChildTest.lowest || focusedChildTest.max) && (
          <Separator className="my-1" />
        )}
        {focusedChildTest.lowest && (
          <DetailRowDisplay
            label={t("labTests:childTests.form.criticalLow")}
            value={String(focusedChildTest.lowest)}
            valueClassName="text-orange-600 font-bold"
          />
        )}
        {focusedChildTest.max && (
          <DetailRowDisplay
            label={t("labTests:childTests.form.criticalHigh")}
            value={String(focusedChildTest.max)}
            valueClassName="text-red-600 font-bold"
          />
        )}
      </SortableInfoCard>
    ) : null,
  };

  if (!patientId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          {t("labResults:selectPatientToViewInfo")}
        </p>
      </div>
    );
  }

  return (
  <>
  <ScrollArea className="h-full bg-slate-50 dark:bg-slate-800/30">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={panelOrder.map(id => id)} strategy={verticalListSortingStrategy}>
            <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              {panelOrder.map(panelId => panelComponents[panelId]).filter(Boolean)}
              
              <Card className="shadow-sm bg-slate-100 dark:bg-slate-900/40">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    {t("labResults:statusInfo.actionsTitle")}
                  </CardTitle>
                </CardHeader>
                {console.log(visitId,'visitId')}
                <CardContent className="space-y-1.5">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={handlePrintReceipt} disabled={!visitId || isGeneratingPdf}>
                    <Receipt className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" /> {t("common:printReceipt", "Print Lab Receipt")}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={handlePrintSampleLabels} disabled={!visitId || isGeneratingPdf}>
                    <Printer className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />{t("labResults:statusInfo.printSampleLabels")}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={handleViewReportPreview} disabled={!visitId || isGeneratingPdf}>
                    <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />{t("labResults:statusInfo.viewReportPreview")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      <PdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={(open) => {
            setIsPdfPreviewOpen(open);
            if (!open && pdfUrl) { // Clean up URL when dialog is manually closed
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        }}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
    </>
  );
};

export default StatusAndInfoPanel;
