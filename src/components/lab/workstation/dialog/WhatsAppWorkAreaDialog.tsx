// src/components/lab/workstation/dialog/WhatsAppWorkAreaDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Wifi, WifiOff, FileText, CheckCircle, XCircle } from "lucide-react";

import type { Patient } from "@/types/patients";
import type { LabRequest } from "@/types/visits";
import { 
  sendUltramsgText, 
  sendUltramsgDocumentFromUrl, 
  getUltramsgInstanceStatus, 
  isUltramsgConfigured,
  type UltramsgTextPayload,
  type UltramsgInstanceStatus 
} from "@/services/ultramsgService";
import { getPatientById } from "@/services/patientService";

interface WhatsAppWorkAreaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPatient: Patient | null;
  selectedLabRequest?: LabRequest | null; // Made optional since it's not used
  onMessageSent?: () => void;
}

const whatsappSchema = z.object({
  phoneNumber: z.string().min(1, { message: "رقم الهاتف مطلوب" }).regex(/^0?[1-9]\d{8,14}$/, { message: "رقم هاتف غير صحيح (مثال: 0991961111)" }),
  message: z.string().min(1, { message: "الرسالة مطلوبة" }).max(4096, { message: "الرسالة طويلة جداً" }),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const WhatsAppWorkAreaDialog: React.FC<WhatsAppWorkAreaDialogProps> = ({
  isOpen,
  onOpenChange,
  currentPatient,
  onMessageSent,
}) => {
  const [instanceStatus, setInstanceStatus] = useState<UltramsgInstanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      phoneNumber: "",
      message: "",
    },
  });

  const { setValue, reset, control, watch } = form;
  const phoneNumber = watch("phoneNumber");
  
  // Check if Ultramsg is configured
  const { data: configStatus } = useQuery({
    queryKey: ["ultramsgConfigured"],
    queryFn: isUltramsgConfigured,
    enabled: isOpen,
  });

  // Refresh patient data when dialog opens to check for updated result_url
  const { data: refreshedPatientData } = useQuery({
    queryKey: ["patientDetailsForWhatsApp", currentPatient?.id],
    queryFn: () => getPatientById(currentPatient!.id),
    enabled: isOpen && !!currentPatient?.id,
    staleTime: 0, // Always fetch fresh data when dialog opens
  });

  // Use refreshed patient data if available, otherwise fall back to currentPatient
  const effectivePatientData = refreshedPatientData || currentPatient;

  // Initialize form with patient data when dialog opens
  useEffect(() => {
    const generateDefaultMessage = (): string => {
      const date = format(new Date(), "PPP", { locale: arSA });
      
      return `عزيزي/عزيزتي ${effectivePatientData?.name}، نتائج فحص جاهزة بتاريخ ${date}. يمكنك مراجعة العيادة أو التواصل معنا للاستفسار.`;
    };

    if (isOpen && effectivePatientData?.phone) {
      // Format phone number to local format (remove + and country code if present)
      let formattedPhone = effectivePatientData.phone;
      
      // Remove + if present
      if (formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.substring(1);
      }
      
      // Remove country code 249 if present and add 0 prefix
      if (formattedPhone.startsWith('249')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      }
      
      // If it doesn't start with 0, add it
      if (!formattedPhone.startsWith('0')) {
        formattedPhone = '0' + formattedPhone;
      }
      
      setValue("phoneNumber", formattedPhone);
      
      // Generate default message
      const defaultMessage = generateDefaultMessage();
      setValue("message", defaultMessage);
    } else if (!isOpen) {
      reset();
      setInstanceStatus(null);
    }
  }, [isOpen, effectivePatientData, setValue, reset]);

  // Update query cache with refreshed patient data when dialog closes
  useEffect(() => {
    if (!isOpen && refreshedPatientData && currentPatient?.id) {
      // Update the main patient query cache with the refreshed data
      queryClient.setQueryData(['patientDetailsForActionPane', currentPatient.id], refreshedPatientData);
      queryClient.setQueryData(['patientDetailsForInfoPanel', currentPatient.id], (old: { data?: Patient } | undefined) => {
        if (old?.data) {
          return {
            ...old,
            data: refreshedPatientData
          };
        }
        return { data: refreshedPatientData };
      });
      queryClient.setQueryData(['patientDetailsForLabDisplay', currentPatient.id], (old: { data?: Patient } | undefined) => {
        if (old?.data) {
          return {
            ...old,
            data: refreshedPatientData
          };
        }
        return { data: refreshedPatientData };
      });
    }
  }, [isOpen, refreshedPatientData, currentPatient?.id, queryClient]);

  // Send text message mutation
  const sendTextMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      const payload: UltramsgTextPayload = {
        to: data.phoneNumber,
        body: data.message,
      };
      return sendUltramsgText(payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("تم إرسال الرسالة بنجاح");
        if (onMessageSent) onMessageSent();
        onOpenChange(false);
      } else {
        toast.error(response.error || "فشل إرسال الرسالة");
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || "فشل إرسال الرسالة";
      toast.error(errorMessage);
    },
  });

  // Send document mutation (if lab request has PDF)
  const sendDocumentMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      // Check if patient has result_url from Firebase
      if (!effectivePatientData?.result_url) {
        throw new Error("لا يوجد رابط للتقرير. يرجى التأكد من رفع التقرير إلى التخزين السحابي أولاً.");
      }
      
      // Use the result_url from the patient data (Firebase URL)
      const documentUrl = effectivePatientData.result_url;
      
      // Use simple filename as per the new requirement
      const filename = 'result.pdf';
      
      return sendUltramsgDocumentFromUrl({
        to: data.phoneNumber,
        document_url: documentUrl,
        filename: filename,
        caption: data.message,
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("تم إرسال التقرير بنجاح");
        if (onMessageSent) onMessageSent();
        onOpenChange(false);
      } else {
        toast.error(response.error || "فشل إرسال التقرير");
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || "فشل إرسال التقرير";
      toast.error(errorMessage);
    },
  });

  // Check instance status
  const checkInstanceStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await getUltramsgInstanceStatus();
      setInstanceStatus(status);
      
      if (status.success) {
        toast.success("حالة الخدمة: متصلة");
      } else {
        toast.error(status.error || "فشل في التحقق من حالة الخدمة");
      }
    } catch {
      toast.error("فشل في التحقق من حالة الخدمة");
      setInstanceStatus({ success: false, error: "فشل في التحقق من حالة الخدمة" });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSendText = (data: WhatsAppFormValues) => {
    sendTextMutation.mutate(data);
  };

  const handleSendDocument = (data: WhatsAppFormValues) => {
 
    sendDocumentMutation.mutate(data);
  };

  const isConfigured = configStatus?.configured ?? false;
  const isLoading = sendTextMutation.isPending || sendDocumentMutation.isPending;
  console.log(isConfigured,'isConfigured',configStatus,phoneNumber,effectivePatientData?.result_url)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            إرسال واتساب - نتائج المختبر
          </DialogTitle>
          <DialogDescription>
            {effectivePatientData ? `إرسال إلى: ${effectivePatientData.name}` : "إرسال رسالة واتساب"}
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">حالة الخدمة:</span>
            <Badge variant={isConfigured ? "default" : "destructive"}>
              {isConfigured ? "مُعدة" : "غير مُعدة"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkInstanceStatus}
            disabled={isCheckingStatus || !isConfigured}
            className="flex items-center gap-2"
          >
            {isCheckingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : instanceStatus?.success ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            فحص الحالة
          </Button>
        </div>

        {/* Document Status */}
        {effectivePatientData && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">حالة التقرير:</span>
              <Badge variant={effectivePatientData.result_url ? "default" : "secondary"}>
                {effectivePatientData.result_url ? "متوفر في السحابة" : "غير متوفر"}
              </Badge>
            </div>
            {effectivePatientData.result_url && (
              <div className="flex items-center gap-1 text-green-600">
                <span className="text-xs">☁️</span>
                <span className="text-xs">متاح للإرسال</span>
              </div>
            )}
          </div>
        )}

        {/* Instance Status Display */}
        {instanceStatus && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            {instanceStatus.success ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">الخدمة متصلة ومتاحة</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  {instanceStatus.error || "الخدمة غير متاحة"}
                </span>
              </>
            )}
          </div>
        )}

        <Form {...form}>
          <form className="space-y-4 py-2">
            <FormField
              control={control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0991961111"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الرسالة</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="اكتب رسالتك هنا..."
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(handleSendText)}
                disabled={isLoading || !isConfigured || !phoneNumber}
                className="flex-1"
              >
                {sendTextMutation.isPending ? (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                ) : null}
                {sendTextMutation.isPending ? "جاري الإرسال..." : "إرسال نص"}
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={form.handleSubmit(handleSendDocument)}
                disabled={isLoading || !isConfigured || !phoneNumber || !effectivePatientData?.result_url}
                className="flex-1"
                title={!effectivePatientData?.result_url ? "لا يوجد رابط للتقرير. يرجى رفع التقرير إلى التخزين السحابي أولاً." : ""}
              >
                {sendDocumentMutation.isPending ? (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                )}
                {sendDocumentMutation.isPending ? "جاري الإرسال..." : "إرسال تقرير"}
              </Button>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  إلغاء
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppWorkAreaDialog;
