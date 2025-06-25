// src/pages/reports/LabTestStatisticsReportPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Filter, FlaskConical as ReportIcon, Search, AlertTriangle } from 'lucide-react'; // Changed icon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error display
import { Separator } from '@/components/ui/separator';


import type { LabTestStatisticItem, LabTestStatisticsFilters } from '@/types/reports';
import type { PaginatedResponse } from '@/types/common';
import type { Container, Package } from '@/types/labTests'; // For filter dropdowns
import { getLabTestStatisticsReport } from '@/services/reportService';
import { getContainers } from '@/services/containerService'; // Service to fetch containers
import { getPackagesList } from '@/services/packageService';   // Service to fetch packages
import { formatNumber } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';


const getLabStatsFilterSchema = (t: (key: string, options?: any) => string) => z.object({
  date_range: z.custom<DateRange | undefined>().optional(),
  search_test_name: z.string().optional(),
  container_id: z.string().optional(),
  package_id: z.string().optional(),
  sort_by: z.enum(['main_test_name', 'request_count', 'total_price_generated', 'total_amount_paid']).optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
});

type LabStatsFilterFormValues = z.infer<ReturnType<typeof getLabStatsFilterSchema>>;

const LabTestStatisticsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'labTests']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(new Date());

  const filterForm = useForm<LabStatsFilterFormValues>({
    resolver: zodResolver(getLabStatsFilterSchema(t)),
    defaultValues: {
      date_range: { from: defaultDateFrom, to: defaultDateTo },
      search_test_name: '',
      container_id: 'all',
      package_id: 'all',
      sort_by: 'request_count',
      sort_direction: 'desc',
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<Omit<LabTestStatisticsFilters, 'page' | 'per_page'>>({
    date_from: format(defaultDateFrom, 'yyyy-MM-dd'),
    date_to: format(defaultDateTo, 'yyyy-MM-dd'),
    sort_by: 'request_count',
    sort_direction: 'desc',
  });

  // Fetch data for filters
  const { data: containers, isLoading: isLoadingContainers } = useQuery<PaginatedResponse<Container>, Error>({
    queryKey: ['containersListForReport'],
    queryFn: () => getContainers(1, { per_page: 200 }), // Fetch many for dropdown
  });
  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({ // Assuming getPackagesList returns Package[]
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
      date_from: data.date_range?.from ? format(data.date_range.from, 'yyyy-MM-dd') : undefined,
      date_to: data.date_range?.to ? format(data.date_range.to, 'yyyy-MM-dd') : undefined,
      search_test_name: data.search_test_name || undefined,
      container_id: data.container_id === 'all' ? null : data.container_id,
      package_id: data.package_id === 'all' ? null : data.package_id,
      sort_by: data.sort_by || 'request_count',
      sort_direction: data.sort_direction || 'desc',
    });
  };

  useEffect(() => {
    // This effect will run when filters object reference changes.
    // To trigger refetch based on filterForm values, we use appliedFilters in queryKey.
  }, [appliedFilters]);


  const tests = reportData?.data || [];
  const meta = reportData?.meta;
  const isLoadingDropdowns = isLoadingContainers || isLoadingPackages;

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('common:error.fetchFailedTitle')}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" style={{direction: i18n.dir()}}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <ReportIcon className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:labTestStatistics.pageTitle')}</h1>
        </div>
        {/* Add PDF print button here later */}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('common:filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...filterForm}>
            <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                <FormField control={filterForm.control} name="date_range" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel className="text-xs">{t('reports:dateRange')}</FormLabel>
                    <DatePickerWithRange date={field.value} onDateChange={field.onChange} disabled={isFetching || isLoadingDropdowns} buttonSize="sm"/>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={filterForm.control} name="search_test_name" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">{t('labTests:searchTestsPlaceholder')}</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                      <Input type="search" {...field} className="h-9 pl-8 rtl:pr-8" disabled={isFetching} />
                    </div>
                  </FormItem>
                )} />
                 <FormField control={filterForm.control} name="container_id" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">{t('labTests:table.container')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isLoadingDropdowns || isFetching}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t('common:allOptions', { option: t('labTests:containers.entityNamePlural') })}</SelectItem>
                        {containers?.data?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.container_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={filterForm.control} name="package_id" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">{t('labTests:packageEntityName', 'Package')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} dir={i18n.dir()} disabled={isLoadingDropdowns || isFetching}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t('common:allOptions', { option: t('labTests:packageEntityNamePlural', 'Packages') })}</SelectItem>
                        {packages?.map(p => <SelectItem key={p.package_id} value={String(p.package_id)}>{p.package_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <Button type="submit" className="h-9" disabled={isFetching || isLoadingDropdowns}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                  {t('reports:applyFilters')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading && !isFetching) && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {isFetching && <div className="text-sm text-muted-foreground mb-2 text-center">{t('common:updatingList')}</div>}
      
      {!isLoading && !isFetching && tests.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground"><CardContent>{t('common:noDataAvailableFilters')}</CardContent></Card>
      )}

      {tests.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{t('labTests:table.testName')}</TableHead>
                <TableHead className="text-center">{t('reports:labTestStatistics.table.requestCount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.main_test_id}>
                  <TableCell className="font-medium text-center">{test.main_test_name || '-'}</TableCell>
                  <TableCell className="text-center">{test.request_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {/* Optional: Summary Row for Totals if needed */}
          {meta && (tests.length > 0) && (
            <CardContent className="border-t pt-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="font-semibold">{t('common:totalRequests')}: <span className="font-normal">{meta.total}</span></div>
                    {/* Add grand totals if backend provides them (e.g., sum of total_price_generated for all items) */}
                </div>
            </CardContent>
          )}
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {t('common:pagination.pageInfo', { current: meta.current_page, total: meta.last_page })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>{t('common:pagination.previous')}</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>{t('common:pagination.next')}</Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default LabTestStatisticsReportPage;