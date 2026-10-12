// src/pages/reports/DoctorShiftDetailsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, User, Calendar, Clock, FileText, Eye, Printer, Receipt, Pencil, Trash2 } from "lucide-react";

// MUI imports
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

// Services and types
import { getActiveClinicPatients } from "@/services/clinicService";
import { getRequestedServicesForVisit } from "@/services/visitService";
import { getCostsReportData, getCostCategoriesList, updateCost, deleteCost } from "@/services/costService";
import type { DoctorShiftReportItem } from "@/types/reports";
import type { ActivePatientVisit } from "@/types/patients";
import type { RequestedService } from "@/types/services";
import type { Cost } from "@/types/finance";
import { formatNumber } from "@/lib/utils";
import RequestedServicesTable from "@/components/clinic/RequestedServicesTable";
import { webUrl } from "../constants";

const DoctorShiftDetailsPage: React.FC = () => {
  const { doctorShiftId } = useParams<{ doctorShiftId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shiftData, setShiftData] = useState<DoctorShiftReportItem | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ActivePatientVisit | null>(null);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [editCostForm, setEditCostForm] = useState({
    description: "",
    comment: "",
    cost_category_id: "" as number | "",
    amount: "",
    amount_bankak: "",
  });
  const [deletingCost, setDeletingCost] = useState<Cost | null>(null);

  // Get shift data from location state (passed from the report page) or sessionStorage
  useEffect(() => {
    const state = history.state;
    if (state?.shiftData) {
      setShiftData(state.shiftData);
    } else {
      // Fallback: try to get data from sessionStorage
      const storedData = sessionStorage.getItem('selectedShiftData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setShiftData(parsedData);
        } catch (error) {
          console.error('Error parsing stored shift data:', error);
        }
      }
    }
  }, []);

  // Fetch patients for this shift
  const {
    data: patients,
    isLoading: isLoadingPatients,
    error: patientsError,
  } = useQuery({
    queryKey: ["doctorShiftPatients", doctorShiftId],
    queryFn: () => getActiveClinicPatients({ doctor_shift_id: parseInt(doctorShiftId!) }),
    enabled: !!doctorShiftId,
  });

  // `getActiveClinicPatients` hits the lean active-patients endpoint, which
  // deliberately omits the requested-services line items (it only returns
  // `balance_due`, already correct below) — see DoctorVisitListItemResource.
  // Fetch each visit's services separately so the amount/discount/paid
  // columns and the services dialog have real data instead of reading
  // always-undefined fields.
  const serviceQueries = useQueries({
    queries: (patients ?? []).map((visit) => ({
      queryKey: ["requestedServicesForVisit", visit.id],
      queryFn: () => getRequestedServicesForVisit(visit.id),
      enabled: !!patients,
      staleTime: 60_000,
    })),
  });

  const servicesByVisitId = useMemo(() => {
    const map = new Map<number, RequestedService[]>();
    (patients ?? []).forEach((visit, idx) => {
      map.set(visit.id, serviceQueries[idx]?.data ?? []);
    });
    return map;
  }, [patients, serviceQueries]);

  // Costs recorded against this doctor shift (e.g. advances/expenses charged
  // to the doctor directly) — from the costs table, linked via doctor_shift_id.
  const {
    data: linkedCostsData,
    isLoading: isLoadingLinkedCosts,
  } = useQuery({
    queryKey: ["doctorShiftLinkedCosts", doctorShiftId],
    queryFn: () => getCostsReportData({ doctor_shift_id: doctorShiftId, per_page: 100 }),
    enabled: !!doctorShiftId,
  });

  const linkedCosts = useMemo(() => linkedCostsData?.data ?? [], [linkedCostsData]);
  const linkedCostsTotals = useMemo(
    () =>
      linkedCosts.reduce(
        (acc, c) => ({
          cash: acc.cash + (c.amount || 0),
          bank: acc.bank + (c.amount_bankak || 0),
          total: acc.total + (c.amount || 0) + (c.amount_bankak || 0),
        }),
        { cash: 0, bank: 0, total: 0 }
      ),
    [linkedCosts]
  );

  const { data: costCategories = [] } = useQuery({
    queryKey: ["costCategoriesList"],
    queryFn: () => getCostCategoriesList(),
  });

  const invalidateLinkedCosts = () =>
    queryClient.invalidateQueries({ queryKey: ["doctorShiftLinkedCosts", doctorShiftId] });

  const getErrorMessage = (err: unknown, fallback: string): string => {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || fallback;
  };

  const updateCostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCost>[1] }) => updateCost(id, data),
    onSuccess: () => {
      toast.success("تم تعديل المصروف بنجاح");
      invalidateLinkedCosts();
      setEditingCost(null);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "فشل تعديل المصروف")),
  });

  const deleteCostMutation = useMutation({
    mutationFn: (costId: number) => deleteCost(costId),
    onSuccess: () => {
      toast.success("تم حذف المصروف بنجاح");
      invalidateLinkedCosts();
      setDeletingCost(null);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "فشل حذف المصروف")),
  });

  const handleOpenEditCost = (cost: Cost) => {
    setEditingCost(cost);
    setEditCostForm({
      description: cost.description,
      comment: cost.comment ?? "",
      cost_category_id: cost.cost_category_id ?? "",
      amount: String(cost.amount),
      amount_bankak: String(cost.amount_bankak),
    });
  };

  const handleSaveEditCost = () => {
    if (!editingCost) return;
    updateCostMutation.mutate({
      id: editingCost.id,
      data: {
        description: editCostForm.description,
        comment: editCostForm.comment || null,
        cost_category_id: editCostForm.cost_category_id === "" ? null : Number(editCostForm.cost_category_id),
        amount: Number(editCostForm.amount) || 0,
        amount_bankak: Number(editCostForm.amount_bankak) || 0,
      },
    });
  };

  const computeVisitTotals = (services: RequestedService[]) => {
    const totalAmount = services.reduce((sum, s) => sum + s.price * s.count, 0);
    const totalDiscount = services.reduce(
      (sum, s) => sum + (s.price * s.count * (s.discount_per || 0)) / 100 + (s.discount || 0),
      0
    );
    const totalPaid = services.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
    return { totalAmount, totalDiscount, totalPaid };
  };

  // Use financial data from shift data (passed from previous page)
  const financialSummary = useMemo(() => {
    if (!shiftData) {
      return {
        total_income: 0,
        clinic_enurance: 0,
        cash_entitlement: 0,
        insurance_entitlement: 0,
        total_doctor_entitlement: 0,
      };
    }

    return {
      total_income: shiftData.total_income || 0,
      clinic_enurance: shiftData.clinic_enurance || 0,
      cash_entitlement: shiftData.cash_entitlement || 0,
      insurance_entitlement: shiftData.insurance_entitlement || 0,
      total_doctor_entitlement: shiftData.total_doctor_entitlement || 0,
    };
  }, [shiftData]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleShowServices = (patient: ActivePatientVisit) => {
    setSelectedPatient(patient);
    setIsServicesDialogOpen(true);
  };

  const handleCloseServicesDialog = () => {
    setIsServicesDialogOpen(false);
    setSelectedPatient(null);
  };

  const handlePrintReceipt = () => {
    console.log('Print receipt for patient:', selectedPatient?.id);
  };

  if (!doctorShiftId) {
    return (
      <Alert severity="error" className="m-3">
        معرف مناوبة الطبيب غير صحيح
      </Alert>
    );
  }

  if (!shiftData) {
    return (
      <Alert severity="warning" className="m-3">
        <Typography variant="body2" className="mb-1">
          لا يمكن تحميل بيانات المناوبة. يرجى العودة إلى صفحة التقارير والنقر على اسم الطبيب مرة أخرى.
        </Typography>
        <Button onClick={handleBack} variant="outlined" size="small" sx={{ mt: 1 }}>
          العودة إلى التقارير
        </Button>
      </Alert>
    );
  }

  if (patientsError) {
    return (
      <Alert severity="error" className="m-3">
        فشل في جلب البيانات: {patientsError?.message}
      </Alert>
    );
  }

  const summaryTiles = [
    { label: "إجمالي الإيرادات", value: financialSummary.total_income },
    { label: "تحمل العيادة", value: financialSummary.clinic_enurance },
    { label: "استحقاق كاش", value: financialSummary.cash_entitlement },
    { label: "استحقاق تأمين", value: financialSummary.insurance_entitlement },
    { label: "إجمالي الاستحقاق", value: financialSummary.total_doctor_entitlement, emphasize: true },
  ];

  const infoItems = [
    { icon: User, label: "الطبيب", value: `${shiftData.doctor_name}${shiftData.doctor_specialist_name ? ` — ${shiftData.doctor_specialist_name}` : ""}` },
    {
      icon: Calendar,
      label: "تاريخ المناوبة",
      value: shiftData.created_at
        ? new Date(shiftData.created_at).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" })
        : "-",
    },
    { icon: Clock, label: "وقت البداية", value: shiftData.formatted_start_time || "-" },
    { icon: Clock, label: "وقت الانتهاء", value: shiftData.formatted_end_time || "-" },
    { icon: User, label: "فتح المناوبة", value: shiftData.user_name_opened || "-" },
  ];

  return (
    <div className="container mx-auto py-3 sm:py-4 space-y-3 text-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Button onClick={handleBack} variant="outlined" size="small" startIcon={<ArrowRight className="h-4 w-4" />}>
            العودة
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">{shiftData.doctor_name || "جاري التحميل..."}</h1>
          <Chip
            label={`مناوبة #${shiftData.id} — ${shiftData.status ? "مفتوحة" : "مغلقة"}`}
            color={shiftData.status ? "success" : "default"}
            size="small"
            variant="outlined"
          />
        </div>
        <a href={`${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${doctorShiftId}`} target="_blank" rel="noreferrer">
          <Button variant="contained" size="small" startIcon={<Printer className="h-4 w-4" />}>
            طباعة التقرير
          </Button>
        </a>
      </div>

      {/* Financial summary — formal bordered strip */}
      <Card variant="outlined">
        <Box className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border rtl:divide-x-reverse">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="text-center px-2 py-2">
              <Typography variant="caption" color="text.secondary" className="block">
                {tile.label}
              </Typography>
              <Typography variant="subtitle1" className={tile.emphasize ? "font-bold" : "font-semibold"}>
                {formatNumber(tile.value)}
              </Typography>
            </div>
          ))}
        </Box>
      </Card>

      {/* Shift info — compact single strip */}
      <Card variant="outlined">
        <CardContent className="!py-2 flex flex-wrap gap-x-6 gap-y-1.5 items-center justify-between">
          {infoItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Typography variant="caption" color="text.secondary">{label}:</Typography>
              <Typography variant="body2" className="font-medium">{value}</Typography>
            </div>
          ))}
          {shiftData.general_shift_name && (
            <Typography variant="caption" color="text.secondary">{shiftData.general_shift_name}</Typography>
          )}
        </CardContent>
      </Card>

      {/* Linked Costs — costs table entries recorded against this doctor shift */}
      {!isLoadingLinkedCosts && linkedCosts.length > 0 && (
        <>
          <Typography variant="subtitle2" className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            المصروفات المرتبطة بالمناوبة ({linkedCosts.length})
          </Typography>
          <Card variant="outlined">
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center">الوصف</TableCell>
                  <TableCell align="center">الفئة</TableCell>
                  <TableCell align="center">نقدي</TableCell>
                  <TableCell align="center">بنكي</TableCell>
                  <TableCell align="center">الإجمالي</TableCell>
                  <TableCell align="center">بواسطة</TableCell>
                  <TableCell align="center">التاريخ</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {linkedCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell align="center" className="font-medium">{cost.description}</TableCell>
                    <TableCell align="center">{cost.cost_category_name || "-"}</TableCell>
                    <TableCell align="center">{formatNumber(cost.amount)}</TableCell>
                    <TableCell align="center">{formatNumber(cost.amount_bankak)}</TableCell>
                    <TableCell align="center" className="font-semibold text-red-600 dark:text-red-400">
                      {formatNumber(cost.amount + cost.amount_bankak)}
                    </TableCell>
                    <TableCell align="center">{cost.user_cost_name || "-"}</TableCell>
                    <TableCell align="center">{new Date(cost.created_at).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleOpenEditCost(cost)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDeletingCost(cost)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableBody>
                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                  <TableCell align="center" colSpan={2}>الإجمالي</TableCell>
                  <TableCell align="center">{formatNumber(linkedCostsTotals.cash)}</TableCell>
                  <TableCell align="center">{formatNumber(linkedCostsTotals.bank)}</TableCell>
                  <TableCell align="center" className="text-red-600 dark:text-red-400">{formatNumber(linkedCostsTotals.total)}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Patients List */}
      <Typography variant="subtitle2" className="flex items-center gap-1.5">
        <FileText className="h-4 w-4" />
        قائمة المرضى ({patients?.length || 0})
      </Typography>

      {isLoadingPatients ? (
        <div className="text-center py-6">
          <CircularProgress size={28} />
        </div>
      ) : patients && patients.length > 0 ? (
        <Card variant="outlined">
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">رقم الزيارة</TableCell>
                <TableCell align="center">اسم المريض</TableCell>
                <TableCell align="center">إجمالي المبلغ</TableCell>
                <TableCell align="center">الخصم</TableCell>
                <TableCell align="center">المدفوع</TableCell>
                <TableCell align="center">المتبقي</TableCell>
                <TableCell align="center">الخدمات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((visit) => {
                const services = servicesByVisitId.get(visit.id) ?? [];
                const { totalAmount, totalDiscount, totalPaid } = computeVisitTotals(services);
                const isLoadingServicesRow = serviceQueries.some(
                  (q, idx) => patients[idx]?.id === visit.id && q.isLoading
                );

                return (
                  <TableRow key={visit.id}>
                    <TableCell align="center">{visit.id}</TableCell>
                    <TableCell align="center" className="font-medium">{visit.patient.name}</TableCell>
                    <TableCell align="center" className="font-semibold">{formatNumber(totalAmount)}</TableCell>
                    <TableCell align="center">{formatNumber(totalDiscount)}</TableCell>
                    <TableCell align="center" className="text-green-600 dark:text-green-400">{formatNumber(totalPaid)}</TableCell>
                    <TableCell align="center" className="text-red-600 dark:text-red-400 font-semibold">{formatNumber(visit.balance_due)}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleShowServices(visit)}
                        startIcon={<Eye className="h-3.5 w-3.5" />}
                        disabled={isLoadingServicesRow}
                      >
                        {isLoadingServicesRow ? <CircularProgress size={14} /> : `عرض (${services.length})`}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Alert severity="info" sx={{ py: 0.5 }}>لا توجد زيارات مرضى لهذه المناوبة</Alert>
      )}

      {/* Services Dialog */}
      <Dialog open={isServicesDialogOpen} onClose={handleCloseServicesDialog} fullWidth maxWidth="lg">
        <DialogTitle className="flex items-center gap-2 !text-base">
          <FileText className="h-4 w-4" />
          الخدمات المطلوبة — {selectedPatient?.patient.name}
        </DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <RequestedServicesTable
              visitId={selectedPatient.id}
              visit={{
                id: selectedPatient.id,
                patient_id: selectedPatient.patient_id,
                doctor_id: selectedPatient.doctor_id,
                user_id: selectedPatient.user_id || 0,
                shift_id: selectedPatient.shift_id,
                visit_date: selectedPatient.created_at,
                visit_time: selectedPatient.visit_time,
                status: selectedPatient.status,
                visit_type: selectedPatient.visit_type,
                number: selectedPatient.number,
                is_new: selectedPatient.is_new,
                only_lab: selectedPatient.only_lab,
                patient: {
                  ...selectedPatient.patient,
                  patient_id: selectedPatient.patient_id,
                  phone: selectedPatient.patient.phone || '',
                },
                company: selectedPatient.patient.company,
                created_at: selectedPatient.created_at,
                updated_at: selectedPatient.updated_at,
              }}
              requestedServices={servicesByVisitId.get(selectedPatient.id) ?? []}
              isLoading={serviceQueries.some(
                (q, idx) => patients?.[idx]?.id === selectedPatient.id && q.isLoading
              )}
              currentClinicShiftId={shiftData?.shift_id || null}
              onAddMoreServices={() => {}}
              handlePrintReceipt={handlePrintReceipt}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseServicesDialog} size="small">إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Cost Dialog */}
      <Dialog open={!!editingCost} onClose={() => setEditingCost(null)} fullWidth maxWidth="xs">
        <DialogTitle className="!text-base">تعديل المصروف</DialogTitle>
        <DialogContent className="flex flex-col gap-3 !pt-2">
          <TextField
            label="الوصف"
            size="small"
            fullWidth
            value={editCostForm.description}
            onChange={(e) => setEditCostForm((f) => ({ ...f, description: e.target.value }))}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="edit-cost-category-label">الفئة</InputLabel>
            <Select
              labelId="edit-cost-category-label"
              label="الفئة"
              value={editCostForm.cost_category_id === "" ? "" : String(editCostForm.cost_category_id)}
              onChange={(e) =>
                setEditCostForm((f) => ({
                  ...f,
                  cost_category_id: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
            >
              <MenuItem value="">بدون فئة</MenuItem>
              {costCategories.map((cat) => (
                <MenuItem key={cat.id} value={String(cat.id)}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className="flex gap-2">
            <TextField
              label="نقدي"
              size="small"
              type="number"
              fullWidth
              value={editCostForm.amount}
              onChange={(e) => setEditCostForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <TextField
              label="بنكي"
              size="small"
              type="number"
              fullWidth
              value={editCostForm.amount_bankak}
              onChange={(e) => setEditCostForm((f) => ({ ...f, amount_bankak: e.target.value }))}
            />
          </div>
          <TextField
            label="ملاحظات"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={editCostForm.comment}
            onChange={(e) => setEditCostForm((f) => ({ ...f, comment: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCost(null)} size="small" disabled={updateCostMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveEditCost}
            size="small"
            variant="contained"
            disabled={updateCostMutation.isPending || !editCostForm.description.trim()}
            startIcon={updateCostMutation.isPending ? <CircularProgress size={14} /> : undefined}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Cost Confirmation */}
      <Dialog open={!!deletingCost} onClose={() => setDeletingCost(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="!text-base">تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت متأكد من حذف المصروف «{deletingCost?.description}»؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingCost(null)} size="small" disabled={deleteCostMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={() => deletingCost && deleteCostMutation.mutate(deletingCost.id)}
            size="small"
            variant="contained"
            color="error"
            disabled={deleteCostMutation.isPending}
            startIcon={deleteCostMutation.isPending ? <CircularProgress size={14} /> : undefined}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DoctorShiftDetailsPage;
