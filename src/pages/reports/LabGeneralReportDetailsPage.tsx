// src/pages/reports/LabGeneralReportDetailsPage.tsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Loader2, ArrowLeft } from 'lucide-react';

// Helper function to format numbers with thousand separators
const formatNumber = (num: number | string): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0.00';
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper function to format date and time in AM/PM format
const formatDateTime = (dateTimeString: string): string => {
  try {
    const date = new Date(dateTimeString);
    return format(date, 'yyyy-MM-dd hh:mm a');
  } catch (error) {
    return 'غير محدد';
  }
};

import type { LabGeneralReportFilters, LabGeneralReportWithUserRevenue, LabGeneralReportItem } from '@/types/reports';
import { getLabGeneralReport } from '@/services/reportService';
import { getUsers } from '@/services/userService';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  Autocomplete,
  TextField,
  Box,
  Chip,
  Paper,
} from '@mui/material';

const LabGeneralReportDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');

  // Fetch users for filter dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForReportDetails'],
    queryFn: () => getUsers(1, { per_page: 200 }),
  });

  // Extract filters from URL parameters
  const appliedFilters: Omit<LabGeneralReportFilters, 'page' | 'per_page'> = {
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    start_time: searchParams.get('start_time') || undefined,
    end_time: searchParams.get('end_time') || undefined,
    patient_name: searchParams.get('patient_name') || undefined,
    user_id: searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : undefined,
  };

  // Initialize all filters from URL params
  React.useEffect(() => {
    const userIdFromUrl = searchParams.get('user_id');
    const dateFromUrl = searchParams.get('date_from');
    const dateToUrl = searchParams.get('date_to');
    const startTimeUrl = searchParams.get('start_time');
    const endTimeUrl = searchParams.get('end_time');
    const patientNameUrl = searchParams.get('patient_name');
    
    setSelectedUserId(userIdFromUrl || 'all');
    setDateFrom(dateFromUrl || '');
    setDateTo(dateToUrl || '');
    setStartTime(startTimeUrl || '');
    setEndTime(endTimeUrl || '');
    setPatientName(patientNameUrl || '');
  }, [searchParams]);

  const reportQueryKey = ['labGeneralReportDetails', currentPage, appliedFilters] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<LabGeneralReportWithUserRevenue, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getLabGeneralReport({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
    enabled: true,
  });


  const handleGoBack = () => {
    navigate('/reports/lab-general');
  };

  const updateUrlParams = (key: string, value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value === '' || value === 'all') {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, value);
    }
    setSearchParams(newSearchParams);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleUserFilterChange = (userId: string) => {
    setSelectedUserId(userId);
    updateUrlParams('user_id', userId);
  };

  const handleDateFromChange = (date: string) => {
    setDateFrom(date);
    updateUrlParams('date_from', date);
  };

  const handleDateToChange = (date: string) => {
    setDateTo(date);
    updateUrlParams('date_to', date);
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    updateUrlParams('start_time', time);
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    updateUrlParams('end_time', time);
  };

  const handlePatientNameChange = (name: string) => {
    setPatientName(name);
    updateUrlParams('patient_name', name);
  };

  const clearAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStartTime('');
    setEndTime('');
    setPatientName('');
    setSelectedUserId('all');
    setCurrentPage(1);
    
    // Clear all URL parameters
    setSearchParams({});
  };

  const patients = (reportData as LabGeneralReportWithUserRevenue & { data: LabGeneralReportItem[] })?.data || [];
  const meta = reportData?.meta;

  // Calculate totals from patients data
  const totals = React.useMemo(() => {
    const totalPaid = patients.reduce((sum, patient) => sum + Number(patient.total_paid_for_lab || 0), 0);
    const totalCash = patients.reduce((sum, patient) => {
      const paid = Number(patient.total_paid_for_lab || 0);
      const bank = Number(patient.total_amount_bank || 0);
      return sum + (paid - bank);
    }, 0);
    const totalBank = patients.reduce((sum, patient) => sum + Number(patient.total_amount_bank || 0), 0);
    const totalDiscount = patients.reduce((sum, patient) => sum + Number(patient.discount || 0), 0);
    
    return {
      totalPaid,
      totalCash,
      totalBank,
      totalDiscount,
      patientCount: meta?.total || 0
    };
  }, [patients, meta]);

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Alert severity="error" className="m-4">
          حدث خطأ أثناء الجلب: {error.message}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={handleGoBack}
        >
          العودة للتقرير
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with back button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Typography variant="h6">تفاصيل تقرير المختبر العام</Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={handleGoBack}
            >
              العودة للتقرير
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Section */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: 2, 
            mb: 3 
          }}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                عدد المرضى
              </Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {totals.patientCount}
              </Typography>
            </Paper>
            
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#e8f5e8',
                border: '1px solid #c8e6c9'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                إجمالي المدفوع
              </Typography>
              <Typography variant="h6" color="success.main" fontWeight="bold">
                {formatNumber(totals.totalPaid)}
              </Typography>
            </Paper>
            
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#fff3e0',
                border: '1px solid #ffcc02'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                إجمالي كاش
              </Typography>
              <Typography variant="h6" color="warning.main" fontWeight="bold">
                {formatNumber(totals.totalCash)}
              </Typography>
            </Paper>
            
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#ffebee',
                border: '1px solid #ffcdd2'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                إجمالي بنك
              </Typography>
              <Typography variant="h6" color="error.main" fontWeight="bold">
                {formatNumber(totals.totalBank)}
              </Typography>
            </Paper>
            
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#f3e5f5',
                border: '1px solid #e1bee7'
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                إجمالي الخصم
              </Typography>
              <Typography variant="h6" color="secondary.main" fontWeight="bold">
                {formatNumber(totals.totalDiscount)}
              </Typography>
            </Paper>
          </Box>

          {/* Filters Section */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            {/* Date From */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                من تاريخ
              </Typography>
              <TextField
                size="small"
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                fullWidth
              />
            </Box>

            {/* Date To */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                إلى تاريخ
              </Typography>
              <TextField
                size="small"
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                fullWidth
              />
            </Box>

            {/* Start Time */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                من وقت
              </Typography>
              <TextField
                size="small"
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                fullWidth
                inputProps={{ step: 60 }}
              />
            </Box>

            {/* End Time */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                إلى وقت
              </Typography>
              <TextField
                size="small"
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                fullWidth
                inputProps={{ step: 60 }}
              />
            </Box>

            {/* Patient Name */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                اسم المريض
              </Typography>
              <TextField
                size="small"
                value={patientName}
                onChange={(e) => handlePatientNameChange(e.target.value)}
                placeholder="ابحث عن اسم المريض"
                fullWidth
              />
            </Box>

            {/* User Filter */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                المستخدم
              </Typography>
              <Autocomplete
                size="small"
                options={[
                  { id: 'all', name: 'جميع المستخدمين' },
                  ...(users?.data || [])
                ]}
                getOptionLabel={(option) => option ? option.name : ''}
                value={
                  selectedUserId === 'all' 
                    ? { id: 'all', name: 'جميع المستخدمين' }
                    : users?.data?.find((user: { id: number; name: string }) => user.id.toString() === selectedUserId) || { id: 'all', name: 'جميع المستخدمين' }
                }
                onChange={(_, newValue) => handleUserFilterChange(newValue?.id.toString() || 'all')}
                disabled={isLoadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="جميع المستخدمين"
                  />
                )}
              />
            </Box>
          </Box>

          {/* Applied Filters Display */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                المرشحات المطبقة:
              </Typography>
            {dateFrom && (
              <Chip 
                label={`من: ${dateFrom}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {dateTo && (
              <Chip 
                label={`إلى: ${dateTo}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {startTime && (
              <Chip 
                label={`من وقت: ${startTime}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {endTime && (
              <Chip 
                label={`إلى وقت: ${endTime}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {patientName && (
              <Chip 
                label={`اسم المريض: ${patientName}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {selectedUserId !== 'all' && (
              <Chip 
                label={`المستخدم: ${users?.data?.find(u => u.id.toString() === selectedUserId)?.name || 'غير محدد'}`} 
                size="small" 
                variant="outlined" 
                color="primary"
              />
            )}
            </Box>
            
            {/* Clear Filters Button */}
            {(dateFrom || dateTo || startTime || endTime || patientName || selectedUserId !== 'all') && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={clearAllFilters}
                sx={{ ml: 2 }}
              >
                مسح جميع المرشحات
              </Button>
            )}
          </Box>
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
   

      {/* Patient Details Table */}
      {patients.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Typography variant="h6">تفاصيل المرضى</Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي: {meta?.total || 0} مريض
              </Typography>
            </div>
          </CardHeader>
          <CardContent>
            <MUITable size="small">
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell className="font-medium " align="center">الرقم</MUITableCell>
                  <MUITableCell className="font-medium " align="center">الاسم</MUITableCell>
                  <MUITableCell className="font-medium " align="center">المستخدم</MUITableCell>
                  <MUITableCell className="font-medium " align="center">تاريخ الإنشاء</MUITableCell>
                  {/* <MUITableCell className="font-medium " align="center">الطبيب</MUITableCell> */}
                  <MUITableCell className="font-medium " align="center"> مبلغ </MUITableCell>
                  <MUITableCell className="font-medium " align="center"> المدفوع </MUITableCell>
                  <MUITableCell className="font-medium " align="center">الخصم</MUITableCell>
                  <MUITableCell className="font-medium " align="center">  البنك</MUITableCell>
                  <MUITableCell className="font-medium " align="center">اسم الشركة</MUITableCell>
                  <MUITableCell className="font-medium " align="center"> التحاليل </MUITableCell>
                  {/* <MUITableCell className="font-medium " align="center">الحالة</MUITableCell> */}
                  {/* <MUITableCell className="font-medium " align="center">التفاصيل</MUITableCell> */}
                </MUITableRow>
              </MUITableHead>
              <MUITableBody>
                {patients.map((patient: LabGeneralReportItem) => {
                  const totalLabAmount = Number(patient.total_lab_amount || 0);
                  const totalPaid = Number(patient.total_paid_for_lab || 0);
                  const discount = Number(patient.discount || 0);
                  const bankAmount = Number(patient.total_amount_bank || 0);
                  const hasDiscount = discount > 0;
                  
                  return (
                    <MUITableRow 
                      key={patient.id}
                      sx={{
                        backgroundColor: hasDiscount ? '#fff3cd' : 'inherit', // Light yellow for discount rows
                      }}
                    >
                      <MUITableCell className="font -medium " align="center">{patient.doctorvisit_id}</MUITableCell>
                      <MUITableCell className="font-medium " align="center">{patient.name}</MUITableCell>
                      <MUITableCell className="font-medium " align="center">{patient.user_name || '-'}</MUITableCell>
                      <MUITableCell className="font-medium " align="center" title={formatDateTime(patient.created_at)}>
                        {formatDateTime(patient.created_at)}
                      </MUITableCell>
                      {/* <MUITableCell className="font-medium " align="center">{patient.doctor_name}</MUITableCell> */}
                      <MUITableCell className="font-medium " align="center">{formatNumber(totalLabAmount)}</MUITableCell>
                      <MUITableCell className="font-medium " align="center">{formatNumber(totalPaid)}</MUITableCell>
                      <MUITableCell className="font-medium " align="center">{formatNumber(discount)}</MUITableCell>
                      <MUITableCell className="font-medium " align="center" sx={{ color: bankAmount > 0 ? 'red' : 'inherit' }}>
                        {formatNumber(bankAmount)}
                      </MUITableCell>
                      <MUITableCell className="font-medium " align="center">{patient.company_name || '-'}</MUITableCell>
                        <MUITableCell className="font-medium " align="center"  title={patient.main_tests_names}>
                        {patient.main_tests_names}
                      </MUITableCell>
                      {/* <MUITableCell className="font-medium "  align="center"> */}
                          {/* {isFullyPaid && <CheckCircle className="h-5 w-5 text-green-500" />} */}
                        {/* {isFullyPaid && <CheckCircle className="h-5 w-5 text-green-500" />} */}
                      {/* </MUITableCell> */}
                      {/* <MUITableCell className="font-medium " align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Info className="h-4 w-4" />}
                          onClick={() => handleShowPatientDetails(patient)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          عرض
                        </Button>
                      </MUITableCell> */}
                    </MUITableRow>
                  );
                })}
              </MUITableBody>
            </MUITable>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
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

export default LabGeneralReportDetailsPage;
