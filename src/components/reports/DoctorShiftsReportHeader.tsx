import React from "react";
import { useTranslation } from "react-i18next";
import { FileBarChart2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DoctorShiftsReportHeaderProps {
  isGeneratingListPdf: boolean;
  isLoading: boolean;
  hasData: boolean;
  onDownloadListPdf: () => void;
}

const DoctorShiftsReportHeader: React.FC<DoctorShiftsReportHeaderProps> = ({
  isGeneratingListPdf,
  isLoading,
  hasData,
  onDownloadListPdf,
}) => {
  const { t } = useTranslation(["reports", "common"]);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
        <FileBarChart2 className="h-7 w-7 text-primary" />
        {t("reports:doctorShiftsReportTitle")}
      </h1>
      <Button
        onClick={onDownloadListPdf}
        variant="outline"
        size="sm"
        disabled={isGeneratingListPdf || isLoading || !hasData}
      >
        {isGeneratingListPdf ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ltr:ml-2 rtl:mr-2">{t("common:exportToPdf")}</span>
      </Button>
    </div>
  );
};

export default DoctorShiftsReportHeader; 