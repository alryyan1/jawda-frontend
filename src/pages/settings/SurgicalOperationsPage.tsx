import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, BadgeDollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ManageSurgicalChargesDialog from "./ManageSurgicalChargesDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getSurgicalOperations,
  createSurgicalOperation,
  updateSurgicalOperation,
  deleteSurgicalOperation,
} from "@/services/surgicalOperationService";
import type { SurgicalOperation } from "@/services/surgicalOperationService";
import { toast } from "sonner";

export default function SurgicalOperationsPage() {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperation, setEditingOperation] =
    useState<SurgicalOperation | null>(null);

  const [isChargesDialogOpen, setIsChargesDialogOpen] = useState(false);
  const [selectedOperationForCharges, setSelectedOperationForCharges] =
    useState<SurgicalOperation | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["surgicalOperations"],
    queryFn: getSurgicalOperations,
  });

  const createMutation = useMutation({
    mutationFn: createSurgicalOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surgicalOperations"] });
      toast.success("تمت إضافة العملية بنجاح");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء الإضافة");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; price: number };
    }) => updateSurgicalOperation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surgicalOperations"] });
      toast.success("تم تحديث العملية بنجاح");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء التحديث");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurgicalOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surgicalOperations"] });
      toast.success("تم حذف العملية بنجاح");
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء الحذف");
      setItemToDelete(null);
    },
  });

  const handleOpenDialog = (operation?: SurgicalOperation) => {
    if (operation) {
      setEditingOperation(operation);
      setName(operation.name);
      setPrice(operation.price.toString());
    } else {
      setEditingOperation(null);
      setName("");
      setPrice("");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOperation(null);
    setName("");
    setPrice("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      price: parseFloat(price) || 0,
    };

    if (editingOperation) {
      updateMutation.mutate({ id: editingOperation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          إدارة العمليات الجراحية
        </h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> إضافة عملية
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">اسم العملية</TableHead>
              <TableHead className="text-center">السعر</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : !Array.isArray(operations) || operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-10 text-muted-foreground"
                >
                  لا توجد عمليات جراحية
                </TableCell>
              </TableRow>
            ) : (
              (Array.isArray(operations) ? operations : []).map(
                (operation: SurgicalOperation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-medium text-center">
                      {operation.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {operation.price}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="إدارة التكاليف"
                          onClick={() => {
                            setSelectedOperationForCharges(operation);
                            setIsChargesDialogOpen(true);
                          }}
                        >
                          <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(operation)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemToDelete(operation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? "تعديل العملية" : "إضافة عملية جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العملية</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input
                id="price"
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                الغاء
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

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه العملية؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete);
                }
              }}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageSurgicalChargesDialog
        operation={selectedOperationForCharges}
        isOpen={isChargesDialogOpen}
        onClose={() => {
          setIsChargesDialogOpen(false);
          setSelectedOperationForCharges(null);
        }}
      />
    </div>
  );
}
