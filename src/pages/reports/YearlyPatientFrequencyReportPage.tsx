// src/pages/reports/YearlyPatientFrequencyReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getYear } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, Users, AlertTriangle, BarChart2 } from 'lucide-react'; // BarChart2 for patient frequency
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';

import { getYearlyPatientFrequencyReport, type YearlyPatientFrequencyFilters } from '@/services/reportService';
import type { MonthlyPatientCountDataPoint, YearlyPatientFrequencyReportResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { StatCard } from '@/pages/HomePage'; // Assuming StatCard is exported or moved

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

const CHART_COLORS_PATIENTS = ['#22c55e', '#3b82f6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#0ea5e9', '#eab308', '#d946ef', '#6366f1', '#f43f5e', '#14b8a6'];


const YearlyPatientFrequencyReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'months', 'analysis']); // Added analysis for StatCard potentially
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const reportQueryKey = ['yearlyPatientFrequencyReport', selectedYear] as const;
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<YearlyPatientFrequencyReportResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getYearlyPatientFrequencyReport({ year: selectedYear }),
    enabled: !!selectedYear,
  });

  const chartData = useMemo(() => {
    return reportData?.data.map((item, index) => ({
      name: t(`months:m${item.month}` as any, item.month_name),
      patients: item.patient_count,
      fill: CHART_COLORS_PATIENTS[index % CHART_COLORS_PATIENTS.length],
    })) || [];
  }, [reportData, t, dateLocale]);

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" /> {/* Changed icon */}
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:yearlyPatientFrequencyReport.title')}</h1>
        </div>
        {/* Placeholder for PDF Button */}
        {/* <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || isLoading || chartData.length === 0} size="sm">
          {isGeneratingPdf ? <Loader2 /> : <FileText />} {t('common:printPdf')}
        </Button> */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5">
              <label htmlFor="year-select-patient-freq" className="text-xs font-medium">{t('common:year')}</label>
              <Select 
                value={String(selectedYear)} 
                onValueChange={(val) => setSelectedYear(parseInt(val))}
                dir={i18n.dir()}
              >
                <SelectTrigger id="year-select-patient-freq" className="h-9 w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => refetch()} className="h-9 mt-auto" disabled={isLoading || isFetching}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                {t('reports:applyFiltersButton')}
            </Button>
        </CardContent>
      </Card>

      {(isLoading || isFetching) && !reportData && (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
      {error && (
         <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> {t('common:error.fetchFailedTitle')}</CardTitle></CardHeader>
            <CardContent><p>{error.message || t('common:error.generic')}</p></CardContent>
         </Card>
      )}
      
      {reportData && !isLoading && (
        <>
          <CardDescription className="text-center text-sm">
            {t('reports:yearlyPatientFrequencyReport.reportForYear', { year: reportData.meta.year })}
          </CardDescription>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6"> {/* Adjusted to match income report */}
            <StatCard 
                title={t('reports:yearlyPatientFrequencyReport.totalUniquePatients')}
                value={formatNumber(reportData.meta.total_unique_patients_yearly, 0)}
                icon={Users}
                variant="info"
            />
            <StatCard 
                title={t('reports:yearlyPatientFrequencyReport.averageMonthlyPatients')}
                value={formatNumber(reportData.meta.average_monthly_patients, 1)}
                icon={BarChart2} // Using BarChart2 for average
                variant="default"
            />
          </div>

          <Card>
            <CardHeader>
                <CardTitle>{t('reports:yearlyPatientFrequencyReport.chartTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] w-full">
                {chartData.length === 0 && !isFetching ? (
                     <p className="text-center text-muted-foreground py-10">{t('common:noDataAvailableForChart')}</p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: i18n.dir() === 'rtl' ? 5 : -10, bottom: 20 }}>
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
                                height={50} // Increased height for angled labels
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => formatNumber(value, 0)}
                                domain={[0, 'dataMax + 10']} // Auto scale Y axis with some padding
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
                                formatter={(value: number) => [formatNumber(value,0), t('reports:yearlyPatientFrequencyReport.patients')]}
                            />
                            <Bar dataKey="patients" name={t('reports:yearlyPatientFrequencyReport.patientCount')} radius={[4, 4, 0, 0]} barSize={35}>
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