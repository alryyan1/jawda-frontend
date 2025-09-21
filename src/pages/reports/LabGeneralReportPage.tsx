// src/pages/reports/LabGeneralReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Loader2, Search, CheckCircle, FileDown, Eye } from 'lucide-react';

import type { LabGeneralReportItem, LabGeneralReportFilters, LabGeneralReportWithUserRevenue } from '@/types/reports';
import type { PaginatedResponse } from '@/types/common';
import type { Shift } from '@/types/shifts';
import { getLabGeneralReport, downloadLabGeneralReportPdf } from '@/services/reportService';
import { getShiftsList } from '@/services/shiftService';
import { getUsers } from '@/services/userService';

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
} from '@mui/material';
import { webUrl } from '../constants';

const getLabGeneralReportFilterSchema = () => z.object({
  shift_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  patient_name: z.string().optional(),
  user_id: z.string().optional(),
});

type LabGeneralReportFilterFormValues = z.infer<ReturnType<typeof getLabGeneralReportFilterSchema>>;

const LabGeneralReportPage: React.FC = () => {
  const defaultDateTo = format(new Date(), 'yyyy-MM-dd');
  const defaultDateFrom = format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd');

  const filterForm = useForm<LabGeneralReportFilterFormValues>({
    resolver: zodResolver(getLabGeneralReportFilterSchema()),
    defaultValues: {
      shift_id: '',
      date_from: defaultDateFrom,
      date_to: defaultDateTo,
      patient_name: '',
      user_id: 'all',
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<LabGeneralReportFilters, 'page' | 'per_page'>>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
  });

  // Fetch data for filters
  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ['shiftsListForReport'],
    queryFn: () => getShiftsList({ per_page: 0 }),
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForReport'],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });

  // Set default shift when shifts are loaded
  React.useEffect(() => {
    if (shifts && shifts.length > 0) {
      // const lastShift = shifts[shifts.length - 1]; // Get the last (most recent) shift
      const lastShift = shifts[0]; // Get the last (most recent) shift
      console.log(lastShift.id, appliedFilters.shift_id, 'APPLIED FILTERS')
      setAppliedFilters(prev => ({
        ...prev,
        shift_id: lastShift.id
      }));
      filterForm.setValue('shift_id', lastShift.id.toString());
    }
  }, [shifts, appliedFilters.shift_id, filterForm]);

  const reportQueryKey = ['labGeneralReport', currentPage, appliedFilters] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<LabGeneralReportWithUserRevenue, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getLabGeneralReport({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
    enabled: !!appliedFilters.shift_id, // Only run when we have a shift_id
  });

  const handleFilterSubmit = (data: LabGeneralReportFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      shift_id: data.shift_id ? parseInt(data.shift_id) : undefined,
      date_from: data.date_from || undefined,
      date_to: data.date_to || undefined,
      patient_name: data.patient_name || undefined,
      user_id: data.user_id && data.user_id !== 'all' ? parseInt(data.user_id) : undefined,
    });
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadLabGeneralReportPdf(appliedFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lab_general_report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // You can add toast notification here if needed
    }
  };

  const handleOpenPdfInNewTab = () => {
    // Build query parameters
    const params = new URLSearchParams();
    if (appliedFilters.shift_id) params.append('shift_id', appliedFilters.shift_id.toString());
    if (appliedFilters.date_from) params.append('date_from', appliedFilters.date_from);
    if (appliedFilters.date_to) params.append('date_to', appliedFilters.date_to);
    if (appliedFilters.patient_name) params.append('patient_name', appliedFilters.patient_name);
    if (appliedFilters.user_id) params.append('user_id', appliedFilters.user_id.toString());

    // Open PDF in new tab using web route
    const pdfUrl = `${webUrl}reports/lab-general/pdf?${params.toString()}`;
    window.open(pdfUrl, '_blank');
  };

  const patients = reportData?.data || [];
  const userRevenues = reportData?.user_revenues || [];
  const meta = reportData?.meta;
  const isLoadingDropdowns = isLoadingShifts || isLoadingUsers;

  if (error) {
    return (
      <Alert severity="error" className="m-4">
        حدث خطأ أثناء الجلب: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
   
      
      <Card>
        <CardHeader>
          <Typography variant="h6">المرشحات</Typography>
        </CardHeader>
        <CardContent>
          <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              <Controller 
                control={filterForm.control} 
                name="shift_id" 
                render={({ field }) => {
                  // Set default to last shift if no value is set
                  const defaultShift = shifts && shifts.length > 0 && !field.value ? shifts[shifts.length - 1] : null;
                  const currentValue = shifts?.find(shift => shift.id.toString() === field.value) || defaultShift;
                  
                  return (
                    <Autocomplete
                      size="small"
                      options={shifts || []}
                      getOptionLabel={(option) => option ? `مناوبة ${option.id} - ${format(new Date(option.created_at), 'yyyy-MM-dd')}` : ''}
                      value={currentValue}
                      onChange={(_, newValue) => field.onChange(newValue?.id.toString() || '')}
                      disabled={isLoadingDropdowns || isFetching}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="المناوبة"
                          placeholder="اختر المناوبة"
                        />
                      )}
                    />
                  );
                }} 
              />
              
              <Controller 
                control={filterForm.control} 
                name="date_from" 
                render={({ field }) => (
                  <TextField 
                    label="من تاريخ" 
                    type="date" 
                    size="small" 
                    value={field.value} 
                    onChange={field.onChange} 
                    disabled={isFetching || isLoadingDropdowns} 
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
                    onChange={field.onChange} 
                    disabled={isFetching || isLoadingDropdowns} 
                  />
                )} 
              />
              
              <Controller 
                control={filterForm.control} 
                name="patient_name" 
                render={({ field }) => (
                  <TextField 
                    label="اسم المريض" 
                    type="search" 
                    size="small" 
                    value={field.value} 
                    onChange={field.onChange} 
                    disabled={isFetching} 
                    InputProps={{ 
                      startAdornment: <Search className="h-4 w-4 mr-2" /> 
                    }} 
                  />
                )} 
              />
              
              <Controller 
                control={filterForm.control} 
                name="user_id" 
                render={({ field }) => {
                  // Create options with "all" option
                  const allOption = { id: 'all', name: 'جميع المستخدمين' };
                  const userOptions = [allOption, ...(users?.data || [])];
                  
                  const currentValue = field.value === 'all' ? allOption : users?.data?.find((user: { id: number; name: string }) => user.id.toString() === field.value) || allOption;
                  
                  return (
                    <Autocomplete
                      size="small"
                      options={userOptions}
                      getOptionLabel={(option) => option ? option.name : ''}
                      value={currentValue}
                      onChange={(_, newValue) => field.onChange(newValue?.id.toString() || 'all')}
                      disabled={isLoadingDropdowns || isFetching}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="المستخدم"
                          placeholder="اختر المستخدم"
                        />
                      )}
                    />
                  );
                }} 
              />
              
              <Button 
                type="submit" 
                variant="contained" 
                className="h-9" 
                disabled={isFetching || isLoadingDropdowns}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
              </Button>
              
              <Button 
                type="button" 
                variant="outlined" 
                className="h-9" 
                onClick={handleDownloadPdf}
                disabled={isFetching || isLoadingDropdowns || patients.length === 0}
                startIcon={<FileDown className="h-4 w-4" />}
              >
                تحميل PDF
              </Button>
              
              <Button 
                type="button" 
                variant="outlined" 
                className="h-9" 
                onClick={handleOpenPdfInNewTab}
                disabled={isFetching || isLoadingDropdowns || patients.length === 0}
                startIcon={<Eye className="h-4 w-4" />}
              >
                عرض PDF
              </Button>
            </div>
          </form>
        </CardContent>
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
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center">اسم المستخدم</MUITableCell>
                  <MUITableCell align="center">إجمالي المدفوع</MUITableCell>
                  <MUITableCell align="center">إجمالي التخفيض</MUITableCell>
                  <MUITableCell align="center">إجمالي كاش</MUITableCell>
                  <MUITableCell align="center">إجمالي بنك</MUITableCell>
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
                      <MUITableCell align="center">{totalPaid.toFixed(2)}</MUITableCell>
                      <MUITableCell align="center">{totalDiscount.toFixed(2)}</MUITableCell>
                      <MUITableCell align="center">{totalCash.toFixed(2)}</MUITableCell>
                      <MUITableCell align="center" sx={{ color: totalBank > 0 ? 'red' : 'inherit' }}>
                        {totalBank.toFixed(2)}
                      </MUITableCell>
                    </MUITableRow>
                  );
                })}
                {/* Totals Row */}
                <MUITableRow sx={{ backgroundColor: '#323232', color: 'white' }}>
                  <MUITableCell align="center" className="font-bold text-white">الإجمالي</MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white">
                    {userRevenues.reduce((sum, u) => sum + Number(u.total_paid || 0), 0).toFixed(2)}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white">
                    {userRevenues.reduce((sum, u) => sum + Number(u.total_discount || 0), 0).toFixed(2)}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white">
                    {userRevenues.reduce((sum, u) => sum + Number(u.total_cash || 0), 0).toFixed(2)}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white">
                    {userRevenues.reduce((sum, u) => sum + Number(u.total_bank || 0), 0).toFixed(2)}
                  </MUITableCell>
                </MUITableRow>
              </MUITableBody>
            </MUITable>
          </CardContent>
        </Card>
      )}

      {patients.length > 0 && (
        <Card>
          <CardHeader>
            <Typography variant="h6">تفاصيل المرضى</Typography>
          </CardHeader>
          <CardContent>
            <MUITable size="small">
            <MUITableHead>
              <MUITableRow>
                <MUITableCell align="center">الرقم</MUITableCell>
                <MUITableCell align="center">الاسم</MUITableCell>
                <MUITableCell align="center">الطبيب</MUITableCell>
                <MUITableCell align="center">إجمالي مبلغ المختبر</MUITableCell>
                <MUITableCell align="center">إجمالي المدفوع للمختبر</MUITableCell>
                <MUITableCell align="center">الخصم</MUITableCell>
                <MUITableCell align="center">إجمالي المبلغ البنك</MUITableCell>
                <MUITableCell align="center">اسم الشركة</MUITableCell>
                <MUITableCell align="center">أسماء التحاليل الرئيسية</MUITableCell>
                <MUITableCell align="center">الحالة</MUITableCell>
              </MUITableRow>
            </MUITableHead>
            <MUITableBody>
              {patients.map((patient) => {
                const totalLabAmount = Number(patient.total_lab_amount || 0);
                const totalPaid = Number(patient.total_paid_for_lab || 0);
                const discount = Number(patient.discount || 0);
                const bankAmount = Number(patient.total_amount_bank || 0);
                const isFullyPaid = totalPaid >= totalLabAmount;
                const hasDiscount = discount > 0;
                
                return (
                  <MUITableRow 
                    key={patient.id}
                    sx={{
                      backgroundColor: hasDiscount ? '#fff3cd' : 'inherit', // Light yellow for discount rows
                    }}
                  >
                    <MUITableCell align="center" className="font-medium">{patient.doctorvisit_id}</MUITableCell>
                    <MUITableCell align="center">{patient.name}</MUITableCell>
                    <MUITableCell align="center">{patient.doctor_name}</MUITableCell>
                    <MUITableCell align="center">{totalLabAmount.toFixed(2)}</MUITableCell>
                    <MUITableCell align="center">{totalPaid.toFixed(2)}</MUITableCell>
                    <MUITableCell align="center">{discount.toFixed(2)}</MUITableCell>
                    <MUITableCell align="center" sx={{ color: bankAmount > 0 ? 'red' : 'inherit' }}>
                      {bankAmount.toFixed(2)}
                    </MUITableCell>
                    <MUITableCell align="center">{patient.company_name || '-'}</MUITableCell>
                    <MUITableCell align="center" className="max-w-xs truncate" title={patient.main_tests_names}>
                      {patient.main_tests_names}
                    </MUITableCell>
                    <MUITableCell align="center">
                      {isFullyPaid && <CheckCircle className="h-5 w-5 text-green-500" />}
                    </MUITableCell>
                  </MUITableRow>
                );
              })}
            </MUITableBody>
            </MUITable>
            {meta && (patients.length > 0) && (
              <div className="border-t pt-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="font-semibold">إجمالي المرضى: <span className="font-normal">{meta.total}</span></div>
                <div className="font-semibold">إجمالي مبلغ المختبر: <span className="font-normal">{patients.reduce((sum, p) => sum + Number(p.total_lab_amount || 0), 0).toFixed(2)}</span></div>
                <div className="font-semibold">إجمالي المدفوع: <span className="font-normal">{patients.reduce((sum, p) => sum + Number(p.total_paid_for_lab || 0), 0).toFixed(2)}</span></div>
                <div className="font-semibold">إجمالي الخصم: <span className="font-normal">{patients.reduce((sum, p) => sum + Number(p.discount || 0), 0).toFixed(2)}</span></div>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            الصفحة {meta.current_page} من {meta.last_page}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1 || isFetching}
            >
              السابق
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} 
              disabled={currentPage === meta.last_page || isFetching}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabGeneralReportPage;
