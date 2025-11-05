// src/components/common/PdfPreviewDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Printer as PrinterIcon } from 'lucide-react'; // Renamed Printer to PrinterIcon

interface PdfPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null; // URL.createObjectURL(blob)
  title?: string;
  fileName?: string; // For the download button
  isLoading?: boolean; // If PDF generation is happening before URL is ready
  /**
   * Optional Tailwind width class for the dialog (e.g. w-[380px] for thermal printer)
   */
  widthClass?: string;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  pdfUrl,
  title,
  fileName = 'document.pdf',
  isLoading,
  widthClass
}) => {
  const { t } = useTranslation(['common']);

  const handleActualPrint = () => {
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  // Function to modify PDF URL to fit to width by default
  const getPdfUrlWithFitToWidth = (url: string | null): string => {
    if (!url) return '';
    
    // Add PDF viewer parameters to fit to width by default
    // Use multiple parameters for better browser compatibility
    const separator = url.includes('#') ? '&' : '#';
    return `${url}${separator}`;
    // return `${url}${separator}view=FitH&zoom=page-width&toolbar=1&navpanes=0`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          widthClass
            ? `${widthClass} h-[85vh] flex flex-col p-0 sm:p-0 overflow-hidden`
            : "w-[350px] max-w-[350px] h-[85vh] flex flex-col p-0 sm:p-0 overflow-hidden"
        }
      >

        
        <div className="flex-grow overflow-hidden p-1 sm:p-2">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3">{t('pdfPreview.generating', "Generating PDF...")}</p>
            </div>
          )}
          {!isLoading && pdfUrl && (
            <iframe
              id="pdf-preview-iframe"
              src={getPdfUrlWithFitToWidth(pdfUrl)}
              className="w-full h-full border-0"
              title={title || "PDF Preview"}
            />
          )}
          {!isLoading && !pdfUrl && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t('pdfPreview.noPdfToDisplay', "No PDF to display or an error occurred.")}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};
export default PdfPreviewDialog;