// src/pages/analysis/AnalysisPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

// MUI
import { Box, Button, Card, CardContent, CircularProgress, Divider, TextField, Typography, Alert } from '@mui/material';
import { BarChart as BarChartIcon } from '@mui/icons-material';

import { Loader2, DollarSign, Users, TrendingUp, TrendingDown, ListOrdered, UserCheck, Stethoscope } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar } from 'recharts';

import { getAnalysisSummaryData, type AnalysisFilters } from '@/services/analysisService';
import type { AnalysisData } from '@/types/analysis';
import { formatNumber } from '@/lib/utils';

// StatCard component using MUI
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  unit?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, unit, isLoading }) => {
  return (
    <Card sx={{ boxShadow: 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Icon className="h-5 w-5" />
        </Box>
        {isLoading ? (
          <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight={700}>
              {value}
              {unit && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{unit}</Typography>}
            </Typography>
            {description && <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5, display: 'block' }}>{description}</Typography>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const AnalysisPage: React.FC = () => {
  const dateLocale = arSA;

  // From/To as ISO date strings (yyyy-MM-dd)
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState<string>(todayIso);
  const [dateTo, setDateTo] = useState<string>(todayIso);

  const analysisQueryKey = ['analysisSummaryData', dateFrom, dateTo];

  const { data: analysisData, isLoading, error, isFetching, refetch } = useQuery<AnalysisData, Error>({
    queryKey: analysisQueryKey,
    queryFn: () => {
      if (!dateFrom || !dateTo) {
        throw new Error('الرجاء تحديد فترة زمنية');
      }
      const filters: AnalysisFilters = {
        date_from: dateFrom,
        date_to: dateTo,
      };
      return getAnalysisSummaryData(filters);
    },
    enabled: !!(dateFrom && dateTo),
  });

  const topServicesChartData = useMemo(() => {
    return analysisData?.top_services.map(service => ({
      name: service.service_name.length > 20 ? service.service_name.substring(0, 18) + '...' : service.service_name,
      count: service.request_count,
    })).reverse() || [];
  }, [analysisData]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>لوحة التحليلات</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            label="من"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={() => refetch()} disabled={isLoading || isFetching || !dateFrom || !dateTo}>
            {isFetching ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            تطبيق
          </Button>
        </Box>
      </Box>

      {isLoading && !analysisData && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error.message || 'حدث خطأ ما'}</Alert>
      )}

      {analysisData && !isLoading && (
        <>
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              تقرير للفترة: {format(parseISO(analysisData.period.from), 'PPP', { locale: dateLocale })}
              {' '} - {' '}
              {format(parseISO(analysisData.period.to), 'PPP', { locale: dateLocale })}
              {' '}({analysisData.period.number_of_days} يوم)
            </Typography>
          </Box>

          {/* KPI Cards */}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(5, 1fr)' }, mt: 2 }}>
            <StatCard title="إجمالي الدخل" value={formatNumber(analysisData.total_income)} unit="ج.س" icon={DollarSign} isLoading={isFetching} />
            <StatCard title="الأطباء المتواجدون" value={analysisData.doctors_present_count} icon={UserCheck} isLoading={isFetching} />
            <StatCard title="متوسط الدخل اليومي" value={formatNumber(analysisData.average_daily_income)} unit="ج.س" icon={TrendingUp} isLoading={isFetching} />
            <StatCard title="متوسط تردد المرضى" value={formatNumber(analysisData.average_patient_frequency, 1)} description="زيارات/يوم" icon={Users} isLoading={isFetching} />
            <StatCard title="إجمالي المصروفات" value={formatNumber(analysisData.total_costs)} unit="ج.س" icon={TrendingDown} isLoading={isFetching} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start', mt: 3 }}>
            {/* Top Services Chart */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ListOrdered className="h-5 w-5" /> أكثر الخدمات طلباً
                </Typography>
                <Typography variant="body2" color="text.secondary">أعلى 10 خدمات</Typography>
                <Divider sx={{ my: 2 }} />
                {isFetching ? (
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : topServicesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart layout="vertical" data={topServicesChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} interval={0} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="عدد الطلبات" fill="#1976d2" radius={[0, 4, 4, 0]} barSize={15} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>لا توجد بيانات</Typography>
                )}
              </CardContent>
            </Card>

            {/* Most Frequent Doctor */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Stethoscope className="h-5 w-5" /> أكثر طبيب تكراراً
                </Typography>
                <Typography variant="body2" color="text.secondary">خلال الفترة المحددة</Typography>
                <Divider sx={{ my: 2 }} />
                {isFetching ? (
                  <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : analysisData.most_frequent_doctor ? (
                  <Box>
                    <Typography variant="h6" color="primary">{analysisData.most_frequent_doctor.doctor_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      عدد الزيارات: {analysisData.most_frequent_doctor.visit_count}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>لا توجد بيانات</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AnalysisPage;