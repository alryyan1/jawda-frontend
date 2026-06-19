// src/pages/reports/LabGeneralReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { Loader2, Search, Eye, Filter } from 'lucide-react';

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
  Popover,
  Badge,
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
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  // Fetch data for filters

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForReport'],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['shiftsListForReport'],
    queryFn: () => getAllShifts(),
  });


  const reportQueryKey = ['labGeneralReport', appliedFilters] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<LabGeneralReportWithUserRevenue, Error>({
    queryKey: reportQueryKey,
    queryFn: () => {
      const { page, per_page, ...filters } = appliedFilters;
      return getLabGeneralReport({ page: 1, per_page: 20, ...filters });
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
    setFilterAnchorEl(null);
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

  const handleOpenDetailsPage = () => {
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

    // Navigate to details page
    navigate(`/reports/lab-general/details?${params.toString()}`);
  };

  const patients = (reportData as LabGeneralReportWithUserRevenue & { data: LabGeneralReportItem[] })?.data || [];
  const userRevenues = reportData?.user_revenues || [];
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

  const activeFilterCount = [
    appliedFilters.shift_id,
    appliedFilters.date_from,
    appliedFilters.user_id,
    appliedFilters.patient_name,
  ].filter(Boolean).length;

  if (error) {
    return (
      <Alert severity="error" className="m-4">
        حدث خطأ أثناء الجلب: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top action bar */}
      <div className="flex gap-3 items-center">
        <Badge badgeContent={activeFilterCount} color="error">
          <Button
            variant="outlined"
            startIcon={<Filter className="h-4 w-4" />}
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
          >
            المرشحات
          </Button>
        </Badge>

        <Button
          variant="outlined"
          onClick={handleOpenPdfInNewTab}
          disabled={isFetching || patients.length === 0}
          startIcon={<Eye className="h-4 w-4" />}
        >
          PDF
        </Button>

        <Button
          variant="contained"
          onClick={handleOpenDetailsPage}
          disabled={isFetching || patients.length === 0}
          startIcon={<Search className="h-4 w-4" />}
        >
          عرض التفاصيل
        </Button>

        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)}>
          <div className="flex flex-col gap-4 p-4" style={{ minWidth: 340 }}>
            <Typography variant="subtitle2" fontWeight="bold">المرشحات</Typography>

            {/* Date range */}
            <Controller
              control={filterForm.control}
              name="date_from"
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="من تاريخ"
                  type="date"
                  size="small"
                  value={field.value}
                  onChange={(e) => { field.onChange(e); filterForm.setValue('shift_id', 'all'); }}
                  disabled={dateTimeDisabled}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="date_to"
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="إلى تاريخ"
                  type="date"
                  size="small"
                  value={field.value}
                  onChange={(e) => { field.onChange(e); filterForm.setValue('shift_id', 'all'); }}
                  disabled={dateTimeDisabled}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="start_time"
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="من وقت"
                  type="time"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={dateTimeDisabled}
                  slotProps={{ htmlInput: { step: 60 } }}
                />
              )}
            />
            <Controller
              control={filterForm.control}
              name="end_time"
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="إلى وقت"
                  type="time"
                  size="small"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={dateTimeDisabled}
                  slotProps={{ htmlInput: { step: 60 } }}
                />
              )}
            />

            {/* Shift */}
            <Controller
              control={filterForm.control}
              name="shift_id"
              render={({ field }) => {
                const allOption = { id: 'all', label: 'كل المناوبات' };
                const shiftOptions = [
                  allOption,
                  ...(shifts || []).map(s => ({
                    id: s.id.toString(),
                    label: `#${s.id} — ${format(new Date(s.created_at), 'yyyy-MM-dd')}${s.is_closed ? ' (مغلقة)' : ' (مفتوحة)'}`,
                  })),
                ];
                const currentValue = shiftOptions.find(o => o.id === (field.value ?? 'all')) || allOption;
                return (
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={shiftOptions}
                    getOptionLabel={(o) => o.label}
                    value={currentValue}
                    onChange={(_, newValue) => field.onChange(newValue?.id ?? 'all')}
                    disabled={isLoadingDropdowns || isFetching}
                    renderInput={(params) => (
                      <TextField {...params} label="المناوبة" placeholder="اختر المناوبة" />
                    )}
                  />
                );
              }}
            />

            {/* User */}
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
                    fullWidth
                    size="small"
                    options={userOptions}
                    getOptionLabel={(o) => o.name}
                    value={currentValue}
                    onChange={(_, newValue) => field.onChange(newValue?.id.toString() || 'all')}
                    disabled={isLoadingDropdowns || isLoadingShiftUsers || isFetching}
                    loading={isLoadingShiftUsers}
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
          </div>
        </form>
      </Popover>

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



    </div>
  );
};

export default LabGeneralReportPage;
