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
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  pdfUrl,
  title,
  fileName = 'document.pdf',
  isLoading
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
    return `${url}${separator}view=FitH&zoom=page-width&toolbar=1&navpanes=0`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:max-w-none md:max-w-none h-[85vh] flex flex-col p-0 sm:p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 border-b flex-row justify-between items-center space-y-0">
          <DialogTitle>{title || t('pdfPreview.title', "Document Preview")}</DialogTitle>
        </DialogHeader>
        
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

        <DialogFooter className="p-4 sm:p-6 border-t">
          {pdfUrl && !isLoading && (
            <>
              <Button variant="outline" onClick={handleActualPrint}>
                <PrinterIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t('common:print')}
              </Button>
              <Button asChild>
                <a href={pdfUrl} download={fileName}>
                  <Download className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {t('common:download')}
                </a>
              </Button>
            </>
          )}
          <DialogClose asChild>
            <Button type="button" variant="secondary">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default PdfPreviewDialog;