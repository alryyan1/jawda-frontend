// src/components/lab/workstation/ActionsButtonsPanel.tsx
import React, { useState, useCallback } from "react";
import { Card as MuiCard, CardContent as MuiCardContent, Button as MuiButton } from "@mui/material";
import { FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/patients";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import LabReportPdfPreviewDialog from "@/components/common/LabReportPdfPreviewDialog";
import apiClient from "@/services/api";
import { uploadLabResultFromApi, hasPatientResultUrl } from "@/services/firebaseStorageService";

interface ActionsButtonsPanelProps {
  visitId: number | null;
  patient: Patient | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  resultsLocked: boolean;
  onPatientUpdate?: (updatedPatient: Patient) => void;
  onUploadStatusChange?: (isUploading: boolean) => void;
}

const ActionsButtonsPanel: React.FC<ActionsButtonsPanelProps> = ({
  visitId,
  patient,
  patientLabQueueItem,
  resultsLocked,
  onPatientUpdate,
  onUploadStatusChange,
}) => {
  // State for PDF Preview
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfFileName, setPdfFileName] = useState('document.pdf');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticateResults = useCallback(async () => {
    if (!patient?.id || !visitId) return;
    
    setIsAuthenticating(true);
    try {
      const response = await apiClient.patch(`/patients/${patient.id}/authenticate-results`);
      const updatedPatient = response.data.data;
      
      // Update the patient data immediately after authentication
      if (onPatientUpdate) {
        onPatientUpdate(updatedPatient);
      }
      
      toast.success("تم اعتماد النتائج بنجاح. تم إضافة رفع الملف إلى قائمة الانتظار.");
    } catch (error: unknown) {
      console.error('Error authenticating results:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error("حدث خطأ أثناء اعتماد النتائج", {
        description: errorMessage,
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [patient?.id, patient?.name, visitId, onPatientUpdate, onUploadStatusChange]);

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
      console.log(patient, "patient");
      setPdfUrl(objectUrl);
      const patientNameSanitized = patient?.name.replace(/[^A-Za-z0-9-_]/g, '_') || 'patient';
      setPdfFileName(`${fileNamePrefix}_${visitId}_${patientNameSanitized}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error: unknown) {
      console.error(`Error generating ${title}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error("حدث خطأ أثناء إنشاء ملف PDF", {
        description: errorMessage,
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


  const handlePdfDialogOpenChange = useCallback((open: boolean) => {
    setIsPdfPreviewOpen(open);
    if (!open && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  return (
    <>
       
        <div className="mt-2">
          {/* Show authenticate button if results are not authenticated */}
          {patient && !patient.result_auth && (
            <MuiButton
              variant="contained"
              className="w-full justify-start text-xs bg-green-600 hover:bg-green-700"
              onClick={handleAuthenticateResults}
              disabled={!patient?.id || resultsLocked || patientLabQueueItem?.all_requests_paid === false || isAuthenticating}
              title={resultsLocked ? "النتائج مقفلة" : "اعتماد النتائج"}
            >
              <ShieldCheck className={`ltr:mr-2 rtl:ml-2 h-3.5 w-3.5 ${isAuthenticating ? 'animate-spin' : ''}`} />
              {isAuthenticating ? 'جاري الاعتماد...' : 'اعتماد النتائج'}
            </MuiButton>
          )}

          {/* Show preview button only if results are authenticated */}
          {patient && patient.result_auth && (
            <MuiButton
              variant="outlined"
              className="w-full justify-start text-xs"
              onClick={handleViewReportPreview}
              disabled={!visitId || isGeneratingPdf || resultsLocked || patientLabQueueItem?.all_requests_paid === false}
              title={resultsLocked ? "النتائج مقفلة" : "معاينة التقرير"}
            >
              <FileText className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
              معاينة التقرير
              {hasPatientResultUrl(patient) && (
                <span className="ltr:ml-1 rtl:mr-1 text-green-500 text-xs">☁️</span>
              )}
            </MuiButton>
          )}
        </div>


      {/* Lab Report PDF Preview Dialog */}
      <LabReportPdfPreviewDialog
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
