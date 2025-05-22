// src/pages/reports/ServiceStatisticsReportPage.tsx
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Loader2, Filter, BarChartHorizontalBig, CheckCircle2, XCircle } from 'lucide-react';

import { getServiceStatisticsReport } from '@/services/reportService';
import { getServiceGroupsList } from '@/services/serviceGroupService';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceGroup } from '@/types/services';
import type { ServiceStatisticItem } from '@/types/reports';

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
    <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="h-9" disabled={disabled}/>
);

const ServiceStatisticsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'services']);

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

  const onSubmit = (values: FilterFormValues) => {
    setCurrentPage(1);
    setAppliedFilters(values);
  };
  
  if (error) return <p className="text-destructive p-4">{t('common:error.fetchFailedExt', { entity: t('reports:serviceStatisticsReport.title'), message: error.message })}</p>;

  const statistics = reportData?.data || [];
  const meta = reportData?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChartHorizontalBig className="h-7 w-7 text-primary"/>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:serviceStatisticsReport.title')}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:doctorShiftsReport.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
              <FormField
                control={form.control}
                name="date_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('reports:doctorShiftsReport.dateRange')} ({t('common:from')})</FormLabel>
                    <SimpleDatePicker value={field.value} onChange={field.onChange} disabled={isFetching} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('common:to')}</FormLabel>
                    <SimpleDatePicker value={field.value} onChange={field.onChange} disabled={isFetching}/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('reports:serviceStatisticsReport.serviceGroupFilter')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} dir={i18n.dir()}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('reports:serviceStatisticsReport.allServiceGroups')}</SelectItem>
                        {serviceGroups?.data.map((sg: ServiceGroup) => (
                          <SelectItem key={sg.id} value={String(sg.id)}>{sg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="search_service_name"
                render={({ field }) => (
                  <FormItem className="lg:col-span-1">
                    <FormLabel className="text-xs">{t('reports:serviceStatisticsReport.searchServiceName')}</FormLabel>
                    <Input 
                      type="search" 
                      placeholder={t('common:searchPlaceholder')} 
                      className="h-9" 
                      disabled={isFetching}
                      {...field}
                    />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-9 self-end lg:col-start-4" disabled={isFetching || isLoading}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                {t('reports:doctorShiftsReport.applyFilters')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching) && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {!isLoading && !isFetching && statistics.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>{t('reports:serviceStatisticsReport.noData')}</CardContent>
        </Card>
      )}

      {!isLoading && statistics.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports:serviceStatisticsReport.table.serviceName')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('reports:serviceStatisticsReport.table.groupName')}</TableHead>
                <TableHead className="text-center hidden md:table-cell">{t('reports:serviceStatisticsReport.table.price')}</TableHead>
                <TableHead className="text-center">{t('reports:serviceStatisticsReport.table.requestCount')}</TableHead>
                <TableHead className="text-center hidden md:table-cell">{t('reports:serviceStatisticsReport.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.map((stat: ServiceStatisticItem) => (
                <TableRow key={stat.id}>
                  <TableCell className="font-medium">{stat.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{stat.service_group_name || '-'}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{Number(stat.price).toFixed(2)}</TableCell>
                  <TableCell className="text-center font-semibold text-lg">{stat.request_count}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    {stat.activate ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto"/>
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mx-auto"/>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isFetching}
          >
            {t('common:previous')}
          </Button>
          <span className="px-2 py-1 text-sm">
            {t('common:pageXofY', { current: currentPage, total: meta.last_page })}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))}
            disabled={currentPage === meta.last_page || isFetching}
          >
            {t('common:next')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServiceStatisticsReportPage;