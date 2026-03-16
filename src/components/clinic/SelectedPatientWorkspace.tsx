// src/components/clinic/SelectedPatientWorkspace.tsx
import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Patient } from "@/types/patients";
import type { DoctorVisit } from "@/types/visits";
import {
  getDoctorVisitById,
} from "@/services/visitService";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ListOrdered,
  Microscope,
  AlertTriangle,
  PrinterIcon,
  PlusCircle,
  FileText,
} from "lucide-react";

import ServicesRequestComponent from "./ServicesRequestComponent";
import LabRequestsColumn from "@/components/lab/reception/LabRequestsColumn";
import { toast } from "sonner";
import apiClient from "@/services/api";
import PdfPreviewDialog from "../common/PdfPreviewDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import type { MainTestStripped } from "@/types/labTests";
import { addLabTestsToVisit } from "@/services/labRequestService";
import { useCachedMainTestsList } from "@/hooks/useCachedData";
import realtimeService from "@/services/realtimeService";
import { useAuthorization } from "@/hooks/useAuthorization";

interface SelectedPatientWorkspaceProps {
  selectedPatientVisit: DoctorVisit;
  initialPatient: Patient;
  visitId: number;
  onClose?: () => void;
  onActiveTabChange?: (tab: 'services' | 'lab') => void;
}

const SelectedPatientWorkspace: React.FC<SelectedPatientWorkspaceProps> = ({
  initialPatient,
  visitId,
  onClose,
  onActiveTabChange,
}) => {
  const { user } = useAuth();
  const isUnifiedCashier = (user?.user_type || '').trim() === 'خزنه موحده';
  const visitQueryKey = ["doctorVisit", visitId];
  const [activeTab, setActiveTab] = useState<'services' | 'lab'>("services");
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewMode, setPdfPreviewMode] = useState<'receipt' | 'clinic-invoice'>('receipt');
  const {
    data: visit,
    isLoading,
    error: visitError,
  } = useQuery<DoctorVisit, Error>({
    queryKey: visitQueryKey,
    queryFn: () => getDoctorVisitById(visitId),
    enabled: !!visitId,
  });

  const patient = visit?.patient || initialPatient;
  // console.log('doctorvisit', doctorvisit);const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('receipt.pdf');
  const [openSelectionGridCommand, setOpenSelectionGridCommand] = useState(0);
  const [addSelectedCommand, setAddSelectedCommand] = useState(0);
  const [hasSelectedServices, setHasSelectedServices] = useState(false);
  const [selectedTests, setSelectedTests] = useState<MainTestStripped[]>([]);
  const testSelectionAutocompleteRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const {can} = useAuthorization()
  // Fetch all available tests for Autocomplete (cached)
  const { data: availableTests = [], isLoading: isLoadingTests } = useCachedMainTestsList(visit?.id || 0);

  // Add selected tests mutation
  const addTestsMutation = useMutation({
    mutationFn: (payload: { main_test_ids: number[]; comment?: string }) =>
      addLabTestsToVisit({ visitId: visit!.id, ...payload }),
    onSuccess: () => {
      toast.success("تم إضافة الفحوصات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["labRequestsForVisit", visit?.id] });
      queryClient.invalidateQueries({ queryKey: ["activeVisitForLabRequests", visit?.id] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit", visit?.id] });
      setSelectedTests([]);
    },
    onError: () => {
    },
  });

  const activeVisitId = visit?.id || null;

  const onAddTests = () => {
    if (!visit || selectedTests.length === 0) return;
    addTestsMutation.mutate({ main_test_ids: selectedTests.map(t => t.id) });
  };


  const handlePrintReceipt = async () => {
    if (!visit) return;
    setIsGeneratingPdf(true);
    setPdfUrl(null); // Clear previous URL
    setPdfPreviewMode('receipt');
    setIsPdfPreviewOpen(true); // Open dialog to show loader

    try {
      let response;
      let receiptType;
      
      if (activeTab === 'lab') {
        // Lab receipt endpoint
        response = await apiClient.get(`visits/${visit.id}/lab-thermal-receipt/pdf`, {
          responseType: 'blob',
          headers: { Accept: 'application/pdf' },
        });
        receiptType = 'lab';
      } else {
        // Services receipt endpoint
        response = await apiClient.get(`visits/${visit.id}/thermal-receipt/pdf`, {
          responseType: 'blob',
          headers: { Accept: 'application/pdf' },
        });
        receiptType = 'services';
        realtimeService.printServicesReceipt(visit.id, visit.patient.id);
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      
      // Construct a more descriptive filename based on tab
      const patientNameSanitized = visit.patient.name.replace(/[^A-Za-z0-9\-_]/g, '_');
      setPdfFileName(`${receiptType === 'lab' ? 'Lab_Receipt' : 'Services_Receipt'}_Visit_${visit.id}_${patientNameSanitized}.pdf`);

    } catch (error: unknown) {
      console.error("Error generating PDF receipt:", error);
      toast.error('فشل في إنشاء ملف PDF', {
        description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || (error as Error).message
      });
      setIsPdfPreviewOpen(false); // Close dialog on error
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewClinicInvoice = async () => {
    if (!visit) return;
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setPdfPreviewMode('clinic-invoice');
    setIsPdfPreviewOpen(true);

    try {
      const response = await apiClient.get(`visits/${visit.id}/clinic-invoice/pdf`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      const patientNameSanitized = visit.patient?.name?.replace(/[^A-Za-z0-9\-_\u0600-\u06FF]/g, '_') ?? 'Patient';
      setPdfFileName(`clinic-invoice-visit-${visit.id}_${patientNameSanitized}.pdf`);
    } catch (error: unknown) {
      console.error("Error generating clinic invoice PDF:", error);
      const err = error as { response?: { data?: Blob | { message?: string } } };
      const data = err?.response?.data;
      if (data instanceof Blob) {
        data.text().then((text) => {
          try {
            const json = JSON.parse(text) as { message?: string };
            toast.error(json.message || "فشل في إنشاء الفاتورة");
          } catch {
            toast.error("فشل في إنشاء الفاتورة");
          }
        }).catch(() => toast.error("فشل في إنشاء الفاتورة"));
      } else {
        toast.error((data as { message?: string })?.message || "فشل في إنشاء الفاتورة");
      }
      setIsPdfPreviewOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading && !visit) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          جاري تحميل تفاصيل المريض...
        </p>
      </div>
    );
  }

  if (visitError) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background p-6 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>
          فشل في جلب بيانات الزيارة
        </p>
        <p className="text-xs mt-1">{visitError.message}</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            إغلاق
          </Button>
        )}
      </div>
    );
  }

  if (!visit || !patient) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background p-6">
        <p>لا توجد بيانات للمريض</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            إغلاق
          </Button>
        )}
      </div>
    );
  }
  const canAddService = visit.user_id === user?.id;
  return (
    <div className="flex flex-col h-full bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          const v = (val as 'services' | 'lab');
          setActiveTab(v);
          onActiveTabChange?.(v);
        }}
        className="flex-grow flex flex-col overflow-hidden"
      >
        <ScrollArea className="flex-shrink-0 border-b">
          <div className="mx-3 my-2 flex items-center justify-between gap-2">
          <TabsList className="grid w-auto grid-flow-col auto-cols-max gap-2 p-1 h-auto">
            <TabsTrigger value="services" className="text-xs px-3 py-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <ListOrdered className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              الخدمات
            </TabsTrigger>
            <TabsTrigger value="lab" className="text-xs px-3 py-1.5 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <Microscope className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              المختبر
            </TabsTrigger>
          </TabsList>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handlePrintReceipt}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isGeneratingPdf || !visit}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PrinterIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>الإيصال</TooltipContent>
              </Tooltip>

              {activeTab === "services" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleViewClinicInvoice}
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isGeneratingPdf || !visit}
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>الفاتورة</TooltipContent>
                </Tooltip>
              )}

              {!isUnifiedCashier && canAddService && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={!can("اضافه خدمه")}
                      onClick={() => setOpenSelectionGridCommand((c) => c + 1)}
                      variant="default"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>قائمة الخدمات</TooltipContent>
                </Tooltip>
              )}

              {hasSelectedServices && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={!can("اضافه خدمه")}
                      onClick={() => setAddSelectedCommand((c) => c + 1)}
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 animate-bounce bg-blue-500"
                    >
                      <PlusCircle className="h-4 w-4 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>إضافة المحدد</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </ScrollArea>

        <TabsContent
          value="services"
          className="flex-grow overflow-y-auto p-1 sm:p-1 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <ServicesRequestComponent 
            addSelectedCommand={addSelectedCommand} 
            openSelectionGridCommand={openSelectionGridCommand} 
            handlePrintReceipt={handlePrintReceipt} 
            patientId={patient.id} 
            visit={visit} 
            visitId={visit.id} 
            onSelectionCountChange={(count) => setHasSelectedServices(count > 0)}
          />
        </TabsContent>

        <TabsContent 
          value="lab" 
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >

          
        {/* Test Selection Autocomplete - moved to the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Autocomplete
            ref={testSelectionAutocompleteRef}
            multiple
            options={availableTests || []}
            value={selectedTests}
            onChange={(_, newValue) => {
              console.log('Autocomplete onChange:', newValue);
              setSelectedTests(newValue);
            }}
            getOptionKey={(option) => option.id}
            getOptionLabel={(option) => option.main_test_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={isLoadingTests}
            size="small"
            sx={{ width: 320 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={"اختر الفحوصات لإضافتها"}
                variant="outlined"
                placeholder={"ابحث واختر الفحوصات..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const enteredId = (e.target as HTMLInputElement).value;
                    const foundTest = availableTests?.find(
                      (test) => test.id === parseInt(enteredId)
                    );
                    if (foundTest) {
                      setSelectedTests([...selectedTests, foundTest]);
                    }
                  } else if (e.key === "+" || e.key === "=") {
                    // Trigger add tests when + or = key is pressed
                    e.preventDefault();
                    if (selectedTests.length > 0 && activeVisitId && !addTestsMutation.isPending) {
                      onAddTests();
                      // Remove focus from the input after adding tests
                      (e.target as HTMLInputElement).blur();
                    }
                  }
                }}
              />
            )}
            noOptionsText={"لا توجد نتائج"}
            loadingText={"جاري التحميل"}
          />
          <Button
            onClick={onAddTests}
            disabled={selectedTests.length === 0 || !activeVisitId || addTestsMutation.isPending}
            variant="default"
            className="px-3 py-2"
          >
            {addTestsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
            ) : (
              <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            )}
            إضافة فحص {selectedTests.length > 0 && `(${selectedTests.length})`}
          </Button>
        </Box>
          <LabRequestsColumn
            activeVisitId={visit.id}
            visit={visit}
            isLoading={isLoading}
            onPrintReceipt={handlePrintReceipt}
          />
        </TabsContent>
      </Tabs>
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
        isLoading={isGeneratingPdf && !pdfUrl} // Show loader while generating before URL is ready
        title={pdfPreviewMode === 'clinic-invoice' ? `معاينة الفاتورة - زيارة ${visit?.id}` : `معاينة ${activeTab === 'lab' ? 'إيصال المختبر' : 'إيصال الخدمات'} - زيارة ${visit?.id}`}
        fileName={pdfFileName}
      />
    </div>
  );
};

export default SelectedPatientWorkspace;
