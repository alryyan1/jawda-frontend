import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { operationService } from "@/services/operationService";

import { Plus, Pencil, Trash2, Search, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import apiClient from "@/services/api";
import { OperationItem } from "@/types/operations";

// New Interface for Costs
interface OperationCost {
  id?: number;
  operation_item_id: number;
  perc?: number | null;
  fixed?: number | null;
  operation_item?: OperationItem;
}

// New Interface based on Operation model
interface OperationTemplate {
  id: number;
  operation_type: string;
  description: string;
  surgeon_fee: number;
  status: string; // 'pending', 'completed', 'cancelled' -> We might use 'pending' as active for templates
  costs?: OperationCost[];
}

// API Functions
const getOperationTemplates = async (search?: string) => {
  const params: Record<string, string | boolean> = { is_template: true };
  if (search) params.search = search;

  const response = await apiClient.get("/operations", { params });
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const createOperationTemplate = async (data: Partial<OperationTemplate>) => {
  // Hardcode necessary fields for template
  const payload = {
    ...data,
    operation_date: new Date().toISOString().split("T")[0], // Dummy date
    admission_id: null,
    status: "pending",
  };
  const response = await apiClient.post("/operations", payload);
  return response.data;
};

const updateOperationTemplate = async (
  id: number,
  data: Partial<OperationTemplate>,
) => {
  const payload = {
    ...data,
  };
  const response = await apiClient.put(`/operations/${id}`, payload);
  return response.data;
};

const deleteOperationTemplate = async (id: number) => {
  const response = await apiClient.delete(`/operations/${id}`);
  return response.data;
};

// Add fetch detailed operation
const getOperation = async (id: number) => {
  const response = await apiClient.get(`/operations/${id}`);
  // Since show returns OperationResource, usually wrapped in 'data'
  // But axios interceptor might unwrap it? Check other usages.
  // In getOperationTemplates we use response.data
  return response.data?.data || response.data;
};

export default function OperationsSettingsPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperation, setEditingOperation] =
    useState<OperationTemplate | null>(null);
  const queryClient = useQueryClient();

  const [catalogue, setCatalogue] = useState<OperationItem[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<OperationTemplate>>({
    operation_type: "",
    description: "",
    surgeon_fee: 0,
    status: "pending",
    costs: [],
  });

  // Queries
  const { data: operations, isLoading } = useQuery({
    queryKey: ["operationTemplates", search],
    queryFn: () => getOperationTemplates(search),
  });

  // Specific Operation Query
  const { data: operationDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["operation", editingOperation?.id],
    queryFn: () => getOperation(editingOperation!.id),
    enabled: !!editingOperation,
  });

  // Sync formData with detail
  useEffect(() => {
    if (editingOperation && operationDetail) {
      setFormData({
        operation_type: operationDetail.operation_type,
        description: operationDetail.description || "",
        surgeon_fee: operationDetail.surgeon_fee,
        status: operationDetail.status,
        costs: operationDetail.costs || [],
      });
    }
  }, [operationDetail, editingOperation]);

  // Fetch Catalogue
  useEffect(() => {
    fetchCatalogue();
  }, []);

  const fetchCatalogue = async () => {
    try {
      const data = await operationService.getItems();
      setCatalogue(data);
    } catch (error) {
      console.error("Failed to fetch catalogue", error);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: createOperationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationTemplates"] });
      toast.success("تمت الإضافة بنجاح");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("حدث خطأ", {
        description: "فشل في حفظ العملية",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<OperationTemplate>) =>
      updateOperationTemplate(editingOperation!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationTemplates"] });
      // Also invalidate specific query
      queryClient.invalidateQueries({
        queryKey: ["operation", editingOperation?.id],
      });
      toast.success("تم التعديل بنجاح");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("حدث خطأ", {
        description: "فشل في تحديث العملية",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOperationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationTemplates"] });
      toast.success("تم الحذف بنجاح");
    },
  });

  // Handlers
  const handleOpenDialog = (operation?: OperationTemplate) => {
    if (operation) {
      setEditingOperation(operation);
      // We set initial data immediately for best UX, but specific query will update it if fresh info comes
      setFormData({
        operation_type: operation.operation_type,
        description: operation.description || "",
        surgeon_fee: operation.surgeon_fee,
        status: operation.status,
        costs: operation.costs || [],
      });
    } else {
      setEditingOperation(null);
      setFormData({
        operation_type: "",
        description: "",
        surgeon_fee: 0,
        status: "pending",
        costs: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOperation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOperation) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه العملية؟")) {
      deleteMutation.mutate(id);
    }
  };

  // Cost Handlers
  const addCost = () => {
    setFormData((prev) => ({
      ...prev,
      costs: [
        ...(prev.costs || []),
        { operation_item_id: 0, perc: null, fixed: null },
      ],
    }));
  };

  const removeCost = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      costs: prev.costs?.filter((_, i) => i !== index),
    }));
  };

  const updateCost = (
    index: number,
    field: keyof OperationCost,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      costs: prev.costs?.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            إعدادات العمليات الجراحية
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة قائمة العمليات وأسعارها (نماذج)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة عملية
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>قائمة العمليات</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم العملية</TableHead>
                  <TableHead className="text-right">الوصف (الكود)</TableHead>
                  <TableHead className="text-right">أجر الجراح</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : operations?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-24 text-muted-foreground"
                    >
                      لا توجد عمليات مضافة
                    </TableCell>
                  </TableRow>
                ) : (
                  operations?.map((op: OperationTemplate) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">
                        {op.operation_type}
                        {op.costs && op.costs.length > 0 && (
                          <span className="mr-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {op.costs.length} بنود
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{op.description || "-"}</TableCell>
                      <TableCell>
                        {Number(op.surgeon_fee).toLocaleString()} د.ع
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(op)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(op.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? "تعديل عملية" : "إضافة عملية جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">اسم العملية</Label>
                <Input
                  id="name"
                  required
                  value={formData.operation_type}
                  onChange={(e) =>
                    setFormData({ ...formData, operation_type: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="code">الوصف / الكود</Label>
                <Input
                  id="code"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">أجر الجراح (المبلغ الأساسي)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
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
            </div>

            {/* Costs Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">
                  توزيع التكاليف والنسب
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCost}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة بند
                </Button>
              </div>

              <div className="space-y-3">
                {formData.costs?.map((cost, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-end p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">البند</Label>
                      <Select
                        value={cost.operation_item_id.toString()}
                        onValueChange={(val) =>
                          updateCost(index, "operation_item_id", Number(val))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="اختر البند" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" disabled>
                            -- اختر --
                          </SelectItem>
                          {catalogue.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                            >
                              {item.name} (
                              {item.type === "staff" ? "كادر" : "مركز"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <Label className="text-xs mb-1 block">نسبة %</Label>
                      <Input
                        type="number"
                        placeholder="%"
                        className="h-9"
                        value={cost.perc ?? ""}
                        onChange={(e) => {
                          const val = e.target.value
                            ? parseFloat(e.target.value)
                            : null;
                          updateCost(index, "perc", val);
                          if (val) updateCost(index, "fixed", null); // Reset fixed if perc set
                        }}
                      />
                    </div>

                    <div className="w-32">
                      <Label className="text-xs mb-1 block">مبلغ ثابت</Label>
                      <Input
                        type="number"
                        placeholder="د.ع"
                        className="h-9"
                        value={cost.fixed ?? ""}
                        onChange={(e) => {
                          const val = e.target.value
                            ? parseFloat(e.target.value)
                            : null;
                          updateCost(index, "fixed", val);
                          if (val) updateCost(index, "perc", null); // Reset perc if fixed set
                        }}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-9 w-9 mb-[2px]"
                      onClick={() => removeCost(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!formData.costs || formData.costs.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded bg-muted/10">
                    لا توجد بنود مضافة
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
