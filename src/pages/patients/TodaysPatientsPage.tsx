// src/pages/patients/TodaysPatientsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Users, SlidersHorizontal } from 'lucide-react';
import { Form, FormItem, FormLabel, FormControl } from '@/components/ui/form';

import type { PatientVisitSummary } from '@/types/visits';
import { getPatientVisitsSummary } from '@/services/visitService';
import { getDoctors } from '@/services/doctorService';
import ViewVisitServicesDialog from '@/components/clinic/patients/ViewVisitServicesDialog';

interface Doctor {
  id: number;
  name: string;
}

interface Patient {
  id: number;
  name: string;
  date_of_birth?: string;
  gender: string;
  phone: string;
}

interface Visit extends PatientVisitSummary {
  id: number;
  patient: Patient;
  doctor?: Doctor;
  visit_time?: string;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  status: 'waiting' | 'with_doctor' | 'lab_pending' | 'payment_pending' | 'completed' | 'cancelled' | 'no_show';
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface FilterFormValues {
  visit_date: string;
  doctor_id: string | null;
  search: string;
  status: string | null;
}

// Create a simple DatePicker component
const SimpleDatePicker: React.FC<{
  value?: string;
  onChange: (dateStr: string) => void;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, disabled, className }) => {
  return (
    <FormControl>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        disabled={disabled}
      />
    </FormControl>
  );
};

export default function TodaysPatientsPage() {
  const { t, i18n } = useTranslation(['todaysPatients', 'common', 'clinic']);
  const form = useForm<FilterFormValues>({
    defaultValues: {
      visit_date: format(new Date(), 'yyyy-MM-dd'),
      doctor_id: null,
      search: '',
      status: 'all',
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterFormValues>({
    visit_date: format(new Date(), 'yyyy-MM-dd'),
    doctor_id: null,
    search: '',
    status: 'all',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedVisitForServices, setSelectedVisitForServices] = useState<Visit | null>(null);

  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(handler);
  }, [filters.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.visit_date, filters.doctor_id, debouncedSearch, filters.status]);

  const { data: doctorsList, isLoading: isLoadingDoctors } = useQuery<PaginatedResponse<Doctor>, Error>({
    queryKey: ['doctorsSimpleList'],
    queryFn: () => getDoctors(),
  });

  const { data: paginatedVisits, isLoading, error, isFetching } = useQuery<PaginatedResponse<Visit>, Error>({
    queryKey: ['patientVisitsSummary', currentPage, filters.visit_date, filters.doctor_id, debouncedSearch, filters.status],
    queryFn: () => getPatientVisitsSummary({ 
      page: currentPage, 
      visit_date: filters.visit_date,
      doctor_id: filters.doctor_id === 'all' ? null : filters.doctor_id,
      search: debouncedSearch,
      status: filters.status === 'all' ? null : filters.status,
    }) as Promise<PaginatedResponse<Visit>>,
    placeholderData: keepPreviousData,
    enabled: !!filters.visit_date,
  });

  const handleFilterChange = (key: keyof FilterFormValues, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    form.setValue(key, value);
  };

  const onSubmit: SubmitHandler<FilterFormValues> = (data) => {
    setFilters(data);
  };

  const getAgeString = (p: Patient) => {
    if (!p.date_of_birth) return t('common:unknown');
    const birthDate = parseISO(p.date_of_birth);
    const years = new Date().getFullYear() - birthDate.getFullYear();
    return t('common:yearsOld', { years });
  };

  const visitStatuses = ['all', 'waiting', 'with_doctor', 'lab_pending', 'payment_pending', 'completed', 'cancelled'];

  if (error) return (
    <p className="text-destructive p-4">
      {t('common:error.fetchFailedExt', { 
        entity: t('todaysPatients:pageTitle'), 
        message: error.message 
      })}
    </p>
  );

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('todaysPatients:pageTitle')}</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <FormItem>
                  <FormLabel className="text-xs">{t('todaysPatients:filterByDate')}</FormLabel>
                  <SimpleDatePicker 
                    value={filters.visit_date} 
                    onChange={(dateStr) => handleFilterChange('visit_date', dateStr)}
                    disabled={isFetching}
                    className="h-9"
                  />
                </FormItem>
                <FormItem>
                  <FormLabel className="text-xs">{t('todaysPatients:filterByDoctor')}</FormLabel>
                  <Select 
                    value={filters.doctor_id || 'all'} 
                    onValueChange={(val) => handleFilterChange('doctor_id', val === 'all' ? null : val)}
                    dir={i18n.dir()}
                    disabled={isLoadingDoctors || isFetching}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('todaysPatients:allDoctors')}</SelectItem>
                      {doctorsList?.data.map(doc => (
                        <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
                <FormItem>
                  <FormLabel className="text-xs">{t('common:status')}</FormLabel>
                  <Select 
                    value={filters.status || 'all'} 
                    onValueChange={(val) => handleFilterChange('status', val === 'all' ? null : val)}
                    dir={i18n.dir()}
                    disabled={isFetching}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {visitStatuses.map(statusKey => (
                        <SelectItem key={statusKey} value={statusKey}>
                          {statusKey === 'all' ? t('common:all') : t(`clinic:workspace.status.${statusKey}`, statusKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
                <FormItem className="sm:col-span-2 md:col-span-1">
                  <FormLabel className="text-xs">{t('common:search')}</FormLabel>
                  <div className="relative">
                    <Input
                      type="search"
                      placeholder={t('todaysPatients:searchPatientsPlaceholder')}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="ps-10 rtl:pr-10 h-9"
                      // disabled={isFetching}
                    />
                    <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </FormItem>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {!isLoading && !isFetching && visits.length === 0 && (
        <Card className="text-center py-10 text-muted-foreground">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>{filters.visit_date ? t('todaysPatients:noVisitsForDate') : t('todaysPatients:noVisitsFound')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && visits.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center hidden sm:table-cell">{t('todaysPatients:table.patientId')}</TableHead>
                <TableHead>{t('todaysPatients:table.patientName')}</TableHead>
                <TableHead className="text-center hidden md:table-cell">{t('todaysPatients:table.doctorName')}</TableHead>
                <TableHead className="text-center hidden lg:table-cell">{t('todaysPatients:table.phone')}</TableHead>
                <TableHead className="text-center hidden sm:table-cell">{t('todaysPatients:table.visitTime')}</TableHead>
                <TableHead className="text-center">{t('todaysPatients:table.totalAmount')}</TableHead>
                <TableHead className="text-center">{t('todaysPatients:table.amountPaid')}</TableHead>
                <TableHead className="text-center">{t('todaysPatients:table.balance')}</TableHead>
                <TableHead className="text-center">{t('todaysPatients:table.status')}</TableHead>
                <TableHead className="text-center">{t('todaysPatients:table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="text-center hidden sm:table-cell">{visit.patient.id}</TableCell>
                  <TableCell className="font-medium">
                    {visit.patient.name}
                    <span className="block text-xs text-muted-foreground">
                      {getAgeString(visit.patient)} / {t(`common:genderEnum.${visit.patient.gender}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">{visit.doctor?.name || t('common:unassigned')}</TableCell>
                  <TableCell className="text-center hidden lg:table-cell">{visit.patient.phone}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {visit.visit_time ? format(parseISO(`2000-01-01T${visit.visit_time}`), 'p', { locale: dateLocale }) : '-'}
                  </TableCell>
                  <TableCell className="text-center">{Number(visit.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-center text-green-600">{Number(visit.total_paid).toFixed(2)}</TableCell>
                  <TableCell className={`text-center font-semibold ${visit.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(visit.balance_due).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={visit.status === 'completed' ? 'default' : (visit.status === 'cancelled' || visit.status === 'no_show' ? 'destructive' : 'outline')}>
                      {t(`clinic:workspace.status.${visit.status}`, visit.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedVisitForServices(visit)} 
                      title={t('todaysPatients:viewServicesButton')}
                    >
                      <SlidersHorizontal className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {console.log(currentPage,'currentPage')}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isFetching}
          >
            {t('common:previous')}
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-muted-foreground">
              {t('common:pageXofY', { current: currentPage, total: meta.last_page })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(meta.last_page, prev + 1))}
            disabled={currentPage === meta.last_page || isFetching}
          >
            {t('common:next')}
          </Button>
        </div>
      )}

      <ViewVisitServicesDialog
        isOpen={!!selectedVisitForServices}
        onOpenChange={(open: boolean) => { if (!open) setSelectedVisitForServices(null); }}
        visit={selectedVisitForServices as Visit}
      />
    </div>
  );
}