// src/components/lab/workstation/ActionsButtonsPanel.tsx
import React, { useState, useCallback } from "react";
import { Card as MuiCard, CardContent as MuiCardContent, Button as MuiButton } from "@mui/material";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/patients";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import SendReportWhatsAppDialog from "./dialog/SendReportWhatsAppDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import apiClient from "@/services/api";
import { WhatsApp } from "@mui/icons-material";

interface ActionsButtonsPanelProps {
  visitId: number | null;
  patient: Patient | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  resultsLocked: boolean;
}

const ActionsButtonsPanel: React.FC<ActionsButtonsPanelProps> = ({
  visitId,
  patient,
  patientLabQueueItem,
  resultsLocked,
}) => {
  // State for PDF Preview
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfFileName, setPdfFileName] = useState('document.pdf');
  
  // State for WhatsApp dialog
  const [isSendWhatsAppDialogOpen, setIsSendWhatsAppDialogOpen] = useState(false);
  const [reportTypeForWhatsApp, setReportTypeForWhatsApp] = useState<'full_lab_report' | 'thermal_lab_receipt'>('full_lab_report');

  const generateAndShowPdf = useCallback(async (
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
    } catch (error: unknown) {
      console.error(`Error generating ${title}:`, error);
      toast.error("حدث خطأ أثناء إنشاء ملف PDF", {
        description: error.response?.data?.message || error.message,
      });
      setIsPdfPreviewOpen(false); // Close dialog on error
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [patient?.name, visitId]);

 


  const handleViewReportPreview = useCallback(() => {
    if (!visitId) return;
    generateAndShowPdf(
      "معاينة تقرير المختبر",
      'LabReport',
      () => apiClient.get(`/visits/${visitId}/lab-report/pdf`, { responseType: 'blob' }).then(res => res.data)
    );
  }, [visitId, generateAndShowPdf]);

  const handleOpenWhatsAppDialog = useCallback((type: 'full_lab_report' | 'thermal_lab_receipt') => {
    if (!visitId || !patient) {
      toast.error("Patient or visit information is missing.");
      return;
    }
    setReportTypeForWhatsApp(type);
    setIsSendWhatsAppDialogOpen(true);
  }, [visitId, patient]);

  const handlePdfDialogOpenChange = useCallback((open: boolean) => {
    setIsPdfPreviewOpen(open);
    if (!open && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  return (
    <>
      <MuiCard className="shadow-sm bg-slate-100 dark:bg-slate-900/40">
       
        <MuiCardContent className="space-y-1.5">
          {/* WhatsApp Buttons */}
          <MuiButton
            variant="outlined"
            className="w-full justify-start text-xs text-green-700 hover:text-green-800 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
            onClick={() => handleOpenWhatsAppDialog('thermal_lab_receipt')}
            disabled={!visitId || !patient}
          >
            <WhatsApp className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
            إرسال الإيصال في واتساب
          </MuiButton>
          
          <MuiButton
            variant="outlined"
            className="w-full justify-start text-xs text-green-700 hover:text-green-800 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
            onClick={() => handleOpenWhatsAppDialog('full_lab_report')}
            disabled={!visitId || !patient}
          >
            <WhatsApp className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
            إرسال التقرير في واتساب
          </MuiButton>
          
      
          
      
          
          <MuiButton
            variant="outlined"
            className="w-full justify-start text-xs"
            onClick={handleViewReportPreview}
            disabled={!visitId || isGeneratingPdf || resultsLocked || patientLabQueueItem?.all_requests_paid === false}
            title={resultsLocked ? "النتائج مقفلة" : "معاينة التقرير"}
          >
            <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
            معاينة التقرير
          </MuiButton>
        </MuiCardContent>
      </MuiCard>

      {/* WhatsApp Dialog */}
      {patient && visitId && (
        <SendReportWhatsAppDialog
          isOpen={isSendWhatsAppDialogOpen}
          onOpenChange={setIsSendWhatsAppDialogOpen}
          patient={patient}
          visitId={visitId}
          reportType={reportTypeForWhatsApp}
        />
      )}

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        isOpen={isPdfPreviewOpen}
        onOpenChange={handlePdfDialogOpenChange}
        pdfUrl={pdfUrl}
        isLoading={isGeneratingPdf && !pdfUrl}
        title={pdfPreviewTitle}
        fileName={pdfFileName}
      />
    </>
  );
};

export default ActionsButtonsPanel;
