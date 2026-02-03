import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  OperationTemplate,
  OperationItem,
  OperationCost,
} from "@/types/operations";

interface OperationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOperation: OperationTemplate | null;
  catalogue: OperationItem[];
  onSubmit: (data: Partial<OperationTemplate>) => void;
  isSubmitting?: boolean;
}

export default function OperationTemplateDialog({
  open,
  onOpenChange,
  editingOperation,
  catalogue,
  onSubmit,
  isSubmitting = false,
}: OperationTemplateDialogProps) {
  const [formData, setFormData] = useState<Partial<OperationTemplate>>({
    operation_type: "",
    description: "",
    surgeon_fee: 0,
    status: "pending",
    costs: [],
  });

  useEffect(() => {
    if (open) {
      if (editingOperation) {
        setFormData({
          operation_type: editingOperation.operation_type,
          description: editingOperation.description || "",
          surgeon_fee: editingOperation.surgeon_fee,
          status: editingOperation.status,
          costs: editingOperation.costs || [],
        });
      } else {
        setFormData({
          operation_type: "",
          description: "",
          surgeon_fee: 0,
          status: "pending",
          costs: [],
        });
      }
    }
  }, [open, editingOperation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addCost = () => {
    setFormData((prev) => ({
      ...prev,
      costs: [
        ...(prev.costs || []),
        { operation_item_id: 0, perc: null, fixed: null, is_surgeon: false },
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
      costs: prev.costs?.map((c, i) => {
        if (field === "is_surgeon" && value === true) {
          return i === index
            ? { ...c, [field]: value }
            : { ...c, is_surgeon: false };
        }
        return i === index ? { ...c, [field]: value } : c;
      }),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                          <SelectItem key={item.id} value={item.id.toString()}>
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

                  <div className="flex items-end pb-2">
                    <label className="flex items-center space-x-2 cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        checked={cost.is_surgeon || false}
                        onChange={(e) =>
                          updateCost(index, "is_surgeon", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium">جراح</span>
                    </label>
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
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
