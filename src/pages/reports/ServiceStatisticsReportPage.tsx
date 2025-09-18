// src/pages/reports/ServiceStatisticsReportPage.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Loader2, Filter, BarChartHorizontalBig } from 'lucide-react';

import { getServiceStatisticsReport } from '@/services/reportService';
import { getServiceGroupsList } from '@/services/serviceGroupService';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceGroup } from '@/types/services';
import type { ServiceStatisticItem } from '@/types/reports';

// MUI imports
import {
  Box,
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
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
} from '@mui/material';

const filterSchema = z.object({
  date_from: z.string(),
  date_to: z.string(),
  service_group_id: z.string(),
  search_service_name: z.string(),
  sort_by: z.enum(['request_count', 'name']),
  sort_direction: z.enum(['asc', 'desc'])
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface ServiceStatisticsFilters extends FilterFormValues {
  page?: number;
}

// Simple DatePicker component
const SimpleDatePicker: React.FC<{ value?: string; onChange: (dateStr: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
    <TextField type="date" value={value} onChange={e => onChange(e.target.value)} size="small" className="h-9" disabled={disabled} InputLabelProps={{ shrink: true }}/>
);

const ServiceStatisticsReportPage: React.FC = () => {
  const initialDateTo = format(new Date(), 'yyyy-MM-dd');
  const initialDateFrom = format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd');

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      date_from: initialDateFrom,
      date_to: initialDateTo,
      service_group_id: 'all',
      search_service_name: '',
      sort_by: 'request_count',
      sort_direction: 'desc',
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<ServiceStatisticsFilters>(form.getValues());

  const { data: serviceGroups } = useQuery<PaginatedResponse<ServiceGroup>>({
    queryKey: ['serviceGroupsListForReport'],
    queryFn: () => getServiceGroupsList(),
  });

  const { data: reportData, isLoading, error, isFetching } = useQuery<PaginatedResponse<ServiceStatisticItem>, Error>({
    queryKey: ['serviceStatisticsReport', currentPage, appliedFilters],
    queryFn: () => getServiceStatisticsReport({ 
      page: currentPage, 
      ...appliedFilters,
      service_group_id: appliedFilters.service_group_id === 'all' ? null : appliedFilters.service_group_id,
    }),
    placeholderData: keepPreviousData,
  });
  console.log(reportData,'reportData')
  const onSubmit = (values: FilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters(values);
  };
  const statistics = reportData?.data || [];
  const meta = reportData?.meta;
  if (error) return <p className="text-destructive p-4">فشل جلب البيانات: إحصائيات الخدمات: {error.message}</p>;
  

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChartHorizontalBig className="h-7 w-7 text-primary"/>
        <h1 className="text-2xl sm:text-3xl font-bold">إحصائيات الخدمات</h1>
      </div>
      
      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
            <Controller
              control={form.control}
              name="date_from"
              render={({ field }) => (
                <div>
                  <Typography className="text-xs">نطاق التاريخ (من)</Typography>
                  <SimpleDatePicker value={field.value} onChange={field.onChange} disabled={isFetching} />
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="date_to"
              render={({ field }) => (
                <div>
                  <Typography className="text-xs">إلى</Typography>
                  <SimpleDatePicker value={field.value} onChange={field.onChange} disabled={isFetching}/>
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="service_group_id"
              render={({ field }) => (
                <FormControl size="small">
                  <InputLabel id="svc-group-label">مجموعة الخدمة</InputLabel>
                  <MUISelect labelId="svc-group-label" label="مجموعة الخدمة" value={field.value} onChange={field.onChange}>
                    <MenuItem value="all">كل المجموعات</MenuItem>
                    {serviceGroups?.data.map((sg: ServiceGroup) => (
                      <MenuItem key={sg.id} value={String(sg.id)}>{sg.name}</MenuItem>
                    ))}
                  </MUISelect>
                </FormControl>
              )}
            />
            <Controller
              control={form.control}
              name="search_service_name"
              render={({ field }) => (
                <div className="lg:col-span-1">
                  <Typography className="text-xs">ابحث باسم الخدمة</Typography>
                  <TextField 
                    type="search" 
                    placeholder={'ابحث...'} 
                    size="small"
                    disabled={isFetching}
                    {...field}
                  />
                </div>
              )}
            />
            <Button type="submit" variant="contained" className="h-9 self-end lg:col-start-4" disabled={isFetching || isLoading} startIcon={!isFetching ? <Filter className="h-4 w-4" /> : undefined}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching) && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {!isLoading && !isFetching && statistics.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>لا توجد بيانات</CardContent>
        </Card>
      )}

      { statistics?.length > 0 && (
        <Card>
          <MUITable size="small">
            <MUITableHead>
              <MUITableRow>
                <MUITableCell align="center">اسم الخدمة</MUITableCell>
                <MUITableCell align="center" className="hidden md:table-cell">السعر</MUITableCell>
                <MUITableCell align="center">عدد الطلبات</MUITableCell>
              </MUITableRow>
            </MUITableHead>
            <MUITableBody>
              {statistics.map((stat: ServiceStatisticItem) => (
                <MUITableRow key={stat.id}>
                  <MUITableCell align="center" className="font-medium">{stat.name}</MUITableCell>
                  <MUITableCell align="center" className="hidden md:table-cell">{Number(stat.price).toFixed(2)}</MUITableCell>
                  <MUITableCell align="center" className="font-semibold text-lg">{stat.request_count}</MUITableCell>
                  
                </MUITableRow>
              ))}
            </MUITableBody>
          </MUITable>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isFetching}
          >
            السابق
          </Button>
          <span className="px-2 py-1 text-sm">
            الصفحة {currentPage} من {meta.last_page}
          </span>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))}
            disabled={currentPage === meta.last_page || isFetching}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServiceStatisticsReportPage;