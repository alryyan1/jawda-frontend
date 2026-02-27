import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getSurgicalOperationCharges,
  createSurgicalOperationCharge,
  updateSurgicalOperationCharge,
  deleteSurgicalOperationCharge,
  importStandardCharges,
} from "@/services/surgicalOperationService";
import type {
  SurgicalOperation,
  SurgicalOperationCharge,
} from "@/services/surgicalOperationService";

interface ManageSurgicalChargesDialogProps {
  operation: SurgicalOperation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageSurgicalChargesDialog({
  operation,
  isOpen,
  onClose,
}: ManageSurgicalChargesDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [type, setType] = useState<"fixed" | "percentage">("fixed");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState<"center" | "staff">("center");
  const [referenceType, setReferenceType] = useState<"total" | "charge" | null>(
    null,
  );
  const [referenceChargeId, setReferenceChargeId] = useState<string>("");

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ["surgicalOperationCharges", operation?.id],
    queryFn: () => getSurgicalOperationCharges(operation!.id),
    enabled: !!operation?.id && isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createSurgicalOperationCharge>[1]) =>
      createSurgicalOperationCharge(operation!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surgicalOperationCharges", operation?.id],
      });
      toast.success("تمت إضافة التكلفة بنجاح");
      resetForm();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء الإضافة");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      chargeId,
      data,
    }: {
      chargeId: number;
      data: Parameters<typeof updateSurgicalOperationCharge>[2];
    }) => updateSurgicalOperationCharge(operation!.id, chargeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surgicalOperationCharges", operation?.id],
      });
      toast.success("تم التحديث بنجاح");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء التحديث");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chargeId: number) =>
      deleteSurgicalOperationCharge(operation!.id, chargeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surgicalOperationCharges", operation?.id],
      });
      toast.success("تم حذف التكلفة بنجاح");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء الحذف");
    },
  });

  const importMutation = useMutation({
    mutationFn: () => importStandardCharges(operation!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surgicalOperationCharges", operation?.id],
      });
      toast.success("تم استيراد التكاليف الأساسية بنجاح");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء الاستيراد");
    },
  });

  const resetForm = () => {
    setName("");
    setType("fixed");
    setAmount("");
    setBeneficiary("center");
    setReferenceType(null);
    setReferenceChargeId("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operation) return;

    if (type === "percentage" && !referenceType) {
      toast.error("يرجى اختيار مرجع النسبة المئوية");
      return;
    }

    if (referenceType === "charge" && !referenceChargeId) {
      toast.error("يرجى اختيار التكلفة المرجعية");
      return;
    }

    createMutation.mutate({
      name,
      type,
      amount: parseFloat(amount) || 0,
      reference_type: type === "percentage" ? referenceType : null,
      reference_charge_id:
        type === "percentage" && referenceType === "charge"
          ? parseInt(referenceChargeId)
          : null,
      beneficiary,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إدارة تكاليف العملية: {operation?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Form Section */}
          <div className="md:col-span-1 space-y-4 border-l pl-4 rtl:border-l-0 rtl:border-r rtl:pr-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              إضافة تكلفة جديدة
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="charge-name">اسم التكلفة</Label>
                <Input
                  id="charge-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: تخدير، غرفة..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select
                    value={type}
                    onValueChange={(val: "fixed" | "percentage") => {
                      setType(val);
                      if (val === "fixed") {
                        setReferenceType(null);
                        setReferenceChargeId("");
                      } else {
                        setReferenceType("total");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      <SelectItem value="percentage">نسبة مئوية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">القيمه المبدئيه</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الجهة المستفيدة</Label>
                <Select
                  value={beneficiary}
                  onValueChange={(val: "center" | "staff") =>
                    setBeneficiary(val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">المركز</SelectItem>
                    <SelectItem value="staff">كادر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "percentage" && (
                <div className="space-y-4 border p-3 rounded-md bg-slate-50">
                  <div className="space-y-2">
                    <Label>تُحسب النسبة من:</Label>
                    <Select
                      value={referenceType || "total"}
                      onValueChange={(val: "total" | "charge") => {
                        setReferenceType(val);
                        if (val === "total") setReferenceChargeId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">إجمالي العملية</SelectItem>
                        <SelectItem
                          value="charge"
                          disabled={charges.length === 0}
                        >
                          تكلفة أخرى
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {referenceType === "charge" && (
                    <div className="space-y-2">
                      <Label>اختر التكلفة المرجعية:</Label>
                      <Select
                        value={referenceChargeId}
                        onValueChange={setReferenceChargeId}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التكلفة..." />
                        </SelectTrigger>
                        <SelectContent>
                          {charges.map((c: SurgicalOperationCharge) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "جاري الإضافة..." : "إضافة التكلفة"}
              </Button>
            </form>
          </div>

          {/* List Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-lg">التكاليف الحالية</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {importMutation.isPending
                  ? "جاري الاستيراد..."
                  : "إستيراد التكاليف الأساسية"}
              </Button>
            </div>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">الاسم</TableHead>
                    <TableHead className="text-center">القيمة</TableHead>
                    <TableHead className="text-center">
                      الجهة المستفيدة
                    </TableHead>
                    <TableHead className="text-center">المرجع</TableHead>
                    <TableHead className="text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : charges.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-muted-foreground"
                      >
                        لا توجد تكاليف مضافة
                      </TableCell>
                    </TableRow>
                  ) : (
                    charges.map((charge: SurgicalOperationCharge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium text-center">
                          <Input
                            defaultValue={charge.name}
                            onBlur={(e) => {
                              if (
                                e.target.value !== charge.name &&
                                e.target.value.trim() !== ""
                              ) {
                                updateMutation.mutate({
                                  chargeId: charge.id,
                                  data: { name: e.target.value },
                                });
                              }
                            }}
                            className="h-8 text-center min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              step="any"
                              defaultValue={charge.amount}
                              onFocus={(e) => {
                                e.target.select();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const inputs = document.querySelectorAll(
                                    ".charge-amount-input",
                                  ) as NodeListOf<HTMLInputElement>;
                                  const index = Array.from(inputs).indexOf(
                                    e.target as HTMLInputElement,
                                  );
                                  if (index > -1 && index < inputs.length - 1) {
                                    inputs[index + 1].focus();
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== charge.amount) {
                                  updateMutation.mutate({
                                    chargeId: charge.id,
                                    data: { amount: val },
                                  });
                                }
                              }}
                              className="h-8 text-center w-20 charge-amount-input"
                            />
                            <Select
                              value={charge.type}
                              onValueChange={(val: "fixed" | "percentage") => {
                                if (val !== charge.type) {
                                  updateMutation.mutate({
                                    chargeId: charge.id,
                                    data: {
                                      type: val,
                                      ...(val === "fixed"
                                        ? {
                                            reference_type: null,
                                            reference_charge_id: null,
                                          }
                                        : { reference_type: "total" }),
                                    },
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">ثابت</SelectItem>
                                <SelectItem value="percentage">
                                  نسبة %
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={charge.beneficiary}
                            onValueChange={(val: "center" | "staff") => {
                              if (val !== charge.beneficiary) {
                                updateMutation.mutate({
                                  chargeId: charge.id,
                                  data: { beneficiary: val },
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 min-w-[100px] mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="center">المركز</SelectItem>
                              <SelectItem value="staff">كادر</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-center">
                          {charge.type === "percentage" ? (
                            <Select
                              value={
                                charge.reference_type === "charge"
                                  ? charge.reference_charge_id?.toString() || ""
                                  : "total"
                              }
                              onValueChange={(val) => {
                                if (val === "total") {
                                  if (charge.reference_type !== "total") {
                                    updateMutation.mutate({
                                      chargeId: charge.id,
                                      data: {
                                        reference_type: "total",
                                        reference_charge_id: null,
                                      },
                                    });
                                  }
                                } else {
                                  const refId = parseInt(val);
                                  if (
                                    charge.reference_type !== "charge" ||
                                    charge.reference_charge_id !== refId
                                  ) {
                                    updateMutation.mutate({
                                      chargeId: charge.id,
                                      data: {
                                        reference_type: "charge",
                                        reference_charge_id: refId,
                                      },
                                    });
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 min-w-[140px] mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="total">
                                  إجمالي العملية
                                </SelectItem>
                                {charges
                                  .filter(
                                    (c: SurgicalOperationCharge) =>
                                      c.id !== charge.id,
                                  )
                                  .map((c: SurgicalOperationCharge) => (
                                    <SelectItem
                                      key={c.id}
                                      value={c.id.toString()}
                                    >
                                      من: {c.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(charge.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
