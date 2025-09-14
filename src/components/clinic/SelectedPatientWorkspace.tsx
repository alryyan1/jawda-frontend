// src/components/clinic/SelectedPatientWorkspace.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
} from "lucide-react";

import ServicesRequestComponent from "./ServicesRequestComponent";
import LabRequestComponent from "./LabRequestComponent";
import { toast } from "sonner";
import apiClient from "@/services/api";
import PdfPreviewDialog from "../common/PdfPreviewDialog";

interface SelectedPatientWorkspaceProps {
  selectedPatientVisit: DoctorVisit;
  initialPatient: Patient;
  visitId: number;
  onClose?: () => void;
}

const SelectedPatientWorkspace: React.FC<SelectedPatientWorkspaceProps> = ({
  selectedPatientVisit,
  initialPatient,
  visitId,
  onClose,
}) => {
  const visitQueryKey = ["doctorVisit", visitId];
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
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


  const handlePrintReceipt = async () => {
    if (!visit) return;
    setIsGeneratingPdf(true);
    setPdfUrl(null); // Clear previous URL
    setIsPdfPreviewOpen(true); // Open dialog to show loader

    try {
      const response = await apiClient.get('/api/receipts/print');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
      // Construct a more descriptive filename
      const patientNameSanitized = visit.patient.name.replace(/[^A-Za-z0-9\-_]/g, '_');
      setPdfFileName(`Receipt_Visit_${visit.id}_${patientNameSanitized}.pdf`);

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

 

  return (
    <div className="flex flex-col h-full bg-background shadow-xl">
      <Tabs
        defaultValue="services"
        className="flex-grow flex flex-col overflow-hidden"
      >
        <ScrollArea className="flex-shrink-0 border-b">
          <TabsList className="mx-3 my-2 grid w-auto grid-flow-col auto-cols-max gap-2 p-1 h-auto">
            <TabsTrigger value="services" className="text-xs px-3 py-1.5">
              <ListOrdered className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              الخدمات
            </TabsTrigger>
            <TabsTrigger value="lab" className="text-xs px-3 py-1.5">
              <Microscope className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              المختبر
            </TabsTrigger>
           
          </TabsList>
        </ScrollArea>

        <TabsContent
          value="services"
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
            <div className="p-2 border-b flex justify-end">
        <Button onClick={handlePrintReceipt} variant="outline" size="sm" disabled={isGeneratingPdf  || !visit}>
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <PrinterIcon className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
          طباعة الإيصال
        </Button>
      </div>
          <ServicesRequestComponent handlePrintReceipt={handlePrintReceipt} patientId={patient.id} visit={visit} visitId={visit.id} />
        </TabsContent>

        <TabsContent 
          value="lab" 
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <LabRequestComponent visitId={visit.id} selectedPatientVisit={selectedPatientVisit} patientId={patient.id}/>
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
        title={`معاينة الإيصال - زيارة ${visit?.id}`}
        fileName={pdfFileName}
      />
    </div>
  );
};

export default SelectedPatientWorkspace;
