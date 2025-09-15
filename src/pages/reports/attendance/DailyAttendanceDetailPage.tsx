// src/pages/reports/attendance/DailyAttendanceDetailPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, CalendarCheck2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import apiClient from '@/services/api';
import type { ShiftDefinition, AttendanceRecord } from '@/types/attendance';
import { Chip } from '@mui/material'; // Using MUI Chip for status
import { DateTimePicker } from '@/components/datetime-picker';

interface DailyShiftReportData {
  shift_definition_id: number;
  shift_label: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  records: AttendanceRecord[];
}

interface DailyDetailResponse {
  data: DailyShiftReportData[];
  meta: {
    date: string; // "YYYY-MM-DD"
    day_name: string; // Localized day name
  };
}

const DailyAttendanceDetailPage: React.FC = () => {
  const dateLocale = arSA;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedShiftDefId, setSelectedShiftDefId] = useState<string>('all');

  const queryParams = useMemo(() => ({
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
    shift_definition_id: selectedShiftDefId === 'all' ? undefined : selectedShiftDefId,
  }), [selectedDate, selectedShiftDefId]);

  const { data: reportResponse, isLoading, error, isFetching } = useQuery<DailyDetailResponse, Error>({
    queryKey: ['dailyAttendanceDetail', queryParams],
    queryFn: async () => (await apiClient.get('/attendance/reports/daily-detail', { params: queryParams })).data,
    enabled: !!queryParams.date,
    placeholderData: keepPreviousData,
  });

  const { data: shiftDefinitions } = useQuery<ShiftDefinition[], Error>({
      queryKey: ['activeShiftDefinitionsListForReport'],
      queryFn: async () => (await apiClient.get('/shifts-definitions/list?active_only=true')).data.data,
  });

  const reportData = reportResponse?.data || [];
  const reportMeta = reportResponse?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4 h-full flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className='space-y-1'>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <CalendarCheck2 className="h-6 w-6 text-primary"/>
                {'تفاصيل الحضور اليومي'}
              </CardTitle>
              <CardDescription>
                {reportMeta ? `${reportMeta.day_name}, ${format(parseISO(reportMeta.date), "PPP", {locale: dateLocale})}` : 'اختر التاريخ'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <DateTimePicker date={selectedDate} onDateChange={setSelectedDate} />
              <Select value={selectedShiftDefId} onValueChange={setSelectedShiftDefId} dir="rtl">
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
                  <SelectValue placeholder={'تصفية حسب الوردية'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{'كل الورديات'}</SelectItem>
                  {shiftDefinitions?.map(sd => (
                    <SelectItem key={sd.id} value={String(sd.id)}>{sd.shift_label} ({sd.name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="flex-grow overflow-hidden">
        {isLoading && <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
        {isFetching && !isLoading && <div className="text-xs text-center text-muted-foreground py-2"><Loader2 className="inline h-4 w-4 animate-spin"/> {'جاري تحميل البيانات'}</div>}
        {error && (
          <Alert variant="destructive" className="my-4"><AlertTriangle className="h-5 w-5" /><AlertTitle>{'فشل جلب البيانات'}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
        )}
        {!isLoading && !error && reportData.length === 0 && (
          <Card className="h-full flex items-center justify-center text-muted-foreground">
            <CardContent className="text-center py-10">{'لا توجد بيانات مطابقة للمرشحات'}</CardContent>
          </Card>
        )}
        {!isLoading && !error && reportData.length > 0 && (
            <ScrollArea className="h-full">
                <div className="space-y-6">
                    {reportData.map(shiftData => (
                    <Card key={shiftData.shift_definition_id} className="shadow-sm">
                        <CardHeader className="bg-muted/50 py-2 px-3 rounded-t-md">
                        <h3 className="text-md font-semibold">
                            {shiftData.shift_label}: {shiftData.shift_name} 
                            <span className="text-xs text-muted-foreground font-normal ltr:ml-2 rtl:mr-2">
                            ({shiftData.start_time} - {shiftData.end_time})
                            </span>
                        </h3>
                        </CardHeader>
                        <CardContent className="p-0">
                        {shiftData.records.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-3 py-6 text-center">{'لا توجد سجلات لهذه الوردية'}</p>
                         ) : (
                            <Table className="text-xs sm:text-sm">
                            <TableHeader>
                                <TableRow>
                                <TableHead className="text-center">{'اسم الموظف'}</TableHead>
                                <TableHead className="text-center">{'الحالة'}</TableHead>
                                <TableHead className="text-center hidden md:table-cell">{'دخول'}</TableHead>
                                <TableHead className="text-center hidden md:table-cell">{'خروج'}</TableHead>
                                <TableHead className="hidden lg:table-cell text-center">{'المشرف'}</TableHead>
                                <TableHead className="hidden lg:table-cell text-center">{'ملاحظات'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shiftData.records.map(rec => (
                                <TableRow key={rec.id}>
                                    <TableCell className="font-medium text-center">{rec.user_name}</TableCell>
                                    <TableCell className="text-center">
                                    <Chip
                                        label={rec.status === 'present' ? 'حاضر' : rec.status === 'late_present' ? 'حاضر متأخر' : rec.status === 'early_leave' ? 'انصراف مبكر' : rec.status === 'absent' ? 'غائب' : rec.status === 'on_leave' ? 'إجازة' : rec.status === 'sick_leave' ? 'إجازة مرضية' : rec.status === 'holiday' ? 'عطلة' : 'غير معروف'}
                                        size="small"
                                        color={rec.status === 'present' || rec.status === 'late_present' || rec.status === 'early_leave' ? 'success' : rec.status === 'absent' ? 'error' : rec.status === 'on_leave' || rec.status === 'sick_leave' ? 'info' : 'default'}
                                        variant="outlined"
                                        sx={{fontSize: '0.7rem', padding: '0 6px', height: '20px'}}
                                    />
                                    </TableCell>
                                    <TableCell className="text-center hidden md:table-cell">{rec.check_in_time ? format(parseISO(rec.check_in_time), 'p', { locale: dateLocale }) : '-'}</TableCell>
                                    <TableCell className="text-center hidden md:table-cell">{rec.check_out_time ? format(parseISO(rec.check_out_time), 'p', { locale: dateLocale }) : '-'}</TableCell>
                                    <TableCell className="hidden lg:table-cell text-center">{rec.supervisor_name || '-'}</TableCell>
                                    <TableCell className="hidden lg:table-cell text-center truncate max-w-[150px]" title={rec.notes || undefined}>{rec.notes || '-'}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        )}
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </ScrollArea>
        )}
      </div>
    </div>
  );
};
export default DailyAttendanceDetailPage;