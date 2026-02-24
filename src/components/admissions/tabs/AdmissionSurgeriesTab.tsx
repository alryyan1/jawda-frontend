import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
} from "@mui/material";
import {
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  MedicalServices,
} from "@mui/icons-material";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { getDoctorsList } from "@/services/doctorService";
import { getSurgicalOperations } from "@/services/surgicalOperationService";
import type { SurgicalOperation } from "@/services/surgicalOperationService";
import type { DoctorStripped } from "@/types/doctors";

interface FinanceChargeItem {
  id: number;
  name: string;
  type: string;
  amount: number;
}

interface RequestedSurgeryFinanceItem {
  id: number;
  amount: number;
  finance_charge: FinanceChargeItem;
}

interface RequestedSurgeryItem {
  id: number;
  surgery_id: number;
  price: number;
  surgery: { id: number; name: string; price: number };
  doctor: { id: number; name: string } | null;
  user: { id: number; name: string } | null;
  finances: RequestedSurgeryFinanceItem[];
  created_at: string;
}

interface AdmissionSurgeriesTabProps {
  admissionId: number;
}

// API helpers
const getRequestedSurgeries = async (
  admissionId: number,
): Promise<RequestedSurgeryItem[]> => {
  const res = await apiClient.get(
    `/admissions/${admissionId}/requested-surgeries`,
  );
  return res.data?.data || res.data || [];
};

const createRequestedSurgery = async (
  admissionId: number,
  data: { surgery_id: number; doctor_id?: number | null },
): Promise<RequestedSurgeryItem> => {
  const res = await apiClient.post(
    `/admissions/${admissionId}/requested-surgeries`,
    data,
  );
  return res.data;
};

const deleteRequestedSurgery = async (
  admissionId: number,
  surgeryId: number,
): Promise<void> => {
  await apiClient.delete(
    `/admissions/${admissionId}/requested-surgeries/${surgeryId}`,
  );
};

const updateFinanceAmount = async (
  financeId: number,
  amount: number,
): Promise<void> => {
  await apiClient.patch(`/requested-surgery-finances/${financeId}`, { amount });
};

export default function AdmissionSurgeriesTab({
  admissionId,
}: AdmissionSurgeriesTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editAmounts, setEditAmounts] = useState<Record<number, string>>({});

  const queryKey = ["admissionRequestedSurgeries", admissionId];

  const { data: requestedSurgeries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getRequestedSurgeries(admissionId),
  });

  const { data: surgeries = [] } = useQuery({
    queryKey: ["surgicalOperations"],
    queryFn: getSurgicalOperations,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctorsList"],
    queryFn: () => getDoctorsList(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { surgery_id: number; doctor_id?: number | null }) =>
      createRequestedSurgery(admissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم إضافة العملية بنجاح");
      handleCloseDialog();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(
        err?.response?.data?.message || "حدث خطأ أثناء إضافة العملية",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRequestedSurgery(admissionId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم حذف العملية");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الحذف");
    },
  });

  const updateFinanceMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      updateFinanceAmount(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("تم تحديث المبلغ");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء التحديث");
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSurgeryId("");
    setSelectedDoctorId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurgeryId) return;
    createMutation.mutate({
      surgery_id: parseInt(selectedSurgeryId),
      doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
    });
  };

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          العمليات الجراحية المطلوبة
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsDialogOpen(true)}
          size="small"
        >
          إضافة عملية
        </Button>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : requestedSurgeries.length === 0 ? (
        <Box textAlign="center" py={6} color="text.secondary">
          <MedicalServices sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
          <Typography>لا توجد عمليات مطلوبة</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "grey.50" }}>
                <TableCell padding="checkbox" />
                <TableCell align="center">العملية</TableCell>
                <TableCell align="center">سعر العملية</TableCell>
                <TableCell align="center">التكاليف المالية</TableCell>
                <TableCell align="center">الطبيب</TableCell>
                <TableCell align="center">المسجّل</TableCell>
                <TableCell align="center">التاريخ</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requestedSurgeries.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow hover>
                    <TableCell padding="checkbox">
                      {item.finances.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(item.id)}
                        >
                          {expandedRows.has(item.id) ? (
                            <ExpandLess fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {item.surgery?.name}
                    </TableCell>
                    <TableCell align="center">{item.price}</TableCell>
                    <TableCell align="center">
                      {item.finances.length > 0 ? (
                        <Chip
                          label={`${item.finances.length} تكلفة`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          لا يوجد
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {item.doctor?.name || (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" color="text.secondary">
                        {item.user?.name || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" color="text.secondary">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(
                              "ar-SA",
                            )
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Expandable finance charges row */}
                  {item.finances.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{
                          p: 0,
                          borderBottom: expandedRows.has(item.id)
                            ? undefined
                            : "none",
                        }}
                      >
                        <Collapse in={expandedRows.has(item.id)} unmountOnExit>
                          <Box
                            sx={{ px: 6, py: 2, backgroundColor: "grey.50" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                              display="block"
                              mb={1}
                            >
                              تفصيل التكاليف المالية:
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>اسم التكلفة</TableCell>
                                  <TableCell align="center">النوع</TableCell>
                                  <TableCell align="center">المبلغ</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {item.finances.map((f) => (
                                  <TableRow key={f.id}>
                                    <TableCell>
                                      {f.finance_charge?.name}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={
                                          f.finance_charge?.type === "fixed"
                                            ? "ثابت"
                                            : "نسبة"
                                        }
                                        size="small"
                                        color={
                                          f.finance_charge?.type === "fixed"
                                            ? "default"
                                            : "info"
                                        }
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <TextField
                                        type="number"
                                        size="small"
                                        inputProps={{
                                          step: "any",
                                          style: {
                                            textAlign: "center",
                                            width: 90,
                                          },
                                        }}
                                        value={
                                          editAmounts[f.id] !== undefined
                                            ? editAmounts[f.id]
                                            : f.amount
                                        }
                                        onChange={(e) =>
                                          setEditAmounts((prev) => ({
                                            ...prev,
                                            [f.id]: e.target.value,
                                          }))
                                        }
                                        onBlur={() => {
                                          const val = editAmounts[f.id];
                                          if (
                                            val !== undefined &&
                                            parseFloat(val) !== f.amount
                                          ) {
                                            updateFinanceMutation.mutate({
                                              id: f.id,
                                              amount: parseFloat(val),
                                            });
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            (
                                              e.target as HTMLInputElement
                                            ).blur();
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Request Surgery Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>طلب عملية جراحية</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
          >
            <FormControl fullWidth required size="small">
              <InputLabel>العملية الجراحية *</InputLabel>
              <Select
                value={selectedSurgeryId}
                label="العملية الجراحية *"
                onChange={(e) => setSelectedSurgeryId(e.target.value)}
              >
                {(surgeries as SurgicalOperation[]).map((s) => (
                  <MenuItem key={s.id} value={s.id.toString()}>
                    {s.name} — {s.price}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>الطبيب المسؤول (اختياري)</InputLabel>
              <Select
                value={selectedDoctorId}
                label="الطبيب المسؤول (اختياري)"
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <MenuItem value="">
                  <em>بدون طبيب</em>
                </MenuItem>
                {(doctors as DoctorStripped[]).map((d) => (
                  <MenuItem key={d.id} value={d.id.toString()}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || !selectedSurgeryId}
            >
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
