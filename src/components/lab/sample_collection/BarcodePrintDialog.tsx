// src/components/lab/sample_collection/BarcodePrintDialog.tsx
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Download, Printer, Settings } from "lucide-react";
import apiClient from "@/services/api";

import type { PatientLabQueueItem } from "@/types/labWorkflow";

const BARCODE_LABEL_DIMENSIONS_KEY = "barcodeLabelDimensions";

interface BarcodeLabelDimensions {
  width: number;
  height: number;
}

const defaultDimensions: BarcodeLabelDimensions = {
  width: 50,
  height: 25,
};

const getStoredDimensions = (): BarcodeLabelDimensions => {
  try {
    const stored = localStorage.getItem(BARCODE_LABEL_DIMENSIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.width && parsed.height) {
        return { width: Number(parsed.width), height: Number(parsed.height) };
      }
    }
  } catch (error) {
    console.error("Error reading stored dimensions:", error);
  }
  return defaultDimensions;
};

const saveDimensions = (dimensions: BarcodeLabelDimensions): void => {
  try {
    localStorage.setItem(BARCODE_LABEL_DIMENSIONS_KEY, JSON.stringify(dimensions));
  } catch (error) {
    console.error("Error saving dimensions:", error);
  }
};

interface BarcodePrintDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queueItem: PatientLabQueueItem | null;
  onAfterPrint?: () => void;
}

const dimensionsSchema = z.object({
  width: z.number().min(10, { message: "الحد الأدنى هو 10" }).max(200, { message: "الحد الأقصى هو 200" }),
  height: z.number().min(10, { message: "الحد الأدنى هو 10" }).max(200, { message: "الحد الأقصى هو 200" }),
});
type DimensionsFormValues = z.infer<typeof dimensionsSchema>;

const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  isOpen,
  onOpenChange,
  queueItem,
  onAfterPrint,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dimensions, setDimensions] = useState<BarcodeLabelDimensions>(getStoredDimensions());
  const pdfUrlRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const form = useForm<DimensionsFormValues>({
    resolver: zodResolver(dimensionsSchema),
    defaultValues: {
      width: dimensions.width,
      height: dimensions.height,
    },
  });

  // Load dimensions from localStorage on mount
  useEffect(() => {
    const stored = getStoredDimensions();
    setDimensions(stored);
    form.reset({ width: stored.width, height: stored.height });
  }, [form]);

  // Update ref when pdfUrl changes
  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  // Generate PDF URL when dialog opens or dimensions change
  useEffect(() => {
    // Only fetch if dialog is open, we have a visit_id, and we're not already fetching
    if (isOpen && queueItem?.visit_id && !isFetchingRef.current) {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Cleanup previous PDF URL if exists
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
        setPdfUrl(null);
      }

      // Create blob URL for PDF
      const fetchPdf = async () => {
        try {
          const response = await apiClient.get(
            `/visits/${queueItem.visit_id}/lab-barcode/pdf`,
            {
              responseType: "blob",
              params: {
                width: dimensions.width,
                height: dimensions.height,
              },
            }
          );

          const blob = new Blob([response.data], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setIsLoading(false);
          isFetchingRef.current = false;
        } catch (err: unknown) {
          console.error("Error fetching PDF:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "فشل في تحميل ملف PDF";
          setError(errorMessage);
          setIsLoading(false);
          isFetchingRef.current = false;
          toast.error(errorMessage);
        }
      };

      fetchPdf();
    } else if (!isOpen) {
      // Reset fetching flag when dialog closes
      isFetchingRef.current = false;
      setError(null);
    }

    // Cleanup blob URL when dialog closes or component unmounts
    return () => {
      if (!isOpen && pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [isOpen, queueItem?.visit_id, dimensions.width, dimensions.height]);

  const handleDownload = () => {
    if (!pdfUrl || !queueItem) return;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `barcode_labels_visit_${queueItem.visit_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  const handleSaveSettings = (data: DimensionsFormValues) => {
    const newDimensions: BarcodeLabelDimensions = {
      width: data.width,
      height: data.height,
    };
    setDimensions(newDimensions);
    saveDimensions(newDimensions);
    setIsSettingsOpen(false);
    toast.success("تم حفظ الإعدادات بنجاح");
    
    // Refresh PDF with new dimensions if dialog is open
    if (isOpen && queueItem?.visit_id) {
      // Cleanup previous PDF URL
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
        setPdfUrl(null);
      }
      // Reset fetching flag to allow refetch
      isFetchingRef.current = false;
      // Trigger refetch by updating state
      setIsLoading(true);
      setError(null);
    }
  };

  const handleRetryFetch = () => {
    if (!queueItem?.visit_id || isFetchingRef.current) return;
    
    setError(null);
    isFetchingRef.current = true;
    setIsLoading(true);
    
    // Cleanup previous PDF URL if exists
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
      setPdfUrl(null);
    }
    
    apiClient
      .get(`/visits/${queueItem.visit_id}/lab-barcode/pdf`, {
        responseType: "blob",
        params: {
          width: dimensions.width,
          height: dimensions.height,
        },
      })
      .then((response) => {
        const blob = new Blob([response.data], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsLoading(false);
        isFetchingRef.current = false;
      })
      .catch((err) => {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "فشل في تحميل ملف PDF";
        setError(errorMessage);
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  };

  if (!queueItem && isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>
                  طباعة باركود
                </DialogTitle>
                <DialogDescription>
                  معاينة وطباعة باركود العينات للمريض
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
                className="h-8 w-8"
                title="الإعدادات"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {isLoading && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  جاري تحميل ملف PDF...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={handleRetryFetch}
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="flex-1 w-full min-h-[500px] border-0"
                title="Barcode PDF Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              إغلاق
            </Button>
          </DialogClose>
          {pdfUrl && !isLoading && !error && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تحميل
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handlePrint();
                  if (onAfterPrint) {
                    onAfterPrint();
                  }
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Settings Dialog */}
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            إعدادات أبعاد الباركود
          </DialogTitle>
          <DialogDescription>
            تحديد عرض وارتفاع تسمية الباركود بالمليمتر
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    العرض (مم)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={10}
                      max={200}
                      step={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    الارتفاع (مم)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={10}
                      max={200}
                      step={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  إلغاء
                </Button>
              </DialogClose>
              <Button type="submit">
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BarcodePrintDialog;
