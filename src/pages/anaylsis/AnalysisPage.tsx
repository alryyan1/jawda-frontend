// src/pages/analysis/AnalysisPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assuming you have this component
import type { DateRange } from 'react-day-picker';
import { Loader2, AlertTriangle, DollarSign, Users, TrendingUp, TrendingDown, BarChart, UserCheck, ListOrdered, Stethoscope } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar } from 'recharts'; // For charts

import { getAnalysisSummaryData, type AnalysisFilters } from '@/services/analysisService';
import type { AnalysisData } from '@/types/analysis';
import { formatNumber } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

// StatCard component (can be moved to a common UI components file)
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  unit?: string;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral'; // For visual trend indication (optional)
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, unit, isLoading }) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 flex items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {value}
              {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
            </div>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};


const AnalysisPage: React.FC = () => {
  const { t, i18n } = useTranslation(['analysis', 'common']); // Create 'analysis.json' for translations
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subDays(new Date(), 30)), // Default to start of last month
    to: endOfMonth(subDays(new Date(), 30)),   // Default to end of last month
  });

  const analysisQueryKey = ['analysisSummaryData', dateRange?.from, dateRange?.to];

  const { data: analysisData, isLoading, error, isFetching, refetch } = useQuery<AnalysisData, Error>({
    queryKey: analysisQueryKey,
    queryFn: () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error(t('analysis:dateRangeRequiredError'));
      }
      const filters: AnalysisFilters = {
        date_from: format(dateRange.from, 'yyyy-MM-dd'),
        date_to: format(dateRange.to, 'yyyy-MM-dd'),
      };
      return getAnalysisSummaryData(filters);
    },
    enabled: !!(dateRange?.from && dateRange?.to),
  });

  const topServicesChartData = useMemo(() => {
    return analysisData?.top_services.map(service => ({
        name: service.service_name.length > 20 ? service.service_name.substring(0, 18) + '...' : service.service_name, // Truncate long names
        count: service.request_count,
    })).reverse() || []; // Reverse for BarChart horizontal layout (largest at top)
  }, [analysisData]);

  return (
    <TooltipProvider>
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <BarChart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('analysis:pageTitle')}</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              align="end"
              className="w-full sm:w-auto"
              disabled={isLoading || isFetching}
            />
            <Button onClick={() => refetch()} disabled={isLoading || isFetching || !dateRange?.from || !dateRange?.to} className="w-full sm:w-auto">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
              {t('analysis:applyFiltersButton')}
            </Button>
          </div>
        </div>

        {isLoading && !analysisData && (
          <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        )}
        {error && (
           <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle/> {t('common:error.fetchFailedTitle')}</CardTitle></CardHeader>
              <CardContent><p>{error.message || t('common:error.generic')}</p></CardContent>
           </Card>
        )}

        {analysisData && !isLoading && (
          <>
            <CardDescription className="text-center text-sm">
              {t('analysis:reportForPeriod', { 
                  from: format(parseISO(analysisData.period.from), "PPP", { locale: dateLocale }),
                  to: format(parseISO(analysisData.period.to), "PPP", { locale: dateLocale })
              })} ({t('analysis:numberOfDays', {count: analysisData.period.number_of_days})})
            </CardDescription>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard 
                  title={t('analysis:kpi.totalIncome')} 
                  value={formatNumber(analysisData.total_income)} 
                  unit={t('common:currencySymbolShort')} 
                  icon={DollarSign} 
                  isLoading={isFetching}
              />
              <StatCard 
                  title={t('analysis:kpi.doctorsPresent')} 
                  value={analysisData.doctors_present_count} 
                  icon={UserCheck} 
                  isLoading={isFetching}
              />
              <StatCard 
                  title={t('analysis:kpi.avgDailyIncome')} 
                  value={formatNumber(analysisData.average_daily_income)} 
                  unit={t('common:currencySymbolShort')} 
                  icon={TrendingUp} 
                  isLoading={isFetching}
              />
              <StatCard 
                  title={t('analysis:kpi.avgPatientFrequency')} 
                  value={formatNumber(analysisData.average_patient_frequency, 1)} // 1 decimal place
                  description={t('analysis:kpi.visitsPerDay')}
                  icon={Users} 
                  isLoading={isFetching}
              />
              <StatCard 
                  title={t('analysis:kpi.totalCosts')} 
                  value={formatNumber(analysisData.total_costs)} 
                  unit={t('common:currencySymbolShort')} 
                  icon={TrendingDown} 
                  isLoading={isFetching}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-[2fr_1fr] items-start">
              {/* Top Services Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-primary"/>
                      {t('analysis:topServices.title')}
                  </CardTitle>
                  <CardDescription>{t('analysis:topServices.description', { count: 10 })}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isFetching ? <div className="h-[300px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                   topServicesChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                          <RechartsBarChart layout="vertical" data={topServicesChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  stroke="hsl(var(--muted-foreground))" 
                                  fontSize={10} tickLine={false} axisLine={false} 
                                  width={100} // Adjust width for Y-axis labels
                                  interval={0} // Show all labels
                              />
                              <RechartsTooltip
                                  cursor={{ fill: 'hsl(var(--muted))' }}
                                  contentStyle={{
                                      backgroundColor: 'hsl(var(--background))',
                                      borderColor: 'hsl(var(--border))',
                                      borderRadius: 'var(--radius)',
                                      fontSize: '12px'
                                  }}
                              />
                              <Legend wrapperStyle={{fontSize: '12px'}}/>
                              <Bar dataKey="count" name={t('analysis:topServices.requestCount')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={15} />
                          </RechartsBarChart>
                      </ResponsiveContainer>
                   ) : (
                      <p className="text-center text-muted-foreground py-10">{t('analysis:topServices.noData')}</p>
                   )
                  }
                </CardContent>
              </Card>

              {/* Most Frequent Doctor */}
              <Card>
                  <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                          <Stethoscope className="h-5 w-5 text-primary"/> {/* Assuming Stethoscope icon */}
                          {t('analysis:mostFrequentDoctor.title')}
                      </CardTitle>
                      <CardDescription>{t('analysis:mostFrequentDoctor.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isFetching ? <div className="h-[100px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                       analysisData.most_frequent_doctor ? (
                          <div className="space-y-2">
                              <h3 className="text-xl font-semibold text-primary">{analysisData.most_frequent_doctor.doctor_name}</h3>
                              <p className="text-muted-foreground">
                                  {t('analysis:mostFrequentDoctor.visitCount', { count: analysisData.most_frequent_doctor.visit_count })}
                              </p>
                          </div>
                       ) : (
                          <p className="text-center text-muted-foreground py-10">{t('analysis:mostFrequentDoctor.noData')}</p>
                       )
                      }
                  </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AnalysisPage;