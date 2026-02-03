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
import OperationTemplateDialog from "@/components/operations/OperationTemplateDialog";
import { operationService } from "@/services/operationService";

import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "@/services/api";
import type { OperationTemplate, OperationItem } from "@/types/operations";

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

  // Queries
  const { data: operations, isLoading } = useQuery({
    queryKey: ["operationTemplates", search],
    queryFn: () => getOperationTemplates(search),
  });

  // Specific Operation Query
  const { data: operationDetail } = useQuery({
    queryKey: ["operation", editingOperation?.id],
    queryFn: () => getOperation(editingOperation!.id),
    enabled: !!editingOperation,
  });

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

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه العملية؟")) {
      deleteMutation.mutate(id);
    }
  };

  // Handlers
  const handleOpenDialog = (operation?: OperationTemplate) => {
    if (operation) {
      setEditingOperation(operation);
      // We set initial data immediately for best UX, but specific query will update it if fresh info comes
    } else {
      setEditingOperation(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOperation(null);
  };

  const handleSave = (data: Partial<OperationTemplate>) => {
    if (editingOperation) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
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

      <OperationTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingOperation={
          editingOperation ? operationDetail || editingOperation : null
        }
        catalogue={catalogue}
        onSubmit={handleSave}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
