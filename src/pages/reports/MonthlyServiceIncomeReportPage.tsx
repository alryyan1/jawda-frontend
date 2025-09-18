// src/pages/reports/MonthlyServiceIncomeReportPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, getYear, getMonth, subMonths } from 'date-fns';

import { Loader2, Filter, BarChartBig, AlertTriangle, FileText, Download } from 'lucide-react';
import { getMonthlyServiceDepositsIncome, type MonthlyServiceIncomeFilters } from '@/services/reportService';
import { formatNumber } from '@/lib/utils';
import apiClient from '@/services/api';
import { toast } from 'sonner';

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
	Table as MUITable,
	TableHead as MUITableHead,
	TableRow as MUITableRow,
	TableCell as MUITableCell,
	TableBody as MUITableBody,
	TableFooter as MUITableFooter,
} from '@mui/material';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const MonthlyServiceIncomeReportPage: React.FC = () => {
	const [filters, setFilters] = useState<MonthlyServiceIncomeFilters>(() => {
		const prevMonthDate = subMonths(new Date(), 1);
		return {
			year: getYear(prevMonthDate),
			month: getMonth(prevMonthDate) + 1,
		};
	});
	
	const { data: reportData, isLoading, error, isFetching, refetch } = useQuery({
		queryKey: ['monthlyServiceDepositsIncomeReport', filters],
		queryFn: () => getMonthlyServiceDepositsIncome(filters),
		enabled: !!(filters.year && filters.month),
	});

	const handleFilterChange = (type: 'year' | 'month', value: string) => {
		setFilters(prev => ({ ...prev, [type]: parseInt(value) }));
	};
	const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | false>(false);
	
	const handleApplyFilters = () => {
		refetch();
	};
	
	const dailyData = reportData?.daily_data || [];
	const summary = reportData?.summary;
	  
	const handleExport = async (formatType: 'pdf' | 'excel') => {
		if (!filters.year || !filters.month) {
			toast.error('الرجاء اختيار الشهر والسنة');
			return;
		}
		setIsExporting(formatType);
		try {
			const endpoint = `/reports/monthly-service-deposits-income/${formatType}`;
			const response = await apiClient.get(endpoint, {
				params: filters,
				responseType: 'blob',
			});

			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			const extension = formatType === 'pdf' ? 'pdf' : 'xlsx';
			const monthStr = String(filters.month).padStart(2, '0');
			link.setAttribute('download', `monthly_service_income_${filters.year}_${monthStr}.${extension}`);
			document.body.appendChild(link);
			link.click();
			link.parentNode?.removeChild(link);
			window.URL.revokeObjectURL(url);
			toast.success('تم التصدير بنجاح');
		} catch (err: unknown) {
			const e = err as { response?: { data?: { message?: string } }, message?: string };
			toast.error('فشل التصدير', { 
				description: e.response?.data?.message || e.message || 'خطأ غير معروف'
			});
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<BarChartBig className="h-7 w-7 text-primary"/>
				<h1 className="text-2xl sm:text-3xl font-bold">دخل الخدمات الشهري</h1>
			</div>
			<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
				<div className="flex gap-2">
					<Button variant="outlined" size="small" onClick={() => handleExport('pdf')} disabled={isExporting === 'pdf' || isLoading} startIcon={isExporting === 'pdf' ? undefined : <FileText className="h-4 w-4"/>}>
						{isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تصدير PDF'}
					</Button>
					<Button variant="outlined" size="small" onClick={() => handleExport('excel')} disabled={isExporting === 'excel' || isLoading} startIcon={isExporting === 'excel' ? undefined : <Download className="h-4 w-4"/>}>
						{isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تصدير Excel'}
					</Button>
				</div>
			</div>
			<Card>
				<CardHeader>
					<Typography variant="h6">مرشحات التقرير</Typography>
				</CardHeader>
				<CardContent className="flex flex-col sm:flex-row gap-3 items-end">
					<div className="grid grid-cols-2 gap-3 flex-grow">
						<div className="space-y-1.5">
							<FormControl size="small" className="w-full">
								<InputLabel id="year-select-label">السنة</InputLabel>
								<MUISelect labelId="year-select-label" id="year-select" label="السنة" value={String(filters.year)} onChange={(e) => handleFilterChange('year', String(e.target.value))}>
									{years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
								</MUISelect>
							</FormControl>
						</div>
						<div className="space-y-1.5">
							<FormControl size="small" className="w-full">
								<InputLabel id="month-select-label">الشهر</InputLabel>
								<MUISelect labelId="month-select-label" id="month-select" label="الشهر" value={String(filters.month)} onChange={(e) => handleFilterChange('month', String(e.target.value))}>
									{months.map(m => (
										<MenuItem key={m} value={String(m)}>{AR_MONTHS[m - 1]}</MenuItem>
									))}
								</MUISelect>
							</FormControl>
						</div>
					</div>
					<Button onClick={handleApplyFilters} variant="contained" size="small" className="h-9 mt-auto sm:mt-0" disabled={isLoading || isFetching} startIcon={!isFetching ? <Filter className="h-4 w-4"/> : undefined}>
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
					<Typography>{(error as Error).message || 'حدث خطأ غير متوقع'}</Typography>
				</Alert>
			)}
			
			{reportData && !isLoading && (
				<>
					<Typography align="center" variant="body2">
						تقرير الفترة: {reportData.report_period.from} - {reportData.report_period.to}
					</Typography>
					<Card>
						<MUITable size="small">
							<MUITableHead>
								<MUITableRow>
									<MUITableCell align="center">التاريخ</MUITableCell>
									<MUITableCell align="center">إجمالي الإيداعات</MUITableCell>
									<MUITableCell align="center">الإيداعات نقدًا</MUITableCell>
									<MUITableCell align="center">الإيداعات بنكي</MUITableCell>
									<MUITableCell align="center">استحقاق الأطباء</MUITableCell>
									<MUITableCell align="center">صافي النقد</MUITableCell>
									<MUITableCell align="center">صافي البنك</MUITableCell>
									<MUITableCell align="center" className="font-semibold">صافي الدخل اليومي</MUITableCell>
								</MUITableRow>
							</MUITableHead>
							<MUITableBody>
								{dailyData.length === 0 && (
									<MUITableRow><MUITableCell colSpan={8} align="center" className="h-24">لا توجد بيانات للفترة</MUITableCell></MUITableRow>
								)}
								{dailyData.map((day) => (
									<MUITableRow key={day.date}>
										<MUITableCell align="center">{format(parseISO(day.date), 'P')} ({format(parseISO(day.date), 'EEEE')})</MUITableCell>
										<MUITableCell align="center">{formatNumber(day.total_income)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(day.total_cash_income)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(day.total_bank_income)}</MUITableCell>
										<MUITableCell align="center" className="text-red-600 dark:text-red-400">{formatNumber(day.total_cost)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(day.net_cash)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(day.net_bank)}</MUITableCell>
										<MUITableCell align="center" className="font-semibold">{formatNumber(day.net_income_for_day)}</MUITableCell>
									</MUITableRow>
								))}
							</MUITableBody>
							{summary && dailyData.length > 0 && (
								<MUITableFooter>
									<MUITableRow>
										<MUITableCell align="center">الإجمالي</MUITableCell>
										<MUITableCell align="center">{formatNumber(summary.total_deposits)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(summary.total_cash_deposits)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(summary.total_bank_deposits)}</MUITableCell>
										<MUITableCell align="center" className="text-red-600 dark:text-red-400">{formatNumber(summary.total_costs_for_days_with_deposits)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(summary.net_cash_flow)}</MUITableCell>
										<MUITableCell align="center">{formatNumber(summary.net_bank_flow)}</MUITableCell>
										<MUITableCell align="center" className="text-lg">{formatNumber(summary.net_total_income)}</MUITableCell>
									</MUITableRow>
								</MUITableFooter>
							)}
						</MUITable>
					</Card>
				</>
			)}
		</div>
	);
};

export default MonthlyServiceIncomeReportPage;