import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Tabs,
  Tab,
  Box,
  IconButton,
  Grid,
  Divider,
  Autocomplete,
  InputAdornment,
} from "@mui/material";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Operation,
  OperationFinanceItem,
  OperationItem,
} from "@/types/operations";
import { operationService } from "@/services/operationService";

interface OperationFinanceFormProps {
  open: boolean;
  onClose: () => void;
  operation: Operation;
  onSuccess: () => void;
}

export default function OperationFinanceForm({
  open,
  onClose,
  operation,
  onSuccess,
}: OperationFinanceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [catalogue, setCatalogue] = useState<OperationItem[]>([]);

  // Form State
  const [surgeonFee, setSurgeonFee] = useState<number>(0);
  const [items, setItems] = useState<OperationFinanceItem[]>([]);
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [bankPaid, setBankPaid] = useState<number>(0);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState("staff");

  const [isManualOverride, setIsManualOverride] = useState(false);

  // Fetch catalogue on mount
  const [templates, setTemplates] = useState<Operation[]>([]);

  // Fetch catalogue and templates on mount
  useEffect(() => {
    if (open) {
      fetchData();
      initializeForm();
    }
  }, [open, operation]);

  const fetchData = async () => {
    try {
      const [itemsData, templatesData] = await Promise.all([
        operationService.getItems(),
        operationService.getOperationTemplates(),
      ]);
      setCatalogue(itemsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  const initializeForm = async () => {
    setSurgeonFee(operation.surgeon_fee || 0);
    setCashPaid(operation.cash_paid || 0);
    setBankPaid(operation.bank_paid || 0);
    setReceiptPreview(
      operation.bank_receipt_image
        ? `/storage/${operation.bank_receipt_image}`
        : null,
    );

    if (operation.finance_items && operation.finance_items.length > 0) {
      setItems(operation.finance_items);
      setIsManualOverride(false);
    } else {
      // We might not have templates loaded yet if this runs too fast?
      // Let's refetch templates here just in case or depend on state?
      // Better: Wait for data fetch, but initializeForm is called in same useEffect.
      // We need to pass templates to calculateDefaults, or wait.
      // Let's modify logic: fetch -> then initialize.
    }
  };
  console.log(items, "items");
  // Re-run init when templates AND catalogue are loaded if we have no items
  useEffect(() => {
    if (
      templates.length > 0 &&
      catalogue.length > 0 &&
      (!operation.finance_items || operation.finance_items.length === 0) &&
      items.length === 0
    ) {
      const defaults = calculateDefaults(operation.surgeon_fee || 0, templates);
      setItems(defaults);
    }
  }, [templates, catalogue, operation]);

  const calculateDefaults = (
    fee: number,
    currentTemplates: Operation[] = templates,
  ): OperationFinanceItem[] => {
    // 1. Find matching template based on operation_type
    const template = currentTemplates.find(
      (t) => t.operation_type === operation.operation_type,
    );

    // 2. If template has costs, use them
    if (template && template.costs && template.costs.length > 0) {
      return template.costs.map((cost) => {
        let amount = 0;
        if (cost.fixed !== null && cost.fixed > 0) {
          amount = Number(cost.fixed);
        } else if (cost.perc !== null && cost.perc > 0) {
          amount = fee * (Number(cost.perc) / 100);
        }

        // Find item info
        const itemInfo = catalogue.find((c) => c.id === cost.operation_item_id); // Catalogue might be empty if racing, but cost has relation usually?
        // Better to rely on loaded catalogue or cost relation if available?
        // The template fetch 'costs.operationItem' is loaded in backend controller? yes.

        return createTempItem(
          cost.operation_item_id,
          itemInfo?.type === "staff" ? "staff" : "center", // Fallback type logic? Or use cost.operation_item
          itemInfo?.type || "center",
          itemInfo?.name || "بند تلقائي",
          amount,
          true,
        );
      });
    }

    // 3. Fallback to Legacy Hardcoded Defaults if no template/costs
    // Surgeon (1), Assistant (2), Anesthesia (3), Admission (16)
    const surgeon = catalogue.find((c) => c.id === 1);
    const assistant = catalogue.find((c) => c.id === 2);
    const anesthesia = catalogue.find((c) => c.id === 3);
    const admission = catalogue.find((c) => c.id === 16); // If exists

    const defaults: OperationFinanceItem[] = [];
    defaults.push(
      createTempItem(
        1,
        "surgeon",
        "staff",
        surgeon?.name || "أخصائي الجراحة",
        fee,
        true,
      ),
    );
    defaults.push(
      createTempItem(
        2,
        "assistant",
        "staff",
        assistant?.name || "مساعد الجراح",
        fee * 0.1,
        true,
      ),
    );
    defaults.push(
      createTempItem(
        3,
        "anesthesia",
        "staff",
        anesthesia?.name || "أخصائي التخدير",
        fee * 0.5,
        true,
      ),
    );
    defaults.push(
      createTempItem(null, "center_share", "center", "نصيب المركز", fee, true),
    );
    defaults.push(
      createTempItem(null, "accommodation", "center", "الإقامة", 150000, true),
    );
    return defaults;
  };

  const createTempItem = (
    itemId: number | null,
    type: string,
    category: "staff" | "center",
    desc: string,
    amount: number,
    isAuto: boolean,
  ): OperationFinanceItem => {
    const opItem = itemId ? catalogue.find((c) => c.id === itemId) : undefined;
    return {
      id: Math.random(),
      operation_id: operation.id,
      operation_item_id: itemId,
      operation_item: opItem,
      item_type: type,
      category,
      description: desc,
      amount,
      is_auto_calculated: isAuto,
      created_at: "",
      updated_at: "",
    };
  };

  // Handlers
  const handleSurgeonFeeChange = (val: number) => {
    setSurgeonFee(val);

    if (!isManualOverride) {
      const newDefaults = calculateDefaults(val);
      setItems((prev) => {
        const manualItems = prev.filter((i) => !i.is_auto_calculated);
        return [...newDefaults, ...manualItems];
      });
    }
  };

  const handleItemChange = (
    id: number,
    field: keyof OperationFinanceItem,
    value: any,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value, is_auto_calculated: false };
        }
        return item;
      }),
    );
    setIsManualOverride(true);
  };

  const handleDeleteItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setIsManualOverride(true);
  };

  // Generic IDs for custom items
  const OTHER_STAFF_ID = 17;
  const OTHER_CENTER_ID = 18;

  const handleAddItem = (category: "staff" | "center") => {
    const genericId = category === "staff" ? OTHER_STAFF_ID : OTHER_CENTER_ID;
    // Find generic item name or use default
    const genericItem = catalogue.find((c) => c.id === genericId);

    const newItem = createTempItem(
      genericId,
      "custom",
      category,
      genericItem?.name || "بند جديد",
      0,
      false,
    );
    // Clear description to allow user typing? Or keep "Other"?
    // Let's set description to empty string or "بند إضافي" so user can overwrite?
    // User expects to type.
    newItem.description = "";

    setItems((prev) => [...prev, newItem]);
    setIsManualOverride(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptImage(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const manualItemsPayload = items.map((i) => ({
        operation_item_id: i.operation_item_id,
        // Fallback for legacy fields if backend needs or ignores
        item_type: i.item_type,
        category: i.category,
        description: i.description,
        amount: i.amount,
        is_auto_calculated: i.is_auto_calculated,
      }));

      await operationService.updateOperation(operation.id, {
        surgeon_fee: surgeonFee,
        cash_paid: cashPaid,
        bank_paid: bankPaid,
        bank_receipt_image: receiptImage,
        manual_items: manualItemsPayload,
        skip_auto_calculations: true, // Always skip backend auto-calc to prevent duplication
      });

      toast.success("تم حفظ البيانات المالية بنجاح");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("فشل حفظ البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine category
  const getItemCategory = (item: OperationFinanceItem) => {
    if (item.category) return item.category; // Legacy/Pre-loaded
    if (item.operation_item) return item.operation_item.type;
    return "center"; // Default fallback?
  };

  const totalStaff = items
    .filter((i) => getItemCategory(i) === "staff")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalCenter = items
    .filter((i) => getItemCategory(i) !== "staff") // Assume anything not staff is center
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const grandTotal = totalStaff + totalCenter;

  const renderTabContent = (category: "staff" | "center") => (
    <Box sx={{ mt: 2 }}>
      {items
        .filter((i) => {
          const cat = getItemCategory(i);
          return category === "staff" ? cat === "staff" : cat !== "staff";
        })
        .map((item) => (
          <Box
            key={item.id}
            display="flex"
            gap={2}
            alignItems="center"
            mb={2}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "background.paper",
            }}
          >
            <Box flex={1}>
              <Autocomplete
                options={catalogue.filter(
                  (c) =>
                    c.type === category &&
                    !items.some(
                      (i) => i.id !== item.id && i.operation_item_id === c.id,
                    ),
                )}
                getOptionLabel={(option) => option.name}
                value={
                  item.operation_item_id
                    ? catalogue.find((c) => c.id === item.operation_item_id) ||
                      null
                    : null
                }
                onChange={(_, newValue) => {
                  if (newValue) {
                    // Update main item
                    setItems((prev) =>
                      prev.map((i) => {
                        if (i.id === item.id) {
                          return {
                            ...i,
                            operation_item_id: newValue.id,
                            operation_item: newValue,
                            description: newValue.name,
                            is_auto_calculated: false,
                          };
                        }
                        return i;
                      }),
                    );
                  } else {
                    // Clear - maybe reset to generic? Or null?
                    // If cleared, user might want to start over.
                    setItems((prev) =>
                      prev.map((i) => {
                        if (i.id === item.id) {
                          return {
                            ...i,
                            operation_item_id: null,
                            operation_item: undefined,
                            description: "",
                            is_auto_calculated: false,
                          };
                        }
                        return i;
                      }),
                    );
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="البند"
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              {/* Show description input if:
                  1. No ID selected (Null)
                  2. OR Generic ID selected (User wants to type custom name) 
               */}
              {(!item.operation_item_id ||
                item.operation_item_id === 17 ||
                item.operation_item_id === 18) && (
                <TextField
                  value={item.description || ""}
                  onChange={(e) =>
                    handleItemChange(item.id, "description", e.target.value)
                  }
                  placeholder={
                    item.operation_item_id ? "تفاصيل البند (مخصص)" : "اسم البند"
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
            <Box width={150}>
              <TextField
                label="المبلغ"
                type="number"
                value={item.amount}
                onChange={(e) =>
                  handleItemChange(item.id, "amount", Number(e.target.value))
                }
                size="small"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">د.ع</InputAdornment>
                  ),
                }}
              />
            </Box>
            <IconButton
              color="error"
              onClick={() => handleDeleteItem(item.id)}
              size="small"
            >
              <Trash2 size={18} />
            </IconButton>
          </Box>
        ))}
      <Button
        variant="outlined"
        startIcon={<Plus size={16} />}
        onClick={() => handleAddItem(category)}
        fullWidth
        sx={{ mt: 1, borderStyle: "dashed" }}
      >
        إضافة بند {category === "staff" ? "كادر" : "مركز"}
      </Button>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          البيانات المالية للعملية: {operation.operation_type}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box mb={4}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box p={3} bgcolor="action.hover" borderRadius={2}>
                <TextField
                  label="أتعاب الجراح (المبلغ الأساسي)"
                  type="number"
                  value={surgeonFee}
                  onChange={(e) =>
                    handleSurgeonFeeChange(Number(e.target.value))
                  }
                  fullWidth
                  variant="outlined"
                  helperText="* تغيير هذا المبلغ سيقوم بإعادة حساب النسب التلقائية (ما لم يتم التعديل اليدوي)"
                  InputProps={{
                    style: { fontSize: "1.25rem", fontWeight: "bold" },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            variant="fullWidth"
          >
            <Tab
              label={`الكوادر الطبية (${totalStaff.toLocaleString()})`}
              value="staff"
            />
            <Tab
              label={`المركز (${totalCenter.toLocaleString()})`}
              value="center"
            />
          </Tabs>
        </Box>

        <Box minHeight={200}>
          {tabValue === "staff" && renderTabContent("staff")}
          {tabValue === "center" && renderTabContent("center")}
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            تفاصيل الدفع
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                label="نقداً (Cash)"
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="بنك (Bank)"
                type="number"
                value={bankPaid}
                onChange={(e) => setBankPaid(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" display="block" mb={1}>
                إيصال التحويل (صورة)
              </Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={<Upload size={16} />}
                fullWidth
              >
                رفع صورة
                <input
                  type="file"
                  hidden
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </Button>
              {receiptPreview && (
                <Box mt={2}>
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    style={{
                      height: 80,
                      width: "auto",
                      objectFit: "cover",
                      borderRadius: 4,
                      border: "1px solid #ddd",
                    }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>

          <Box
            mt={3}
            p={3}
            bgcolor="grey.100"
            borderRadius={2}
            display="flex"
            justifyContent="space-between"
          >
            <Box textAlign="right">
              <Typography variant="body2" color="text.secondary">
                الإجمالي الكلي
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {grandTotal.toLocaleString()}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2" color="text.secondary">
                المدفوع
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                color={
                  cashPaid + bankPaid >= grandTotal
                    ? "success.main"
                    : "error.main"
                }
              >
                {(cashPaid + bankPaid).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={
            isLoading ? <Loader2 className="animate-spin" size={16} /> : null
          }
        >
          حفظ وتحديث
        </Button>
      </DialogActions>
    </Dialog>
  );
}
