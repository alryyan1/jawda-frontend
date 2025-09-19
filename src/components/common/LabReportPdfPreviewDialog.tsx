// src/components/common/LabReportPdfPreviewDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Printer as PrinterIcon } from 'lucide-react';

interface LabReportPdfPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null; // URL.createObjectURL(blob)
  title?: string;
  fileName?: string; // For the download button
  isLoading?: boolean; // If PDF generation is happening before URL is ready
}

const LabReportPdfPreviewDialog: React.FC<LabReportPdfPreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  pdfUrl,
  title,
  fileName = 'lab-report.pdf',
  isLoading,
}) => {

  const handleActualPrint = () => {
    const iframe = document.getElementById('lab-report-pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to modify PDF URL to fit to width by default
  const getPdfUrlWithFitToWidth = (url: string | null): string => {
    if (!url) return '';
    
    // Add PDF viewer parameters to fit to width by default
    // Use multiple parameters for better browser compatibility
    const separator = url.includes('#') ? '&' : '#';
    return `${url}${separator}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-[1400px]! h-[90vh] flex flex-col p-0 sm:p-0 overflow-hidden"
      >
        <DialogHeader className="p-3 sm:p-4 border-b flex-row justify-between items-center space-y-0">
          <DialogTitle>{title || "معاينة تقرير المختبر"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden p-1 sm:p-2">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3">جاري إنشاء ملف PDF...</p>
            </div>
          )}
          {!isLoading && pdfUrl && (
            <iframe
              id="lab-report-pdf-preview-iframe"
              src={getPdfUrlWithFitToWidth(pdfUrl)}
              className="w-full h-full border-0"
              title={title || "Lab Report PDF Preview"}
            />
          )}
          {!isLoading && !pdfUrl && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              لا يوجد ملف PDF للعرض أو حدث خطأ.
            </div>
          )}
        </div>

        <DialogFooter className="p-3 sm:p-4 border-t">
          <div className="flex gap-2 w-full justify-end">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!pdfUrl}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
            <Button
              variant="outline"
              onClick={handleActualPrint}
              disabled={!pdfUrl}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              طباعة
            </Button>
            <DialogClose asChild>
              <Button variant="default">
                إغلاق
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabReportPdfPreviewDialog;
