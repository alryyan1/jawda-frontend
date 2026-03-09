// src/components/services/ServiceFormPage.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { type ServiceFormData, ServiceFormMode } from "@/types/services";
import {
  createService,
  updateService,
  getServiceById,
} from "@/services/serviceService";
import ServiceForm from "./ServiceForm";

interface ServiceFormPageProps {
  mode: ServiceFormMode;
}

const ServiceFormPage: React.FC<ServiceFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === ServiceFormMode.EDIT;

  const { data: serviceData, isLoading: isLoadingService } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => getServiceById(Number(serviceId)).then((res) => res.data),
    enabled: isEditMode && !!serviceId,
  });

  const mutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      isEditMode && serviceId
        ? updateService(Number(serviceId), data)
        : createService(data),
    onSuccess: () => {
      toast.success("تم حفظ الخدمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      if (isEditMode && serviceId)
        queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
      navigate("/settings/services");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "فشل حفظ الخدمة");
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    mutation.mutate(data);
  };

  const handleCancel = () => {
    navigate("/settings/services");
  };

  if (isEditMode && isLoadingService) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" /> جاري التحميل...
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader style={{ direction: "rtl" }}>
        <Typography variant="h6">
          {isEditMode ? "تعديل خدمة" : "إضافة خدمة"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          يرجى تعبئة البيانات التالية
        </Typography>
      </CardHeader>
      <CardContent style={{ direction: "rtl" }}>
        <ServiceForm
          initialData={serviceData}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isSubmitting={mutation.isPending}
        />
      </CardContent>
    </Card>
  );
};

export default ServiceFormPage;
