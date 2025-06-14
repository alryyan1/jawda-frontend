// src/pages/reports/YearlyIncomeComparisonReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getYear } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter, TrendingUp, AlertTriangle, BarChartHorizontalBig, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';

import { getYearlyIncomeComparisonReport } from '@/services/reportService';
import type { YearlyIncomeComparisonResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';
import { StatCard } from '@/pages/HomePage';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#AF19FF', '#FF8C00', '#A0522D', '#D2691E'];

const YearlyIncomeComparisonReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common', 'months']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const reportQueryKey = ['yearlyIncomeComparisonReport', selectedYear] as const;
  const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<YearlyIncomeComparisonResponse, Error>({
    queryKey: reportQueryKey,
    queryFn: () => getYearlyIncomeComparisonReport({ year: selectedYear }),
    enabled: !!selectedYear,
  });

  const chartData = useMemo(() => {
    return reportData?.data.map((item, index) => ({
      name: t(`months:m${item.month}`, { defaultValue: item.month_name }), // Use localized month name from backend or format here
      // name: item.month_name, // Use if backend sends localized name directly
      income: item.total_income,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })) || [];
  }, [reportData, t, dateLocale]); // Added dateLocale if formatting month name here

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <BarChartHorizontalBig className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('reports:yearlyIncomeComparisonReport.title')}</h1>
        </div>
        {/* No PDF button for now, as it's primarily a chart */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports:filtersTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5">
              <label htmlFor="year-select-income" className="text-xs font-medium">{t('common:year')}</label>
              <Select 
                value={String(selectedYear)} 
                onValueChange={(val) => setSelectedYear(parseInt(val))}
                dir={i18n.dir()}
              >
                <SelectTrigger id="year-select-income" className="h-9 w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
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
            {t('reports:yearlyIncomeComparisonReport.reportForYear', { year: reportData.meta.year })}
          </CardDescription>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
            <StatCard 
                title={t('reports:yearlyIncomeComparisonReport.totalYearlyIncome')}
                value={formatNumber(reportData.meta.total_yearly_income)}
                unit={t('common:currencySymbolShort')}
                icon={DollarSign}
                variant="success"
            />
            <StatCard 
                title={t('reports:yearlyIncomeComparisonReport.averageMonthlyIncome')}
                value={formatNumber(reportData.meta.average_monthly_income)}
                unit={t('common:currencySymbolShort')}
                icon={TrendingUp}
                variant="info"
            />
          </div>

          <Card>
            <CardHeader>
                <CardTitle>{t('reports:yearlyIncomeComparisonReport.chartTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] w-full"> {/* Ensure chart has height */}
                {chartData.length === 0 && !isFetching ? (
                     <p className="text-center text-muted-foreground py-10">{t('common:noDataAvailableForChart')}</p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: i18n.dir() === 'rtl' ? 5 : 20, left: i18n.dir() === 'rtl' ? 20 : 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3}/>
                            <XAxis 
                                dataKey="name" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                angle={i18n.dir() === 'rtl' ? 0 : -30} // Angle labels for LTR
                                textAnchor={i18n.dir() === 'rtl' ? 'middle' : 'end'} // Adjust anchor
                                interval={0} // Show all month labels
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => formatNumber(value, 0)} // Format Y-axis numbers
                                domain={[0, 'dataMax + 1000']} // Auto scale Y axis
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
                                formatter={(value: number) => [formatNumber(value), t('common:income')]}
                            />
                            <Legend wrapperStyle={{fontSize: '12px'}}/>
                            <Bar dataKey="income" name={t('common:totalIncome')} radius={[4, 4, 0, 0]} barSize={30}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default YearlyIncomeComparisonReportPage;