// src/components/lab/workstation/dialog/WhatsAppWorkAreaDialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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

interface WhatsAppWorkAreaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPatient: Patient | null;
  selectedLabRequest: LabRequest | null;
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
  selectedLabRequest,
  onMessageSent,
}) => {
  const [instanceStatus, setInstanceStatus] = useState<UltramsgInstanceStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

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

  // Initialize form with patient data when dialog opens
  useEffect(() => {
    if (isOpen && currentPatient?.phone) {
      // Format phone number to local format (remove + and country code if present)
      let formattedPhone = currentPatient.phone;
      
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
  }, [isOpen, currentPatient, setValue, reset]);

  const generateDefaultMessage = (): string => {
    if (!currentPatient || !selectedLabRequest) {
      return "مرحباً، نتائج فحوصاتك جاهزة.";
    }

    const patientName = currentPatient.name;
    const testName = selectedLabRequest.main_test?.main_test_name || "الفحص";
    const date = format(new Date(), "PPP", { locale: arSA });
    
    return `عزيزي/عزيزتي ${patientName}، نتائج فحص ${testName} جاهزة بتاريخ ${date}. يمكنك مراجعة العيادة أو التواصل معنا للاستفسار.`;
  };

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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || "فشل إرسال الرسالة");
    },
  });

  // Send document mutation (if lab request has PDF)
  const sendDocumentMutation = useMutation({
    mutationFn: async (data: WhatsAppFormValues) => {
      // Check if patient has result_url from Firebase
      if (!currentPatient?.result_url) {
        throw new Error("لا يوجد رابط للتقرير. يرجى التأكد من رفع التقرير إلى التخزين السحابي أولاً.");
      }
      
      // Use the result_url from the patient data (Firebase URL)
      const documentUrl = currentPatient.result_url;
      
      // Generate filename based on patient name and visit ID
      const patientName = currentPatient.name.replace(/[^A-Za-z0-9-_]/g, '_');
      const visitId = selectedLabRequest?.doctor_visit_id || 'unknown';
      const filename = `lab_result_${visitId}_${patientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      
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
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.error || "فشل إرسال التقرير";
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
    } catch (error: any) {
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
 console.log(isConfigured,'isConfigured',configStatus)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            إرسال واتساب - نتائج المختبر
          </DialogTitle>
          <DialogDescription>
            {currentPatient ? `إرسال إلى: ${currentPatient.name}` : "إرسال رسالة واتساب"}
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
                {sendTextMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                إرسال نص
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={form.handleSubmit(handleSendDocument)}
                disabled={isLoading || !isConfigured || !phoneNumber }
                className="flex-1"
              >
                {sendDocumentMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                <FileText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                إرسال تقرير
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
