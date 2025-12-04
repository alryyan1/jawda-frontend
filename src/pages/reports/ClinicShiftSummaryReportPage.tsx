// src/pages/reports/ClinicShiftSummaryReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import {
  Loader2,
  Printer,
  XCircle,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import dayjs from "dayjs";

import type { Shift } from "@/types/shifts";
import { getShiftsList } from "@/services/shiftService";
import { getUsers, getUsersWithShiftTransactions, getUserShiftPatientTransactions, type PatientTransaction } from "@/services/userService";
import {
  downloadClinicShiftSummaryPdf,
  type ClinicReportPdfFilters,
} from "@/services/reportService";
import type { User } from "@/types/users";

interface UserWithTransactions extends User {
  total_paid?: number;
  total_bank?: number;
  total_cash?: number;
  total_cost?: number;
  total_cost_bank?: number;
  net_bank?: number;
  net_cash?: number;
}

const reportFilterSchema = z.object({
  shift: z.string().min(1, "هذا الحقل مطلوب"),
  user: z.string().nullable(),
});

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ClinicShiftSummaryReportPage: React.FC = () => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithTransactions | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [patientTransactions, setPatientTransactions] = useState<PatientTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<PatientTransaction | null>(null);

  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      shift: "",
      user: "all",
    },
  });

  // Fetch shifts for the dropdown
  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[], Error>(
    {
      queryKey: ["shiftsListForReportFilter"],
      queryFn: () => getShiftsList({ per_page: 0, is_closed: "" }),
    }
  );

  const selectedShiftId = form.watch("shift");

  // Fetch users for the dropdown - filter by shift if one is selected
  const { data: users, isLoading: isLoadingUsers } = useQuery<UserWithTransactions[], Error>({
    queryKey: ["usersListForReportFilter", selectedShiftId],
    queryFn: async () => {
      if (selectedShiftId && selectedShiftId !== "") {
        // Get users who have transactions in the selected shift
        return await getUsersWithShiftTransactions(parseInt(selectedShiftId));
      } else {
        // Get all users when no shift is selected
        const response = await getUsers();
        return response.data;
      }
    },
    enabled: true, // Always enabled, but will refetch when shift changes
  });

  const handleGeneratePdf = async (data: ReportFilterValues) => {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    try {
      const filters: ClinicReportPdfFilters = {
        shift: parseInt(data.shift),
        user: data.user && data.user !== "all" ? parseInt(data.user) : null,
      };
      const blob = await downloadClinicShiftSummaryPdf(filters);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      const apiError = error as ApiError;
      toast.error("فشل توليد ملف PDF", {
        description: apiError.response?.data?.message || apiError.message || "حدث خطأ غير معروف",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  const shiftOptions = useMemo(() => {
    return shifts?.map(s => ({
      label: `مناوبة #${s.id} ${dayjs(s.created_at).format('DD/MM/YYYY ')}`,
      id: s.id,
      originalShift: s 
    })) || [];
  }, [shifts]);

  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Reset user field when shift changes
  useEffect(() => {
    if (selectedShiftId) {
      form.setValue("user", "all");
    }
  }, [selectedShiftId, form]);

  const isLoadingDropdowns = isLoadingShifts || isLoadingUsers;

  const handleCellClick = async (user: UserWithTransactions, column: string) => {
    if (!selectedShiftId) return;
    
    setSelectedUser(user);
    setSelectedColumn(column);
    setDialogOpen(true);
    setIsLoadingTransactions(true);
    
    try {
      const transactions = await getUserShiftPatientTransactions(
        parseInt(selectedShiftId),
        user.id
      );
      setPatientTransactions(transactions);
    } catch (error) {
      console.error("Error fetching patient transactions:", error);
      toast.error("فشل تحميل تفاصيل المعاملات");
      setPatientTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const getColumnLabel = (column: string) => {
    const labels: Record<string, string> = {
      'total_paid': 'إجمالي المتحصلات',
      'total_bank': 'بنكك',
      'total_cash': 'نقدي',
      'net_bank': 'صاف بنكك',
      'net_cash': 'صافي النقديه',
    };
    return labels[column] || column;
  };

  const getFilteredTransactions = () => {
    if (!selectedColumn || !patientTransactions.length) return patientTransactions;
    
    return patientTransactions.map(visit => {
      const filtered = { ...visit };
      
      if (selectedColumn === 'total_paid') {
        // Show all transactions
        return filtered;
      } else if (selectedColumn === 'total_bank') {
        // Show only bank transactions
        filtered.lab_transactions = visit.lab_transactions.filter(t => t.is_bank);
        filtered.service_transactions = visit.service_transactions.filter(t => t.is_bank);
        filtered.total_lab_paid = filtered.total_lab_bank;
        filtered.total_service_paid = filtered.total_service_bank;
      } else if (selectedColumn === 'total_cash') {
        // Show only cash transactions
        filtered.lab_transactions = visit.lab_transactions.filter(t => !t.is_bank);
        filtered.service_transactions = visit.service_transactions.filter(t => !t.is_bank);
        filtered.total_lab_paid = filtered.total_lab_cash;
        filtered.total_service_paid = filtered.total_service_cash;
      }
      
      return filtered;
    }).filter(visit => 
      visit.lab_transactions.length > 0 || visit.service_transactions.length > 0
    );
  };

  const getTotalAmount = (visit: PatientTransaction) => {
    return visit.total_lab_paid + visit.total_service_paid;
  };

  return (
    <div className="space-y-6">
  
      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
          <Typography variant="body2" color="text.secondary">اختر المناوبة والمستخدم (اختياري) ثم اطبع التقرير</Typography>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleGeneratePdf)}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end"
          >
            <Controller
              name="shift"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  options={shiftOptions}
                  loading={isLoadingShifts}
                  getOptionLabel={(option) => option.label || ''}
                  value={shiftOptions.find(opt => String(opt.id) === field.value) || null}
                  onChange={(event, newValue) => {
                    field.onChange(newValue ? newValue.originalShift.id.toString() : "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={isGeneratingPdf}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={"اختر المناوبة"}
                      variant="outlined"
                      size="small"
                      error={!!form.formState.errors.shift}
                      helperText={form.formState.errors.shift?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingShifts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />

            <Controller
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="user-select-label">المستخدم</InputLabel>
                  <MUISelect
                    labelId="user-select-label"
                    label="المستخدم"
                    onChange={field.onChange}
                    value={field.value || "all"}
                    defaultValue={field.value || "all"}
                    disabled={isLoadingDropdowns || isGeneratingPdf}
                  >
                    <MenuItem value="all">كل المستخدمين</MenuItem>
                    {!selectedShiftId ? (
                      <MenuItem value="select_shift_first" disabled>اختر المناوبة أولاً</MenuItem>
                    ) : isLoadingUsers ? (
                      <MenuItem value="loading_users" disabled>جارِ التحميل...</MenuItem>
                    ) : users && users.length > 0 ? (
                      users.map((u) => (
                        <MenuItem key={u.id} value={String(u.id)}>
                          {u.name || u.username} ({u.username})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="no_users" disabled>لا يوجد مستخدمين لهذه المناوبة</MenuItem>
                    )}
                  </MUISelect>
                </FormControl>
              )}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isLoadingDropdowns || isGeneratingPdf}
              className="h-10 sm:mt-[26px]"
              startIcon={!isGeneratingPdf ? <Printer className="h-4 w-4" /> : undefined}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'طباعة التقرير'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table - Show when shift is selected */}
      {selectedShiftId && (
        <Card>
          <CardHeader>
            <Typography variant="h6">المستخدمين الذين لديهم معاملات في هذه المناوبة</Typography>
            <Typography variant="body2" color="text.secondary">
              قائمة المستخدمين الذين استلموا مبالغ مالية في المناوبة المحددة
            </Typography>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  جارِ التحميل...
                </Typography>
              </Box>
            ) : users && users.length > 0 ? (
              <Box>
                {users.map((user) => (
                  <Box key={user.id} mb={3}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      المستخدم: {user.name || user.username}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              البيان
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              إجمالي المتحصلات
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              بنكك
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              نقدي
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              صاف بنكك
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              صافي النقديه
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow
                            sx={{
                              '&:hover': { backgroundColor: 'action.selected' },
                            }}
                          >
                            <TableCell align="right">إجمالي الإيرادات</TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleCellClick(user, 'total_paid')}
                            >
                              {user.total_paid ? Number(user.total_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleCellClick(user, 'total_bank')}
                            >
                              {user.total_bank ? Number(user.total_bank).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleCellClick(user, 'total_cash')}
                            >
                              {user.total_cash ? Number(user.total_cash).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleCellClick(user, 'net_bank')}
                            >
                              {user.net_bank ? Number(user.net_bank).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleCellClick(user, 'net_cash')}
                            >
                              {user.net_cash ? Number(user.net_cash).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  لا يوجد مستخدمين لديهم معاملات في هذه المناوبة
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {isGeneratingPdf && !pdfUrl && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">
            جارِ توليد التقرير...
          </p>
        </div>
      )}

      {pdfUrl && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <Typography variant="h6">معاينة التقرير</Typography>
            <IconButton size="small" onClick={() => setPdfUrl(null)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </CardHeader>
          <CardContent>
            <iframe
              src={pdfUrl}
              className="w-full h-[75vh] border rounded-md"
              title={'ملخص مناوبة العيادة'}
            ></iframe>
          </CardContent>
        </Card>
      )}

      {/* Patient Transactions Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              تفاصيل المعاملات - {selectedUser?.name || selectedUser?.username}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </Box>
          {selectedColumn && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {getColumnLabel(selectedColumn)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {isLoadingTransactions ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                جارِ التحميل...
              </Typography>
            </Box>
          ) : getFilteredTransactions().length === 0 ? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                لا توجد معاملات
              </Typography>
            </Box>
          ) : (
            <Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 0.75 }}>رقم الزيارة</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 0.75 }}>اسم المريض</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 0.75 }}>اسم الطبيب</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem', py: 0.75 }}>إجمالي المبلغ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredTransactions().map((visit) => (
                      <TableRow 
                        key={visit.doctor_visit_id}
                        sx={{
                          '&:hover': { backgroundColor: 'action.selected' },
                        }}
                      >
                        <TableCell align="center" sx={{ fontSize: '0.875rem' }}>{visit.doctor_visit_id}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{visit.patient_name}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{visit.doctor_name}</TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          {Number(getTotalAmount(visit)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog - Shows lab and service transactions */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              تفاصيل الزيارة #{selectedVisit?.doctor_visit_id}
            </Typography>
            <IconButton size="small" onClick={() => setDetailsDialogOpen(false)}>
              <XCircle className="h-5 w-5" />
            </IconButton>
          </Box>
          {selectedVisit && (
            <Box mt={1}>
              <Typography variant="body2" color="text.secondary">
                المريض: {selectedVisit.patient_name} | الطبيب: {selectedVisit.doctor_name}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedVisit && (
            <Box>
              {selectedVisit.lab_transactions.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    معاملات المختبر
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>اسم الفحص</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>المبلغ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedVisit.lab_transactions.map((transaction, idx) => (
                          <TableRow key={idx}>
                            <TableCell align="right">{transaction.test_name}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={transaction.is_bank ? 'بنكك' : 'نقدي'} 
                                color={transaction.is_bank ? 'primary' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {dayjs(transaction.date).format('DD/MM/YYYY HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box mt={1}>
                    <Typography variant="body2">
                      <strong>إجمالي المختبر:</strong> {Number(selectedVisit.total_lab_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedVisit.service_transactions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    معاملات الخدمات
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>اسم الخدمة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>المبلغ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedVisit.service_transactions.map((transaction, idx) => (
                          <TableRow key={idx}>
                            <TableCell align="right">{transaction.service_name}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={transaction.is_bank ? 'بنكك' : 'نقدي'} 
                                color={transaction.is_bank ? 'primary' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {dayjs(transaction.date).format('DD/MM/YYYY HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box mt={1}>
                    <Typography variant="body2">
                      <strong>إجمالي الخدمات:</strong> {Number(selectedVisit.total_service_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedVisit.lab_transactions.length === 0 && selectedVisit.service_transactions.length === 0 && (
                <Box py={4} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد معاملات
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ClinicShiftSummaryReportPage;

