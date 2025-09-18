// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
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

import { Box, Card as MuiCard, CardContent as MuiCardContent, Typography, Button as MuiButton, Chip, Divider, Collapse, CircularProgress, IconButton } from "@mui/material";
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
import type { ChildTestWithResult, PatientLabQueueItem } from "@/types/labWorkflow";
import {
  getPanelOrder,
  savePanelOrder,
  getPanelCollapsedState,
  savePanelCollapsedState,
} from "@/lib/panel-settings-store";
import type { PanelId } from "@/lib/panel-settings-store";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import apiClient from "@/services/api";
// i18n removed
import SendReportWhatsAppDialog from "./dialog/SendReportWhatsAppDialog";
import { WhatsApp } from "@mui/icons-material";
import { Separator } from "@/components/ui/separator";
import PatientDetailsLabEntry from "@/components/lab/workstation/PatientDetailsLabEntry";

// Direct Arabic labels (translations removed)
const AR = {
  notAvailableShort: "غير متوفر",
  loadFailed: "فشل التحميل",
  patientInfoTitle: "معلومات المريض",
  patientDataNotAvailable: "بيانات المريض غير متوفرة",
  visitIdShort: "رقم الزيارة",
  name: "الاسم",
  visitDate: "تاريخ الزيارة",
  doctor: "الطبيب",
  phone: "الهاتف",
  gender: "النوع",
  age: "العمر",
  company: "الشركة",
  insuranceNo: "رقم التأمين",
  subCompanyShort: "الفرع",
  relationShort: "القرابة",
  guarantor: "الضامن",
  address: "العنوان",
  requestStatusTitle: "حالة الطلب",
  paymentStatus: "حالة الدفع",
  sampleStatus: "حالة العينة",
  approvalStatus: "حالة الاعتماد",
  price: "السعر",
  endurance: "التحمل",
  discountPercentageShort: "خصم %",
  amountPaid: "المدفوع",
  balanceDue: "المتبقي",
  requestedAt: "تاريخ الطلب",
  parameterDetails: "تفاصيل التحليل",
  normalRangeText: "المدى الطبيعي",
  notSet: "غير محدد",
  unit: "الوحدة",
  defaultValue: "القيمة الافتراضية",
  criticalLow: "حد منخفض خطير",
  criticalHigh: "حد مرتفع خطير",
  selectPatientToViewInfo: "اختر مريضاً لعرض المعلومات",
  actionsTitle: "إجراءات",
  sendReceiptShort: "إرسال الإيصال في واتساب",
  sendReportShort: "إرسال التقرير في واتساب",
  printReceipt: "طباعة إيصال المختبر",
  printSampleLabels: "طباعة ملصقات العينات",
  resultsAreLocked: "النتائج مقفلة",
  viewReportPreview: "معاينة التقرير",
  test: "فحص",
  receiptDialogTitle: (visitId: number) => `إيصال الزيارة رقم ${visitId}`,
};

interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null;
  selectedLabRequest: LabRequest | null;
  focusedChildTest: ChildTestWithResult | null;
  patientLabQueueItem: PatientLabQueueItem | null;
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
            {AR.notAvailableShort}
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
  // using local t shim
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
    <div ref={setNodeRef} style={style} className={cn("touch-none", cardClassName)}>
      <MuiCard dir={"rtl"} className={cn("shadow-md overflow-hidden", isDragging && "ring-2 ring-primary")}>
        <Box className="flex flex-row items-center justify-between py-2 px-3 hover:bg-muted/50 transition-colors">
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
            <Typography variant="subtitle2" className="text-sm font-semibold">{title}</Typography>
          </div>
          <IconButton size="small" onClick={handleToggleCollapse} className="h-6 w-6">
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </IconButton>
        </Box>
        <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
          <MuiCardContent className="px-3 pt-1 pb-2 text-xs">
            {isLoading ? (
              <div className="py-4 text-center">
                <CircularProgress size={20} className="text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-destructive py-2 text-center text-xs">
                {AR.loadFailed}: {error.message}
              </div>
            ) : (
              children
            )}
          </MuiCardContent>
        </Collapse>
      </MuiCard>
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
  patientLabQueueItem,
}) => {
  const dateLocale = arSA;
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
  const resultsLocked = patient?.result_is_locked || false;

  const isCompanyPatient = !!patient?.company_id;

  const getAgeString = useCallback(
    (p?: Patient | null): string => {
      if (!p) return AR.notAvailableShort;
      const parts = [];
      if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0)
        parts.push(`${p.age_year}س`);
      if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0)
        parts.push(`${p.age_month}ش`);
      if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0)
        parts.push(`${p.age_day}ي`);
      if (
        parts.length === 0 &&
        (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)
      )
        return `0ي`;
      return parts.length > 0
        ? parts.join(" ")
        : AR.notAvailableShort;
    },
    []
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
      const patientNameSanitized = patient?.name.replace(/[^A-Za-z0-9-_]/g, '_') || 'patient';
      setPdfFileName(`${fileNamePrefix}_${visitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error: any) {
      console.error(`Error generating ${title}:`, error);
      toast.error("حدث خطأ أثناء إنشاء ملف PDF", {
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
      AR.receiptDialogTitle(visitId),
      'LabReceipt',
      () => apiClient.get(`/visits/${visitId}/lab-thermal-receipt/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const handlePrintSampleLabels = () => {
    if (!visitId) return; // Needs visit context for all its lab requests
    generateAndShowPdf(
      "طباعة ملصقات العينات",
      'SampleLabels',
      () => apiClient.get(`/visits/${visitId}/lab-sample-labels/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  };

  const handleViewReportPreview = () => {
    if (!visitId) return;
    generateAndShowPdf(
      "معاينة تقرير المختبر",
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
      return <Chip size="small" label="مدفوع" color="success" className="text-xs" />;
    } else {
      return <Chip size="small" label="قيد الدفع" color="error" variant="outlined" className="text-xs" />;
    }
  };

  const getSampleStatusBadge = (lr: LabRequest) => {
    // Check if sample is collected based on available properties
    if (lr.sample_id && lr.sample_id.trim() !== "") {
      return <Chip size="small" label="مُستلمة" color="primary" className="text-xs" />;
    } else {
      return <Chip size="small" label="بانتظار الاستلام" variant="outlined" className="text-xs" />;
    }
  };

  const getApprovalStatusBadge = (lr: LabRequest) => {
    if (lr.approve) {
      return <Chip size="small" label="معتمد" color="secondary" className="text-xs" />;
    } else {
      return <Chip size="small" label="بانتظار الاعتماد" variant="outlined" className="text-xs" />;
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
  // console.log(patient,'patient')
  const panelComponents: Record<PanelId, React.ReactNode> = {
    patientInfo: (
      patient ? (
        <PatientDetailsLabEntry
          visitId={visitId}
          patientName={patient.name}
          doctorName={patient.doctor?.name ?? null}
          date={patient.created_at as unknown as string}
          phone={patient.phone ?? null}
          paymentMethod={selectedLabRequest?.payment_method as unknown as string}
          registeredBy={(patient as unknown as { registered_by?: string }).registered_by ?? null}
          age={getAgeString(patient)}
          statuses={{
            payment: { done: true, by: undefined },
            collected: { time: undefined, by: undefined },
            print: { time: undefined, by: undefined },
            authentication: { done: patient.result_is_locked },
          }}
          className="mb-2"
        />
      ) : !isLoadingPatient ? (
        <p className="text-xs text-muted-foreground py-2 text-center">
          {AR.patientDataNotAvailable}
        </p>
      ) : null
    ),
    requestStatus: null,
    parameterDetails: focusedChildTest ? (
      <SortableInfoCard
        id="parameterDetails"
        title={`${AR.parameterDetails}: ${focusedChildTest.child_test_name}`}
        icon={BarChart3}
        defaultCollapsed={false}
        cardClassName="bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/40"
      >
        <DetailRowDisplay
          label={AR.normalRangeText}
          value={
            focusedChildTest.normalRange ||
            (focusedChildTest.low !== null && focusedChildTest.upper !== null
              ? `${focusedChildTest.low} - ${focusedChildTest.upper}`
              : AR.notSet)
          }
        />
        <DetailRowDisplay
          label={AR.unit}
          value={focusedChildTest.unit?.name || focusedChildTest.unit_name}
        />
        {focusedChildTest.defval && (
          <DetailRowDisplay
            label={AR.defaultValue}
            value={focusedChildTest.defval}
          />
        )}
        {(focusedChildTest.lowest || focusedChildTest.max) && (
          <Divider className="my-1" />
        )}
        {focusedChildTest.lowest && (
          <DetailRowDisplay
            label={AR.criticalLow}
            value={String(focusedChildTest.lowest)}
            valueClassName="text-orange-600 font-bold"
          />
        )}
        {focusedChildTest.max && (
          <DetailRowDisplay
            label={AR.criticalHigh}
            value={String(focusedChildTest.max)}
            valueClassName="text-red-600 font-bold"
          />
        )}
      </SortableInfoCard>
    ) : null,
  };
  const [isSendWhatsAppDialogOpen, setIsSendWhatsAppDialogOpen] = useState(false);
  const [reportTypeForWhatsApp, setReportTypeForWhatsApp] = useState<'full_lab_report' | 'thermal_lab_receipt'>('full_lab_report');

  // ... existing functions ...

  const handleOpenWhatsAppDialog = (type: 'full_lab_report' | 'thermal_lab_receipt') => {
    if (!visitId || !patient) {
      toast.error("Patient or visit information is missing.");
      return;
    }
    setReportTypeForWhatsApp(type);
    setIsSendWhatsAppDialogOpen(true);
  };
  if (!patientId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          {AR.selectPatientToViewInfo}
        </p>
      </div>
    );
  }
  console.log(patientLabQueueItem,'patientLabQueueItem')

  return (
  <>
  <Box dir={"rtl"} className="h-full bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={panelOrder.map(id => id)} strategy={verticalListSortingStrategy}>
            <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              {panelOrder.map(panelId => (
                <div key={panelId}>{panelComponents[panelId]}</div>
              )).filter(Boolean)}
              
              <MuiCard className="shadow-sm bg-slate-100 dark:bg-slate-900/40">
                <Box className="pb-2 pt-3 px-3">
                  <Typography variant="subtitle2" className="text-sm font-semibold flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    {AR.actionsTitle}
                  </Typography>
                </Box>
                <MuiCardContent className="space-y-1.5">
                    {/* New WhatsApp Buttons */}
            <MuiButton
              variant="outlined"
              className="w-full justify-start text-xs text-green-700 hover:text-green-800 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
              onClick={() => handleOpenWhatsAppDialog('thermal_lab_receipt')}
              disabled={!visitId || !patient} // Simple check for now
            >
              <WhatsApp className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
              {AR.sendReceiptShort}
            </MuiButton>
            <MuiButton
              variant="outlined"
              className="w-full justify-start text-xs text-green-700 hover:text-green-800 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
              onClick={() => handleOpenWhatsAppDialog('full_lab_report')}
              disabled={!visitId || !patient /* || resultsLocked - if preview implies sendable */}
            >
              <WhatsApp className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
              {AR.sendReportShort}
            </MuiButton>
                  <MuiButton variant="outlined" className="w-full justify-start text-xs" onClick={handlePrintReceipt} disabled={!visitId || isGeneratingPdf}>
                    <Receipt className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" /> {AR.printReceipt}
                  </MuiButton>
                  <MuiButton variant="outlined" className="w-full justify-start text-xs" onClick={handlePrintSampleLabels} disabled={!visitId || isGeneratingPdf}>
                    <Printer className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />{AR.printSampleLabels}
                  </MuiButton>
                  <MuiButton
                    variant="outlined"
                    className="w-full justify-start text-xs"
                    onClick={handleViewReportPreview}
                    disabled={!visitId || isGeneratingPdf || resultsLocked || patientLabQueueItem?.all_requests_paid === false} // Check resultsLocked
                    title={resultsLocked ? AR.resultsAreLocked : AR.viewReportPreview}
                  >
                    <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
                    {AR.viewReportPreview}
                  </MuiButton>
                </MuiCardContent>
              </MuiCard>
            </div>
          </SortableContext>
        </DndContext>
      </Box>
      {patient && visitId && (
        <SendReportWhatsAppDialog
          isOpen={isSendWhatsAppDialogOpen}
          onOpenChange={setIsSendWhatsAppDialogOpen}
          patient={patient}
          visitId={visitId}
          reportType={reportTypeForWhatsApp}
        />
      )}
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
