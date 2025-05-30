// src/components/clinic/SelectedPatientWorkspace.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  Receipt,
} from "lucide-react";

import ServicesRequestComponent from "./ServicesRequestComponent";
import LabRequestComponent from "./LabRequestComponent";
import { toast } from "sonner";
import { downloadThermalReceiptPdf } from "@/services/reportService";

interface SelectedPatientWorkspaceProps {
  initialPatient: Patient;
  visitId: number;
  onClose?: () => void;
}

const SelectedPatientWorkspace: React.FC<SelectedPatientWorkspaceProps> = ({
  initialPatient,
  visitId,
  onClose,
}) => {
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const { t } = useTranslation([
    "clinic",
    "common",
    "services",
    "patients",
  ]);
  const visitQueryKey = ["doctorVisit", visitId];

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
  // console.log('doctorvisit', doctorvisit);
  if (isLoading && !visit) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {t("common:loadingDetails", "Loading patient details...")}
        </p>
      </div>
    );
  }

  if (visitError) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>
          {t("common:error.fetchFailed", {
            entity: t("clinic:selectedPatientWorkspace.titleShort", "Visit"),
          })}
        </p>
        <p className="text-xs mt-1">{visitError.message}</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            {t("common:close")}
          </Button>
        )}
      </div>
    );
  }

  if (!visit || !patient) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6">
        <p>{t("clinic:selectedPatientWorkspace.noPatientData")}</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            {t("common:close")}
          </Button>
        )}
      </div>
    );
  }

  const handlePrintReceipt = async () => {
    if (!visitId) {
      toast.error(t("common:error.noVisitId"));
      return;
    }
    setIsPrintingReceipt(true);
    try {
      const blob = await downloadThermalReceiptPdf(visitId);
      // For thermal printers, direct print is often desired.
      // This requires browser print dialog or specific thermal printer web API/SDK.
      // For now, we'll open it in a new tab for preview/manual print.
      const url = window.URL.createObjectURL(blob);
      const pdfWindow = window.open(url);
      if (pdfWindow) {
        pdfWindow.onload = () => {
          // Wait for PDF to load in new tab
          // pdfWindow.print(); // This might trigger print dialog
          // pdfWindow.onafterprint = () => pdfWindow.close(); // Close after print (might be blocked)
        };
      } else {
        toast.error(t("common:error.popupBlocked"));
      }
      // For direct download (less common for receipts):
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `receipt_visit_${visitId}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // a.remove();
      // toast.success(t('common:receiptGenerated'));
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      toast.error(t("common:error.pdfGeneratedError"));
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-card shadow-xl">
      <Tabs
        defaultValue="services"
        className="flex-grow flex flex-col overflow-hidden"
      >
        <ScrollArea className="flex-shrink-0 border-b">
          <TabsList className="mx-3 my-2 grid w-auto grid-flow-col auto-cols-max gap-2 p-1 h-auto">
            <TabsTrigger value="services" className="text-xs px-3 py-1.5">
              <ListOrdered className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.services")}
            </TabsTrigger>
            <TabsTrigger value="lab" className="text-xs px-3 py-1.5">
              <Microscope className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.lab")}
            </TabsTrigger>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={handlePrintReceipt} disabled={isPrintingReceipt /* || !visitFullyPaid */}>
              <Receipt className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5"/> {t('common:printReceipt', "Print Receipt")}
            </Button>
          </TabsList>
        </ScrollArea>

        <TabsContent
          value="services"
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <ServicesRequestComponent patientId={patient.id} visit={visit} visitId={visit.id} />
        </TabsContent>

        <TabsContent 
          value="lab" 
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <LabRequestComponent visitId={visit.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SelectedPatientWorkspace;
