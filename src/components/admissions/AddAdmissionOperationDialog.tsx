import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import apiClient from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddAdmissionOperationDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
}

interface OperationTemplate {
  id: number;
  operation_type: string;
  description: string;
  surgeon_fee: number;
}

export default function AddAdmissionOperationDialog({
  open,
  onClose,
  admissionId,
}: AddAdmissionOperationDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formData, setFormData] = useState({
    operation_type: "",
    surgeon_fee: 0,
    description: "",
    operation_date: new Date().toISOString().split("T")[0],
  });

  // Fetch Templates
  const { data: templates } = useQuery({
    queryKey: ["operationTemplates"],
    queryFn: async () => {
      const response = await apiClient.get("/operations", {
        params: { is_template: true },
      });
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    },
  });

  const handleTemplateChange = (val: string) => {
    setSelectedTemplateId(val);
    const template = templates?.find(
      (t: OperationTemplate) => t.id.toString() === val,
    );
    if (template) {
      setFormData({
        ...formData,
        operation_type: template.operation_type,
        surgeon_fee: template.surgeon_fee,
        description: template.description || "",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        admission_id: admissionId,
        status: "pending", // Default status for new operation
      };
      const response = await apiClient.post("/operations", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admissionOperations", admissionId],
      });
      toast.success("تم إضافة العملية بنجاح");
      onClose();
      // Reset form
      setSelectedTemplateId("");
      setFormData({
        operation_type: "",
        surgeon_fee: 0,
        description: "",
        operation_date: new Date().toISOString().split("T")[0],
      });
    },
    onError: () => {
      toast.error("فشل في إضافة العملية");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة عملية جراحية</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>اختيار نموذج (قالب)</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر عملية من القائمة..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t: OperationTemplate) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.operation_type} -{" "}
                    {Number(t.surgeon_fee).toLocaleString()} د.ع
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="op_type">نوع العملية</Label>
            <Input
              id="op_type"
              required
              value={formData.operation_type}
              onChange={(e) =>
                setFormData({ ...formData, operation_type: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fee">أجر الجراح</Label>
            <Input
              id="fee"
              type="number"
              required
              value={formData.surgeon_fee}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  surgeon_fee: parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              required
              value={formData.operation_date}
              onChange={(e) =>
                setFormData({ ...formData, operation_date: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الإضافة..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
