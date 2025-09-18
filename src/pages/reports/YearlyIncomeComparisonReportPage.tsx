// src/pages/reports/YearlyIncomeComparisonReportPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getYear } from 'date-fns';
import { arSA } from 'date-fns/locale';

import { Loader2, Filter, TrendingUp, AlertTriangle, BarChartHorizontalBig, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';

import { getYearlyIncomeComparisonReport } from '@/services/reportService';
import type { YearlyIncomeComparisonResponse } from '@/types/reports';
import { formatNumber } from '@/lib/utils';

// MUI imports
import {
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Typography,
	FormControl,
	InputLabel,
	Select as MUISelect,
	MenuItem,
	Alert,
} from '@mui/material';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#AF19FF', '#FF8C00', '#A0522D', '#D2691E'];

const YearlyIncomeComparisonReportPage: React.FC = () => {
	const dateLocale = arSA;

	const [selectedYear, setSelectedYear] = useState<number>(currentYear);

	const reportQueryKey = ['yearlyIncomeComparisonReport', selectedYear] as const;
	const { data: reportData, isLoading, error, isFetching, refetch } = useQuery<YearlyIncomeComparisonResponse, Error>({
		queryKey: reportQueryKey,
		queryFn: () => getYearlyIncomeComparisonReport({ year: selectedYear }),
		enabled: !!selectedYear,
	});

	const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
	const chartData = useMemo(() => {
		return reportData?.data.map((item, index) => ({
			name: AR_MONTHS[(item.month - 1) % 12] || item.month_name,
			income: item.total_income,
			fill: CHART_COLORS[index % CHART_COLORS.length],
		})) || [];
	}, [reportData, dateLocale]);

	return (
		<Box className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
			<Box className="flex flex-col sm:flex-row justify-between items-center gap-4">
				<Box className="flex items-center gap-3">
					<BarChartHorizontalBig className="h-7 w-7 text-primary" />
					<Typography variant="h4" component="h1" fontWeight={700}>مقارنة الدخل السنوية</Typography>
				</Box>
			</Box>

			<Card>
				<CardHeader title={<Typography variant="h6">مرشحات التقرير</Typography>} />
				<CardContent>
					<Box className="flex flex-col sm:flex-row gap-3 items-end">
						<FormControl size="small" className="w-full sm:w-[180px]">
							<InputLabel id="year-select-income-label">السنة</InputLabel>
							<MUISelect
								labelId="year-select-income-label"
								id="year-select-income"
								label="السنة"
								value={selectedYear}
								onChange={(e) => setSelectedYear(Number(e.target.value))}
							>
								{years.map((y) => (
									<MenuItem key={y} value={y}>{y}</MenuItem>
								))}
							</MUISelect>
						</FormControl>

						<Button onClick={() => refetch()} variant="contained" disabled={isLoading || isFetching} startIcon={isFetching ? undefined : <Filter className="h-4 w-4" />}>
							{isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق المرشحات'}
						</Button>
					</Box>
				</CardContent>
			</Card>

			{(isLoading || isFetching) && !reportData && (
				<Box className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Box>
			)}
			{error && (
				<Alert severity="error" icon={<AlertTriangle />}>
					<Typography fontWeight={600}>فشل جلب البيانات</Typography>
					<Typography>{error.message || 'حدث خطأ غير متوقع'}</Typography>
				</Alert>
			)}
			
			{reportData && !isLoading && (
				<>
					<Typography align="center" variant="body2">تقرير سنة: {reportData.meta.year}</Typography>

					<Box className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
						<Card>
							<CardHeader title={<Typography variant="subtitle1">إجمالي الدخل السنوي</Typography>} />
							<CardContent>
								<Typography variant="h5" fontWeight={700}>{formatNumber(reportData.meta.total_yearly_income)} <Typography component="span" variant="subtitle2">ر.س</Typography></Typography>
							</CardContent>
						</Card>
						<Card>
							<CardHeader title={<Typography variant="subtitle1">متوسط الدخل الشهري</Typography>} />
							<CardContent>
								<Typography variant="h5" fontWeight={700}>{formatNumber(reportData.meta.average_monthly_income)} <Typography component="span" variant="subtitle2">ر.س</Typography></Typography>
							</CardContent>
						</Card>
					</Box>

					<Card>
						<CardHeader title={<Typography>مخطط الدخل الشهري</Typography>} />
						<CardContent className="h-[400px] w-full">
							{chartData.length === 0 && !isFetching ? (
								<Typography align="center" color="text.secondary" className="py-10">لا توجد بيانات لعرض المخطط</Typography>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
										<CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3}/>
										<XAxis 
											dataKey="name" 
											stroke="hsl(var(--muted-foreground))" 
											fontSize={10} 
											tickLine={false} 
											axisLine={false}
											angle={0}
											textAnchor={'middle'}
											interval={0}
										/>
										<YAxis 
											stroke="hsl(var(--muted-foreground))" 
											fontSize={10} 
											tickLine={false} 
											axisLine={false}
											tickFormatter={(value) => formatNumber(value, 0)}
											domain={[0, 'dataMax + 1000']}
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
											formatter={(value: number) => [formatNumber(value), 'الدخل']}
										/>
										<Legend wrapperStyle={{fontSize: '12px'}}/>
										<Bar dataKey="income" name="إجمالي الدخل" radius={[4, 4, 0, 0]} barSize={30}>
											{chartData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							)}
						</CardContent>
						<CardActions />
					</Card>
				</>
			)}
		</Box>
	);
};

export default YearlyIncomeComparisonReportPage;