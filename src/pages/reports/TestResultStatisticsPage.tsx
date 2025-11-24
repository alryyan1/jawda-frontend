// src/pages/reports/TestResultStatisticsPage.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FlaskConical, BarChart3 } from 'lucide-react';

import type { MainTestStripped } from '@/types/labTests';
import { getTestResultStatistics, type TestResultStatisticsFilters } from '@/services/reportService';
import { getMainTestsListForSelection } from '@/services/mainTestService';

// MUI imports
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Alert,
  Table as MUITable,
  TableHead as MUITableHead,
  TableBody as MUITableBody,
  TableRow as MUITableRow,
  TableCell as MUITableCell,
  Paper,
  Box,
  LinearProgress,
} from '@mui/material';

const getTestResultStatsFilterSchema = () => z.object({
  main_test_id: z.number({
    required_error: 'يجب اختيار تحليل',
    invalid_type_error: 'يجب اختيار تحليل',
  }).refine((val) => val > 0, {
    message: 'يجب اختيار تحليل',
  }),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

type TestResultStatsFilterFormValues = z.infer<ReturnType<typeof getTestResultStatsFilterSchema>>;

interface AutocompleteOption {
  id: number;
  name: string;
}

const TestResultStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const defaultDateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultDateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const filterForm = useForm<TestResultStatsFilterFormValues>({
    resolver: zodResolver(getTestResultStatsFilterSchema()),
    defaultValues: {
      main_test_id: 0,
      date_from: defaultDateFrom,
      date_to: defaultDateTo,
    },
    mode: 'onSubmit', // Only validate on submit, not on change
  });

  const [appliedFilters, setAppliedFilters] = useState<TestResultStatisticsFilters | null>(null);

  // Fetch main tests for selection
  const { data: mainTests, isLoading: isLoadingMainTests } = useQuery<MainTestStripped[], Error>({
    queryKey: ['mainTestsListForResultStatistics'],
    queryFn: () => getMainTestsListForSelection({}),
  });

  // Fetch statistics
  const {
    data: statisticsData,
    isLoading: isLoadingStatistics,
    error,
  } = useQuery({
    queryKey: ['testResultStatistics', appliedFilters],
    queryFn: () => getTestResultStatistics(appliedFilters!),
    enabled: !!appliedFilters && appliedFilters.main_test_id > 0,
  });

  const handleFilterSubmit = (data: TestResultStatsFilterFormValues) => {
    if (data.main_test_id && data.main_test_id > 0) {
      setAppliedFilters({
        main_test_id: data.main_test_id,
        date_from: data.date_from || undefined,
        date_to: data.date_to || undefined,
      });
    } else {
      // This should be caught by validation, but just in case
      filterForm.setError('main_test_id', {
        type: 'manual',
        message: 'يجب اختيار تحليل',
      });
    }
  };

  const mainTestsOptions: AutocompleteOption[] = React.useMemo(() => {
    return mainTests?.map(test => ({
      id: test.id,
      name: test.main_test_name,
    })) || [];
  }, [mainTests]);

  return (
    <div className="space-y-6 p-4 md:p-1">
      <div className="flex items-center gap-2">
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/reports/lab-test-statistics')}
        >
          العودة
        </Button>
        <FlaskConical className="h-7 w-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">إحصائيات نتائج التحاليل</h1>
      </div>

      <Card>
        <CardHeader>
          <Typography variant="h6">المرشحات</Typography>
        </CardHeader>
        <CardContent>
          <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <Controller
                control={filterForm.control}
                name="main_test_id"
                render={({ field, fieldState }) => (
                  <Autocomplete<AutocompleteOption>
                    options={mainTestsOptions}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={field.value > 0 ? (mainTestsOptions.find(opt => opt.id === field.value) || null) : null}
                    onChange={(_, newValue) => {
                      const newId = newValue ? newValue.id : 0;
                      field.onChange(newId);
                      // Explicitly set the value to ensure form state is updated
                      filterForm.setValue('main_test_id', newId, { shouldValidate: false });
                    }}
                    onBlur={field.onBlur}
                    disabled={isLoadingMainTests}
                    size="small"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="التحليل"
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: '40px',
                            fontSize: '16px',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '14px',
                          },
                        }}
                      />
                    )}
                  />
                )}
              />
              <Controller
                control={filterForm.control}
                name="date_from"
                render={({ field }) => (
                  <TextField
                    label="من تاريخ"
                    type="date"
                    size="small"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isLoadingMainTests}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
              <Controller
                control={filterForm.control}
                name="date_to"
                render={({ field }) => (
                  <TextField
                    label="إلى تاريخ"
                    type="date"
                    size="small"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isLoadingMainTests}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
              <Button
                type="submit"
                variant="contained"
                className="h-9"
                disabled={isLoadingMainTests || isLoadingStatistics}
              >
                {isLoadingStatistics ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'عرض الإحصائيات'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" className="m-4">
          حدث خطأ أثناء الجلب: {error instanceof Error ? error.message : 'خطأ غير معروف'}
        </Alert>
      )}

      {isLoadingStatistics && (
        <Card>
          <CardContent>
            <Box sx={{ width: '100%', py: 2 }}>
              <LinearProgress />
              <Typography className="text-center mt-2">جارٍ تحميل الإحصائيات...</Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {statisticsData && !isLoadingStatistics && (
        <Card>
          <CardHeader>
            <Typography variant="h6">
              إحصائيات نتائج: {statisticsData.main_test.name}
            </Typography>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Paper className="p-4 text-center">
                  <Typography variant="body2" color="text.secondary">
                    إجمالي الطلبات
                  </Typography>
                  <Typography variant="h4" className="font-bold">
                    {statisticsData.total_requests}
                  </Typography>
                </Paper>
                <Paper className="p-4 text-center">
                  <Typography variant="body2" color="text.secondary">
                    إجمالي النتائج
                  </Typography>
                  <Typography variant="h4" className="font-bold">
                    {statisticsData.total_results}
                  </Typography>
                </Paper>
                <Paper className="p-4 text-center">
                  <Typography variant="body2" color="text.secondary">
                    نسبة الإكمال
                  </Typography>
                  <Typography variant="h4" className="font-bold">
                    {statisticsData.total_requests > 0
                      ? ((statisticsData.total_results / statisticsData.total_requests) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Paper>
              </div>

              {statisticsData.statistics.length > 0 ? (
                <>
                  <Typography variant="h6" className="mb-2">
                    توزيع النتائج
                  </Typography>
                  <MUITable size="small">
                    <MUITableHead>
                      <MUITableRow>
                        <MUITableCell align="center">النتيجة</MUITableCell>
                        <MUITableCell align="center">العدد</MUITableCell>
                        <MUITableCell align="center">النسبة المئوية</MUITableCell>
                        <MUITableCell align="center">التمثيل</MUITableCell>
                      </MUITableRow>
                    </MUITableHead>
                    <MUITableBody>
                      {statisticsData.statistics.map((stat, index) => (
                        <MUITableRow key={index}>
                          <MUITableCell align="center" className="font-medium">
                            {stat.result || '(فارغ)'}
                          </MUITableCell>
                          <MUITableCell align="center">{stat.count}</MUITableCell>
                          <MUITableCell align="center">
                            <Typography variant="body2" className="font-semibold">
                              {stat.percentage.toFixed(2)}%
                            </Typography>
                          </MUITableCell>
                          <MUITableCell align="center">
                            <Box sx={{ width: '100%', maxWidth: 200, mx: 'auto' }}>
                              <LinearProgress
                                variant="determinate"
                                value={stat.percentage}
                                sx={{
                                  height: 20,
                                  borderRadius: 1,
                                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                  },
                                }}
                              />
                            </Box>
                          </MUITableCell>
                        </MUITableRow>
                      ))}
                    </MUITableBody>
                  </MUITable>
                </>
              ) : (
                <Alert severity="info">لا توجد نتائج متاحة للتحليل المحدد</Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!statisticsData && !isLoadingStatistics && !error && (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <Typography>يرجى اختيار تحليل وتطبيق المرشحات لعرض الإحصائيات</Typography>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestResultStatisticsPage;

