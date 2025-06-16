// src/pages/settings/attendance/HolidaysPage.tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, addYears, subYears } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, CalendarOff, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';

import apiClient from '@/services/api';
import type { Holiday } from '@/types/attendance';
import ManageHolidayDialog from '@/components/settings/attendance/ManageHolidayDialog'; // Import the dialog
import HolidayListItem from '@/components/attendance/HolidayListItem'; // Import the list item

interface PaginatedHolidays {
  data: Holiday[];
  // ... meta from Laravel pagination (current_page, last_page, etc.)
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const HolidaysPage: React.FC = () => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;
  const queryClient = useQueryClient();

  const [isManageHolidayDialogOpen, setIsManageHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);

  const holidaysQueryKey = ['holidays', currentYear, currentPage] as const;

  const { data: paginatedHolidays, isLoading, error, isFetching } = useQuery<PaginatedHolidays, Error>({
    queryKey: holidaysQueryKey,
    queryFn: async () => (await apiClient.get('/holidays', { params: { year: currentYear, page: currentPage, per_page: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  const holidays = paginatedHolidays?.data || [];
  const paginationMeta = paginatedHolidays?.meta;

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setIsManageHolidayDialogOpen(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsManageHolidayDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/holidays/${id}`),
    onSuccess: () => {
      toast.success(t('attendance:holidays.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: holidaysQueryKey });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:error.deleteFailed')),
  });

  const handleDeleteHoliday = (id: number, name: string) => {
    if (window.confirm(t('common:confirmDeleteMessage', { item: name }))) {
      deleteMutation.mutate(id);
    }
  };
  
  const changeYear = (amount: number) => {
    setCurrentYear(prev => prev + amount);
    setCurrentPage(1); // Reset page when year changes
  };


  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4 h-full flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                    <CalendarOff className="h-6 w-6 text-primary"/>
                    {t('attendance:holidays.pageTitle')}
                </CardTitle>
                <CardDescription>{t('attendance:holidays.pageDescription')}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={() => changeYear(-1)} disabled={isFetching} className="h-9 w-9">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-sm font-semibold text-center min-w-[80px]">
                    {currentYear}
                </div>
                <Button variant="outline" size="icon" onClick={() => changeYear(1)} disabled={isFetching} className="h-9 w-9">
                    <ChevronRight className="h-5 w-5" />
                </Button>
                <Button onClick={handleAddHoliday} size="sm" className="h-9">
                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('attendance:holidays.addButton')}
                </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-grow overflow-hidden">
        {isLoading && <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
        {isFetching && !isLoading && <div className="text-xs text-center text-muted-foreground py-2"><Loader2 className="inline h-4 w-4 animate-spin"/> {t('common:loadingData')}</div>}
        {error && (
          <Alert variant="destructive" className="my-4"><AlertTriangle className="h-5 w-5" /><AlertTitle>{t('common:error.fetchFailed')}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
        )}
        {!isLoading && !error && holidays.length === 0 && (
          <Card className="h-full flex items-center justify-center text-muted-foreground">
            <CardContent className="text-center py-10">{t('attendance:holidays.noHolidaysForYear', { year: currentYear })}</CardContent>
          </Card>
        )}
        {!isLoading && !error && holidays.length > 0 && (
           <Card className="h-full flex flex-col">
            <ScrollArea className="flex-grow">
                <Table className="text-xs sm:text-sm">
                <TableHeader>
                    <TableRow>
                    <TableHead className="text-center">{t('attendance:holidays.dialog.nameLabel')}</TableHead>
                    <TableHead className="text-center">{t('attendance:holidays.dialog.dateLabel')}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">{t('attendance:holidays.dialog.recurringLabel')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('attendance:holidays.dialog.descriptionLabel')}</TableHead>
                    <TableHead className="text-right">{t('common:actions.openMenu')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {holidays.map(holiday => (
                    <HolidayListItem
                        key={holiday.id}
                        holiday={holiday}
                        onEdit={handleEditHoliday}
                        onDelete={handleDeleteHoliday}
                        isDeleting={deleteMutation.isPending && deleteMutation.variables === holiday.id}
                    />
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
            {paginationMeta && paginationMeta.last_page > 1 && (
                <div className="p-3 border-t flex items-center justify-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>{t('common:pagination.previous')}</Button>
                    <span className="text-xs text-muted-foreground">{t('common:pagination.pageInfo', { current: currentPage, total: paginationMeta.last_page })}</span>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(paginationMeta.last_page, p + 1))} disabled={currentPage === paginationMeta.last_page || isFetching}>{t('common:pagination.next')}</Button>
                </div>
            )}
           </Card>
        )}
      </div>

      <ManageHolidayDialog
        isOpen={isManageHolidayDialogOpen}
        onOpenChange={setIsManageHolidayDialogOpen}
        holiday={editingHoliday}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: holidaysQueryKey });
          setIsManageHolidayDialogOpen(false);
          setEditingHoliday(null);
        }}
      />
    </div>
  );
};
export default HolidaysPage;