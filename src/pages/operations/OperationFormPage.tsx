import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ManualFinanceItem } from "../../types/operations";
import { operationService } from "../../services/operationService";

interface CalculatedItems {
  surgeon: number;
  assistant: number;
  anesthesia: number;
  centerShare: number;
}

export default function OperationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Form state
  const [formData, setFormData] = useState({
    admission_id: null as number | null,
    operation_date: new Date().toISOString().split("T")[0],
    operation_time: "",
    operation_type: "",
    description: "",
    surgeon_fee: 0,
    cash_paid: 0,
    bank_paid: 0,
    notes: "",
    status: "pending" as const,
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [manualItems, setManualItems] = useState<ManualFinanceItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculated values
  const [calculated, setCalculated] = useState<CalculatedItems>({
    surgeon: 0,
    assistant: 0,
    anesthesia: 0,
    centerShare: 0,
  });

  const [totals, setTotals] = useState({
    staff: 0,
    center: 0,
    total: 0,
    paid: 0,
    balance: 0,
  });

  // Load existing operation in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadOperation(parseInt(id));
    }
  }, [id, isEditMode]);

  const loadOperation = async (operationId: number) => {
    try {
      setLoading(true);
      const response = await operationService.getOperation(operationId);
      const operation = response.data;

      setFormData({
        admission_id: operation.admission_id,
        operation_date: operation.operation_date,
        operation_time: operation.operation_time || "",
        operation_type: operation.operation_type,
        description: operation.description || "",
        surgeon_fee: operation.surgeon_fee,
        cash_paid: operation.cash_paid,
        bank_paid: operation.bank_paid,
        notes: operation.notes || "",
        status: operation.status,
      });

      // Extract manual items from finance_items
      if (operation.finance_items) {
        const manual = operation.finance_items
          .filter((item) => !item.is_auto_calculated)
          .map((item) => ({
            item_type: item.item_type,
            category: item.category,
            description: item.description || undefined,
            amount: item.amount,
          }));
        setManualItems(manual);
      }
    } catch (error) {
      console.error("Error loading operation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate when surgeon fee changes
  useEffect(() => {
    const surgeonFee = formData.surgeon_fee || 0;

    setCalculated({
      surgeon: surgeonFee,
      assistant: surgeonFee * 0.1,
      anesthesia: surgeonFee * 0.5,
      centerShare: surgeonFee * 1.0,
    });
  }, [formData.surgeon_fee]);

  // Recalculate totals when calculated items or manual items change
  useEffect(() => {
    // Staff total: surgeon + assistant + anesthesia + manual staff items
    const autoStaff =
      calculated.surgeon + calculated.assistant + calculated.anesthesia;
    const manualStaff = manualItems
      .filter((item) => item.category === "staff")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalStaff = autoStaff + manualStaff;

    // Center total: center share + manual center items
    const autoCenter = calculated.centerShare;
    const manualCenter = manualItems
      .filter((item) => item.category === "center")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalCenter = autoCenter + manualCenter;

    const total = totalStaff + totalCenter;
    const paid = (formData.cash_paid || 0) + (formData.bank_paid || 0);
    const balance = total - paid;

    setTotals({
      staff: totalStaff,
      center: totalCenter,
      total,
      paid,
      balance,
    });
  }, [calculated, manualItems, formData.cash_paid, formData.bank_paid]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      {
        item_type: "consumables",
        category: "center",
        description: "",
        amount: 0,
      },
    ]);
  };

  const handleManualItemChange = (
    index: number,
    field: keyof ManualFinanceItem,
    value: any,
  ) => {
    setManualItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const data = {
        ...formData,
        bank_receipt_image: receiptFile,
        manual_items: manualItems.length > 0 ? manualItems : undefined,
      };

      if (isEditMode && id) {
        await operationService.updateOperation(parseInt(id), data);
      } else {
        await operationService.createOperation(data);
      }

      navigate("/operations");
    } catch (error) {
      console.error("Error saving operation:", error);
      alert("حدث خطأ أثناء حفظ العملية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate("/operations")}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4">
          {isEditMode ? "تعديل عملية جراحية" : "عملية جراحية جديدة"}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Form Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              معلومات العملية
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="تاريخ العملية"
                  type="date"
                  value={formData.operation_date}
                  onChange={(e) =>
                    handleInputChange("operation_date", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="وقت العملية"
                  type="time"
                  value={formData.operation_time}
                  onChange={(e) =>
                    handleInputChange("operation_time", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="نوع العملية"
                  value={formData.operation_type}
                  onChange={(e) =>
                    handleInputChange("operation_type", e.target.value)
                  }
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="وصف العملية"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  multiline
                  rows={3}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  الحسابات المالية
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="نصيب الجراح الأساسي ($)"
                  type="number"
                  value={formData.surgeon_fee}
                  onChange={(e) =>
                    handleInputChange(
                      "surgeon_fee",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  required
                  helperText="سيتم حساب النسب التلقائية بناءً على هذا المبلغ"
                />
              </Grid>

              {isEditMode && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الحالة"
                    select
                    value={formData.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                  >
                    <MenuItem value="pending">قيد الانتظار</MenuItem>
                    <MenuItem value="completed">مكتملة</MenuItem>
                    <MenuItem value="cancelled">ملغاة</MenuItem>
                  </TextField>
                </Grid>
              )}
            </Grid>

            {/* Auto-calculated Items Display */}
            {formData.surgeon_fee > 0 && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  الحسابات التلقائية - بناءً على نصيب الجراح
                </Alert>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>البند</TableCell>
                      <TableCell>التصنيف</TableCell>
                      <TableCell align="right">المبلغ ($)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>أخصائي جراحة</TableCell>
                      <TableCell>كادر</TableCell>
                      <TableCell align="right">
                        {calculated.surgeon.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>مساعد جراح (10%)</TableCell>
                      <TableCell>كادر</TableCell>
                      <TableCell align="right">
                        {calculated.assistant.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>أخصائي تخدير (50%)</TableCell>
                      <TableCell>كادر</TableCell>
                      <TableCell align="right">
                        {calculated.anesthesia.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>نصيب المركز (100%)</TableCell>
                      <TableCell>مركز</TableCell>
                      <TableCell align="right">
                        {calculated.centerShare.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Manual Items Section */}
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">بنود إضافية يدوية</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddManualItem}
                  size="small"
                >
                  إضافة بند
                </Button>
              </Box>

              {manualItems.map((item, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="النوع"
                          select
                          value={item.item_type}
                          onChange={(e) =>
                            handleManualItemChange(
                              index,
                              "item_type",
                              e.target.value,
                            )
                          }
                          size="small"
                        >
                          <MenuItem value="consumables">مستهلكات</MenuItem>
                          <MenuItem value="equipment">معدات وأجهزة</MenuItem>
                          <MenuItem value="radiology">
                            أشعة داخل العملية
                          </MenuItem>
                          <MenuItem value="accommodation">إقامة</MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12} sm={2}>
                        <TextField
                          fullWidth
                          label="التصنيف"
                          select
                          value={item.category}
                          onChange={(e) =>
                            handleManualItemChange(
                              index,
                              "category",
                              e.target.value as "staff" | "center",
                            )
                          }
                          size="small"
                        >
                          <MenuItem value="staff">كادر</MenuItem>
                          <MenuItem value="center">مركز</MenuItem>
                        </TextField>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="الوصف"
                          value={item.description || ""}
                          onChange={(e) =>
                            handleManualItemChange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          size="small"
                        />
                      </Grid>

                      <Grid item xs={10} sm={2}>
                        <TextField
                          fullWidth
                          label="المبلغ ($)"
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            handleManualItemChange(
                              index,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          size="small"
                        />
                      </Grid>

                      <Grid item xs={2} sm={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteManualItem(index)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Payment Section */}
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                الدفعات
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الدفع كاش ($)"
                    type="number"
                    value={formData.cash_paid}
                    onChange={(e) =>
                      handleInputChange(
                        "cash_paid",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الدفع بنكي ($)"
                    type="number"
                    value={formData.bank_paid}
                    onChange={(e) =>
                      handleInputChange(
                        "bank_paid",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </Grid>

                {formData.bank_paid > 0 && (
                  <Grid item xs={12}>
                    <Button variant="outlined" component="label">
                      رفع إيصال التحويل البنكي
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) =>
                          setReceiptFile(e.target.files?.[0] || null)
                        }
                      />
                    </Button>
                    {receiptFile && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        الملف: {receiptFile.name}
                      </Typography>
                    )}
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ملاحظات"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: "sticky", top: 20 }}>
            <Typography variant="h6" gutterBottom>
              الملخص المالي
            </Typography>

            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  إجمالي الكادر
                </Typography>
                <Typography variant="h6">${totals.staff.toFixed(2)}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" color="textSecondary">
                  إجمالي المركز
                </Typography>
                <Typography variant="h6">
                  ${totals.center.toFixed(2)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" color="textSecondary">
                  الإجمالي الكلي
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${totals.total.toFixed(2)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" color="textSecondary">
                  المدفوع
                </Typography>
                <Typography variant="h6" color="success.main">
                  ${totals.paid.toFixed(2)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="body2" color="textSecondary">
                  الرصيد المتبقي
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={totals.balance > 0 ? "warning.main" : "success.main"}
                >
                  ${totals.balance.toFixed(2)}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !formData.operation_type ||
                  formData.surgeon_fee <= 0
                }
                sx={{ mt: 2 }}
              >
                {isEditMode ? "تحديث" : "حفظ"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
