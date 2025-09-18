// src/pages/reports/LabTestStatisticsReportPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Loader2, FlaskConical as ReportIcon, Search } from 'lucide-react';

import type { LabTestStatisticItem, LabTestStatisticsFilters } from '@/types/reports';
import type { PaginatedResponse } from '@/types/common';
import type { Container, Package } from '@/types/labTests';
import { getLabTestStatisticsReport } from '@/services/reportService';
import { getContainers } from '@/services/containerService';
import { getPackagesList } from '@/services/packageService';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
} from '@mui/material';

const getLabStatsFilterSchema = () => z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search_test_name: z.string().optional(),
  container_id: z.string().optional(),
  package_id: z.string().optional(),
  sort_by: z.enum(['main_test_name', 'request_count']).optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
});

type LabStatsFilterFormValues = z.infer<ReturnType<typeof getLabStatsFilterSchema>>;

const LabTestStatisticsReportPage: React.FC = () => {
  const defaultDateTo = format(new Date(), 'yyyy-MM-dd');
  const defaultDateFrom = format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd');

  const filterForm = useForm<LabStatsFilterFormValues>({
    resolver: zodResolver(getLabStatsFilterSchema()),
    defaultValues: {
      date_from: defaultDateFrom,
      date_to: defaultDateTo,
      search_test_name: '',
      container_id: 'all',
      package_id: 'all',
      sort_by: 'request_count',
      sort_direction: 'desc',
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<LabTestStatisticsFilters, 'page' | 'per_page'>>({
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: 'request_count',
    sort_direction: 'desc',
  });

  // Fetch data for filters
  const { data: containers, isLoading: isLoadingContainers } = useQuery<PaginatedResponse<Container>, Error>({
    queryKey: ['containersListForReport'],
    queryFn: () => getContainers(1, { per_page: 200 }),
  });
  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({
    queryKey: ['packagesListForReport'],
    queryFn: getPackagesList,
  });

  const reportQueryKey = ['labTestStatisticsReport', currentPage, appliedFilters] as const;
  const {
    data: reportData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<LabTestStatisticItem>, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getLabTestStatisticsReport({ page: currentPage, per_page: 20, ...appliedFilters }),
    placeholderData: keepPreviousData,
  });

  const handleFilterSubmit = (data: LabStatsFilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters({
      date_from: data.date_from || undefined,
      date_to: data.date_to || undefined,
      search_test_name: data.search_test_name || undefined,
      container_id: data.container_id === 'all' ? null : data.container_id,
      package_id: data.package_id === 'all' ? null : data.package_id,
      sort_by: data.sort_by || 'request_count',
      sort_direction: data.sort_direction || 'desc',
    });
  };

  const tests = reportData?.data || [];
  const meta = reportData?.meta;
  const isLoadingDropdowns = isLoadingContainers || isLoadingPackages;

  if (error) {
    return (
      <Alert severity="error" className="m-4">
        حدث خطأ أثناء الجلب: {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <ReportIcon className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">إحصائيات تحاليل المختبر</h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <Typography variant="h6">المرشحات</Typography>
        </CardHeader>
        <CardContent>
          <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
              <Controller control={filterForm.control} name="date_from" render={({ field }) => (
                <TextField label="من تاريخ" type="date" size="small" value={field.value} onChange={field.onChange} disabled={isFetching || isLoadingDropdowns} />
              )} />
              <Controller control={filterForm.control} name="date_to" render={({ field }) => (
                <TextField label="إلى تاريخ" type="date" size="small" value={field.value} onChange={field.onChange} disabled={isFetching || isLoadingDropdowns} />
              )} />
              <Controller control={filterForm.control} name="search_test_name" render={({ field }) => (
                <TextField label="ابحث عن التحليل" type="search" size="small" value={field.value} onChange={field.onChange} disabled={isFetching} InputProps={{ startAdornment: <Search className="h-4 w-4 mr-2" /> as any }} />
              )} />
              <Controller control={filterForm.control} name="container_id" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="container-label">الوعاء</InputLabel>
                  <MUISelect labelId="container-label" label="الوعاء" value={field.value} onChange={field.onChange} disabled={isLoadingDropdowns || isFetching}>
                    <MenuItem value="all">كل الأوعية</MenuItem>
                    {containers?.data?.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.container_name}</MenuItem>)}
                  </MUISelect>
                </FormControl>
              )} />
              <Controller control={filterForm.control} name="package_id" render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="package-label">الباقة</InputLabel>
                  <MUISelect labelId="package-label" label="الباقة" value={field.value} onChange={field.onChange} disabled={isLoadingDropdowns || isFetching}>
                    <MenuItem value="all">كل الباقات</MenuItem>
                    {packages?.map(p => <MenuItem key={p.package_id} value={String(p.package_id)}>{p.package_name}</MenuItem>)}
                  </MUISelect>
                </FormControl>
              )} />
              <Button type="submit" variant="contained" className="h-9" disabled={isFetching || isLoadingDropdowns}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">جارِ تحديث القائمة...</div>}
      
      {!isLoading && !isFetching && tests.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>لا توجد بيانات مطابقة للمرشحات</CardContent></Card>
      )}

      {tests.length > 0 && (
        <Card>
          <MUITable size="small">
            <MUITableHead>
              <MUITableRow>
                <MUITableCell align="center">اسم التحليل</MUITableCell>
                <MUITableCell align="center">عدد الطلبات</MUITableCell>
              </MUITableRow>
            </MUITableHead>
            <MUITableBody>
              {tests.map((test) => (
                <MUITableRow key={test.main_test_id}>
                  <MUITableCell align="center" className="font-medium">{test.main_test_name || '-'}</MUITableCell>
                  <MUITableCell align="center">{test.request_count}</MUITableCell>
                </MUITableRow>
              ))}
            </MUITableBody>
          </MUITable>
          {meta && (tests.length > 0) && (
            <CardContent className="border-t pt-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="font-semibold">إجمالي الطلبات: <span className="font-normal">{meta.total}</span></div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            الصفحة {meta.current_page} من {meta.last_page}
          </div>
          <div className="flex gap-2">
            <Button variant="outlined" size="small" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>السابق</Button>
            <Button variant="outlined" size="small" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>التالي</Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default LabTestStatisticsReportPage;