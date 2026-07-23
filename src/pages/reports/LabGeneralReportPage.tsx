// src/pages/reports/LabGeneralReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Loader2, Eye } from 'lucide-react';

// Helper function to format numbers with thousand separators
const formatNumber = (num: number | string): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0.00';
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

import type { LabGeneralReportFilters, LabGeneralReportWithUserRevenue, LabGeneralReportItem } from '@/types/reports';
import { getLabGeneralReport } from '@/services/reportService';
import { getUsers, getUsersWithLabDepositsForShift } from '@/services/userService';
import { getAllShifts } from '@/services/shiftService';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  Autocomplete,
  Pagination,
  Stack,
} from '@mui/material';
import { webUrl } from '../constants';

type LabGeneralReportFilterFormValues = {
  date_from?: string;
  date_to?: string;
  start_time?: string;
  end_time?: string;
  patient_name?: string;
  user_id?: string;
  shift_id?: string;
};

const LabGeneralReportPage: React.FC = () => {
  const defaultDateTo = format(new Date(), 'yyyy-MM-dd');

  const filterForm = useForm<LabGeneralReportFilterFormValues>({
    defaultValues: {
      date_from: defaultDateTo,
      date_to: defaultDateTo,
      start_time: '00:00',
      end_time: '23:59',
      patient_name: '',
      user_id: 'all',
      shift_id: 'all',
    },
  });

  const [appliedFilters, setAppliedFilters] = useState<LabGeneralReportFilters>({
    date_from: defaultDateTo,
    date_to: defaultDateTo,
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data for filters

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForReport'],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['shiftsListForReport'],
    queryFn: () => getAllShifts(),
  });


  const reportQueryKey = ['labGeneralReport', appliedFilters, currentPage] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<LabGeneralReportWithUserRevenue, Error>({
    queryKey: reportQueryKey,
    queryFn: () => {
      const { page, per_page, ...filters } = appliedFilters;
      return getLabGeneralReport({ page: currentPage, per_page: 20, ...filters });
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled: true, // Always enabled since we removed shift filter
  });

  const handleFilterSubmit = (data: LabGeneralReportFilterFormValues) => {
    const usingShift = data.shift_id && data.shift_id !== 'all';
    setAppliedFilters({
      shift_id: usingShift ? parseInt(data.shift_id!) : undefined,
      date_from: usingShift ? undefined : (data.date_from || undefined),
      date_to: usingShift ? undefined : (data.date_to || undefined),
      start_time: usingShift ? undefined : (data.start_time || undefined),
      end_time: usingShift ? undefined : (data.end_time || undefined),
      patient_name: data.patient_name || undefined,
      user_id: data.user_id && data.user_id !== 'all' ? parseInt(data.user_id) : undefined,
    });
    setCurrentPage(1);
  };


  const handleOpenPdfInNewTab = () => {
    // Build query parameters
    const params = new URLSearchParams();
    if (appliedFilters.date_from) params.append('date_from', appliedFilters.date_from);
    if (appliedFilters.date_to) params.append('date_to', appliedFilters.date_to);
    const currentStartTime = filterForm.getValues('start_time') || '00:00';
    const currentEndTime = filterForm.getValues('end_time') || '23:59';
    params.append('start_time', currentStartTime);
    params.append('end_time', currentEndTime);
    if (appliedFilters.patient_name) params.append('patient_name', appliedFilters.patient_name);
    if (appliedFilters.user_id) params.append('user_id', appliedFilters.user_id.toString());
    if (appliedFilters.shift_id) params.append('shift_id', appliedFilters.shift_id.toString());

    // Open PDF in new tab using web route
    const pdfUrl = `${webUrl}reports/lab-general/pdf?${params.toString()}`;
    window.open(pdfUrl, '_blank');
  };

  const patients = (reportData as LabGeneralReportWithUserRevenue & { data: LabGeneralReportItem[] })?.data || [];
  const userRevenues = reportData?.user_revenues || [];
  const meta = reportData?.meta;
  const isLoadingDropdowns = isLoadingUsers || isLoadingShifts;

  const watchedShiftId = filterForm.watch('shift_id');
  const shiftSelected = watchedShiftId !== 'all' && !!watchedShiftId;
  const dateTimeDisabled = isFetching || isLoadingDropdowns || shiftSelected;

  const shiftIdNum = shiftSelected ? parseInt(watchedShiftId!) : null;

  const { data: shiftUsers, isLoading: isLoadingShiftUsers } = useQuery({
    queryKey: ['usersForShiftLabDeposits', shiftIdNum],
    queryFn: () => getUsersWithLabDepositsForShift(shiftIdNum!),
    enabled: shiftIdNum !== null,
  });

  // When a shift is selected show only users who deposited in that shift; otherwise all users
  const availableUsers: { id: number | string; name: string }[] = shiftSelected
    ? (shiftUsers ?? [])
    : (users?.data ?? []);

  if (error) {
    return (
      <Alert severity="error" className="m-4">
        حدث خطأ أثناء الجلب: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">

      {/* Filters row */}
      <Card sx={{ p: 2, borderRadius: 3 }}>
        <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)}>
          <div className="flex flex-wrap items-center gap-3">
            <Controller
              control={filterForm.control}
              name="date_from"
              render={({ field }) => (
                <TextField
                  label="من تاريخ"
                  type="date"
                  size="small"
                  value={field.value}
                  onChange={(e) => { field.onChange(e); filterForm.setValue('shift_id', 'all'); }}
                  disabled={dateTimeDisabled}
                  sx={{ width: 160 }}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="date_to"
              render={({ field }) => (
                <TextField
                  label="إلى تاريخ"
                  type="date"
                  size="small"
                  value={field.value}
                  onChange={(e) => { field.onChange(e); filterForm.setValue('shift_id', 'all'); }}
                  disabled={dateTimeDisabled}
                  sx={{ width: 160 }}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="start_time"
              render={({ field }) => (
                <TextField
                  label="من وقت"
                  type="time"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={dateTimeDisabled}
                  slotProps={{ htmlInput: { step: 60 } }}
                  sx={{ width: 130 }}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="end_time"
              render={({ field }) => (
                <TextField
                  label="إلى وقت"
                  type="time"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={dateTimeDisabled}
                  slotProps={{ htmlInput: { step: 60 } }}
                  sx={{ width: 130 }}
                />
              )}
            />

            <Controller
              control={filterForm.control}
              name="shift_id"
              render={({ field }) => {
                const allOption = { id: 'all', label: 'كل المناوبات' };
                const shiftOptions = [
                  allOption,
                  ...(shifts || []).map(s => ({
                    id: s.id.toString(),
                    label: `#${s.id} — ${format(new Date(s.created_at), 'yyyy-MM-dd')}`,
                  })),
                ];
                const currentValue = shiftOptions.find(o => o.id === (field.value ?? 'all')) || allOption;
                return (
                  <Autocomplete
                    size="small"
                    options={shiftOptions}
                    getOptionLabel={(o) => o.label}
                    value={currentValue}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id ?? 'all');
                      filterForm.setValue('user_id', 'all');
                      filterForm.handleSubmit(handleFilterSubmit)();
                    }}
                    disabled={isLoadingDropdowns || isFetching}
                    sx={{ width: 220 }}
                    renderInput={(params) => (
                      <TextField {...params} label="المناوبة" placeholder="اختر المناوبة" />
                    )}
                  />
                );
              }}
            />

            <Controller
              control={filterForm.control}
              name="user_id"
              render={({ field }) => {
                const allOption = { id: 'all' as const, name: 'جميع المستخدمين' };
                const userOptions = [allOption, ...availableUsers];
                const currentValue = field.value === 'all'
                  ? allOption
                  : availableUsers.find((u) => u.id.toString() === field.value) || allOption;
                return (
                  <Autocomplete
                    size="small"
                    options={userOptions}
                    getOptionLabel={(o) => o.name}
                    value={currentValue}
                    onChange={(_, newValue) => field.onChange(newValue?.id.toString() || 'all')}
                    disabled={isLoadingDropdowns || isLoadingShiftUsers || isFetching}
                    loading={isLoadingShiftUsers}
                    sx={{ width: 200 }}
                    renderInput={(params) => (
                      <TextField {...params} label="المستخدم" placeholder="اختر المستخدم" />
                    )}
                  />
                );
              }}
            />

            <Button type="submit" variant="contained" disabled={isFetching || isLoadingDropdowns}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}
            </Button>

            <Button
              variant="outlined"
              onClick={handleOpenPdfInNewTab}
              disabled={isFetching || patients.length === 0}
              startIcon={<Eye className="h-4 w-4" />}
            >
              PDF
            </Button>

            {shiftSelected && (
              <Button
                type="button"
                variant="outlined"
                startIcon={<Eye className="h-4 w-4" />}
                onClick={() => window.open(`${webUrl}reports/lab-shift/pdf?shift=${watchedShiftId}`, '_blank')}
              >
                PDF المناوبة
              </Button>
            )}

            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </form>
      </Card>

      {(isLoading && !isFetching) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">جارِ تحديث القائمة...</div>}
      
      {!isLoading && !isFetching && patients.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>لا توجد بيانات مطابقة للمرشحات</CardContent>
        </Card>
      )}

      {/* User Revenue Section */}
      {userRevenues.length > 0 && (
        <Card>
          <CardHeader>
            <Typography variant="h6">ايراد حسب المستخدم</Typography>
          </CardHeader>
          <CardContent>
            <MUITable size="small" sx={{ '& .MuiTableCell-root': { py: '6px', fontSize: '0.875rem' } }}>
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>اسم المستخدم</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>إجمالي المدفوع</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>إجمالي التخفيض</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>إجمالي كاش</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>إجمالي بنك</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {userRevenues.map((userRevenue, index) => {
                  const totalPaid = Number(userRevenue.total_paid || 0);
                  const totalDiscount = Number(userRevenue.total_discount || 0);
                  const totalCash = Number(userRevenue.total_cash || 0);
                  const totalBank = Number(userRevenue.total_bank || 0);
                  
                  return (
                    <MUITableRow 
                      key={userRevenue.user_id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'inherit',
                      }}
                    >
                      <MUITableCell align="center" className="font-medium">{userRevenue.user_name}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(totalPaid)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(totalDiscount)}</MUITableCell>
                      <MUITableCell align="center">{formatNumber(totalCash)}</MUITableCell>
                      <MUITableCell align="center" sx={{ color: totalBank > 0 ? 'red' : 'inherit' }}>
                        {formatNumber(totalBank)}
                      </MUITableCell>
                    </MUITableRow>
                  );
                })}
                {/* Totals Row */}
                <MUITableRow sx={{ backgroundColor: '#3498db', color: 'white' }}>
                  <MUITableCell align="center" className="font-bold text-white!">الإجمالي</MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-base">
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_paid || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-base">
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_discount || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-base">
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_cash || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-base">
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_bank || 0), 0))}
                  </MUITableCell>
                </MUITableRow>
              </MUITableBody>
            </MUITable>
          </CardContent>
        </Card>
      )}

      {/* Patients Table */}
      {patients.length > 0 && (
        <Card>
          <CardHeader>
            <Typography variant="h6">المرضى {meta ? `(${meta.total})` : ''}</Typography>
          </CardHeader>
          <CardContent>
            <MUITable size="small" sx={{ '& .MuiTableCell-root': { py: '6px', fontSize: '0.875rem' } }}>
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>الزيارة</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>المريض</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>الطبيب</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>الشركة</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>التحاليل</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>المبالغ</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>المستخدم</MUITableCell>
                  <MUITableCell align="center" sx={{ fontWeight: 'bold' }}>الوقت</MUITableCell>
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {patients.map((patient, index) => {
                  const totalAmount = Number(patient.total_lab_amount || 0);
                  const totalPaid = Number(patient.total_paid_for_lab || 0);
                  const totalDiscount = Number(patient.discount || 0);
                  const totalBank = Number(patient.total_amount_bank || 0);
                  return (
                    <MUITableRow
                      key={patient.doctorvisit_id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'inherit',
                      }}
                    >
                      <MUITableCell align="center">{patient.doctorvisit_id}</MUITableCell>
                      <MUITableCell align="center" className="font-medium">{patient.name}</MUITableCell>
                      <MUITableCell align="center">{patient.doctor_name}</MUITableCell>
                      <MUITableCell align="center">{patient.company_name || '—'}</MUITableCell>
                      <MUITableCell align="center" sx={{ maxWidth: 260, whiteSpace: 'normal' }}>
                        {patient.main_tests_names || '—'}
                      </MUITableCell>
                      <MUITableCell align="center" sx={{ minWidth: 150 }}>
                        <Stack spacing={0} alignItems="center">
                          <Typography variant="body2" fontWeight={700}>
                            {formatNumber(totalAmount)}
                          </Typography>
                          <Typography variant="caption" color={totalPaid >= totalAmount - totalDiscount ? 'success.main' : 'warning.main'}>
                            مدفوع: {formatNumber(totalPaid)}
                          </Typography>
                          {totalDiscount > 0 && (
                            <Typography variant="caption" color="warning.main">
                              تخفيض: {formatNumber(totalDiscount)}
                            </Typography>
                          )}
                          {totalBank > 0 && (
                            <Typography variant="caption" color="error.main">
                              بنك: {formatNumber(totalBank)}
                            </Typography>
                          )}
                        </Stack>
                      </MUITableCell>
                      <MUITableCell align="center">{patient.user_name || '—'}</MUITableCell>
                      <MUITableCell align="center">
                        {patient.created_at ? format(new Date(patient.created_at), 'yyyy-MM-dd HH:mm') : '—'}
                      </MUITableCell>
                    </MUITableRow>
                  );
                })}
              </MUITableBody>
            </MUITable>

            {meta && meta.last_page > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ pt: 2 }}>
                <Pagination
                  count={meta.last_page}
                  page={currentPage}
                  onChange={(_, page) => setCurrentPage(page)}
                  disabled={isFetching}
                  color="primary"
                  shape="rounded"
                  size="small"
                />
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default LabGeneralReportPage;
