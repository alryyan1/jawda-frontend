// src/pages/reports/LabGeneralReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { Loader2, Search, Eye } from 'lucide-react';

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

type LabGeneralReportFilterFormValues = {
  date_from?: string;
  date_to?: string;
  start_time?: string;
  end_time?: string;
  patient_name?: string;
  user_id?: string;
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
    },
  });

  const [appliedFilters, setAppliedFilters] = useState<LabGeneralReportFilters>({
    date_from: defaultDateTo,
    date_to: defaultDateTo,
  });
  const navigate = useNavigate();

  // Fetch data for filters

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForReport'],
    queryFn: () => getUsers(1, { per_page: 200 }),
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
    enabled: true, // Always enabled since we removed shift filter
  });

  const handleFilterSubmit = (data: LabGeneralReportFilterFormValues) => {
    setAppliedFilters({
      date_from: data.date_from || undefined,
      date_to: data.date_to || undefined,
      start_time: data.start_time || undefined,
      end_time: data.end_time || undefined,
      patient_name: data.patient_name || undefined,
      user_id: data.user_id && data.user_id !== 'all' ? parseInt(data.user_id) : undefined,
    });
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

    // Navigate to details page
    navigate(`/reports/lab-general/details?${params.toString()}`);
  };

  const patients = (reportData as LabGeneralReportWithUserRevenue & { data: LabGeneralReportItem[] })?.data || [];
  const userRevenues = reportData?.user_revenues || [];
  const isLoadingDropdowns = isLoadingUsers;

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
            <div className="flex gap-4 items-end">
              
              <Controller 
                control={filterForm.control} 
                name="date_from" 
                render={({ field }) => (
                  <TextField 
                  sx={{width:'150px'}}
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
                  sx={{width:'150px'}}
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
                name="start_time" 
                render={({ field }) => (
                  <TextField 
                  sx={{width:'130px'}}
                    label="من وقت" 
                    type="time" 
                    size="small" 
                    value={field.value} 
                    onChange={field.onChange} 
                    disabled={isFetching || isLoadingDropdowns} 
                    inputProps={{ step: 60 }}
                  />
                )} 
              />

              <Controller 
                control={filterForm.control} 
                name="end_time" 
                render={({ field }) => (
                  <TextField 
                  sx={{width:'130px'}}
                    label="إلى وقت" 
                    type="time" 
                    size="small" 
                    value={field.value} 
                    onChange={field.onChange} 
                    disabled={isFetching || isLoadingDropdowns} 
                    inputProps={{ step: 60 }}
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
                      sx={{width:'200px'}}
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
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : ' بحث '}
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
              
              <Button 
                type="button" 
                variant="contained" 
                className="h-9" 
                onClick={handleOpenDetailsPage}
                disabled={isFetching || isLoadingDropdowns || patients.length === 0}
                startIcon={<Search className="h-4 w-4" />}
              >
                عرض التفاصيل
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
            <MUITable size="medium" sx={{ fontSize: '1.1rem' }}>
              <MUITableHead>
                <MUITableRow>
                  <MUITableCell align="center" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>اسم المستخدم</MUITableCell>
                  <MUITableCell align="center" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>إجمالي المدفوع</MUITableCell>
                  <MUITableCell align="center" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>إجمالي التخفيض</MUITableCell>
                  <MUITableCell align="center" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>إجمالي كاش</MUITableCell>
                  <MUITableCell align="center" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>إجمالي بنك</MUITableCell>
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
                      <MUITableCell align="center" className="font-medium" sx={{ fontSize: '1.1rem' }}>{userRevenue.user_name}</MUITableCell>
                      <MUITableCell align="center" sx={{ fontSize: '1.1rem' }}>{formatNumber(totalPaid)}</MUITableCell>
                      <MUITableCell align="center" sx={{ fontSize: '1.1rem' }}>{formatNumber(totalDiscount)}</MUITableCell>
                      <MUITableCell align="center" sx={{ fontSize: '1.1rem' }}>{formatNumber(totalCash)}</MUITableCell>
                      <MUITableCell align="center" sx={{ color: totalBank > 0 ? 'red' : 'inherit', fontSize: '1.1rem' }}>
                        {formatNumber(totalBank)}
                      </MUITableCell>
                    </MUITableRow>
                  );
                })}
                {/* Totals Row */}
                <MUITableRow sx={{ backgroundColor: '#3498db',fontSize: '1.1rem', color: 'white' }}>
                  <MUITableCell align="center" className="font-bold text-white!" sx={{ fontSize: '1.1rem' }}>الإجمالي</MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-2xl" sx={{ fontSize: '1.1rem' }}>
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_paid || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-2xl" sx={{ fontSize: '1.1rem' }}>
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_discount || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-2xl" sx={{ fontSize: '1.1rem' }}>
                    {formatNumber(userRevenues.reduce((sum, u) => sum + Number(u.total_cash || 0), 0))}
                  </MUITableCell>
                  <MUITableCell align="center" className="font-bold text-white! text-2xl" sx={{ fontSize: '1.1rem' }}>
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
