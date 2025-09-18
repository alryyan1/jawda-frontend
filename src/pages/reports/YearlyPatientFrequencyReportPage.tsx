// src/pages/reports/YearlyPatientFrequencyReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getYear } from 'date-fns';

import { Loader2, Filter, Users, AlertTriangle, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';

import { getYearlyPatientFrequencyReport } from '@/services/reportService';
import type { YearlyPatientFrequencyReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select as MUISelect,
  MenuItem,
  Alert,
} from '@mui/material';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

const CHART_COLORS_PATIENTS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#0ea5e9', '#eab308', '#d946ef', '#6366f1', '#f43f5e', '#14b8a6'];

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const YearlyPatientFrequencyReportPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const reportQueryKey = ['yearlyPatientFrequencyReport', selectedYear] as const;
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<YearlyPatientFrequencyReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getYearlyPatientFrequencyReport({ year: selectedYear }),
    enabled: !!selectedYear,
  });

  const chartData = useMemo(() => {
    return reportData?.data.map((item, index) => ({
      name: AR_MONTHS[(item.month - 1) % 12] || item.month_name,
      patients: item.patient_count,
      fill: CHART_COLORS_PATIENTS[index % CHART_COLORS_PATIENTS.length],
    })) || [];
  }, [reportData]);

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">تكرار المرضى السنوي</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">مرشحات التقرير</Typography>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5">
            <FormControl size="small" className="w-full sm:w-[180px]">
              <InputLabel id="year-select-patient-freq">السنة</InputLabel>
              <MUISelect 
                labelId="year-select-patient-freq"
                id="year-select-patient-freq"
                label="السنة"
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(parseInt(String(e.target.value)))}
              >
                {years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
              </MUISelect>
            </FormControl>
          </div>
          <Button onClick={() => refetch()} variant="contained" size="small" className="h-9 mt-auto" disabled={isLoading || isFetching} startIcon={!isFetching ? <Filter className="h-4 w-4"/> : undefined}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تطبيق المرشحات'}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {error && (
        <Alert severity="error" icon={<AlertTriangle />}>
          <Typography fontWeight={600}>فشل جلب البيانات</Typography>
          <Typography>{error.message || 'حدث خطأ غير متوقع'}</Typography>
        </Alert>
      )}
      
      {reportData && !isLoading && (
        <>
          <Typography className="text-center text-sm">
            تقرير سنة: {reportData.meta.year}
          </Typography>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader>
                <Typography variant="subtitle1">إجمالي المرضى الفريدين</Typography>
              </CardHeader>
              <CardContent>
                <Typography variant="h5" fontWeight={700}>{formatNumber(reportData.meta.total_unique_patients_yearly, 0)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Typography variant="subtitle1">متوسط المرضى شهرياً</Typography>
              </CardHeader>
              <CardContent>
                <Typography variant="h5" fontWeight={700}>{formatNumber(reportData.meta.average_monthly_patients, 1)}</Typography>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Typography>مخطط عدد المرضى الشهري</Typography>
            </CardHeader>
            <CardContent className="h-[400px] w-full">
              {chartData.length === 0 && !isFetching ? (
                <p className="text-center text-muted-foreground py-10">لا توجد بيانات لعرض المخطط</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3}/>
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={50}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => formatNumber(value, 0)}
                      domain={[0, 'dataMax + 10']}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        boxShadow: 'hsl(var(--shadow))'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))'}}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      formatter={(value: number) => [formatNumber(value,0), 'مرضى']}
                    />
                    <Bar dataKey="patients" name="عدد المرضى" radius={[4, 4, 0, 0]} barSize={35}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS_PATIENTS[index % CHART_COLORS_PATIENTS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default YearlyPatientFrequencyReportPage;