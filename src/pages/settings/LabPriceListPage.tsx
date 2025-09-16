// src/pages/settings/LabPriceListPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Box,
  Button,
  TextField,
  Checkbox,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stack,
  Container,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  Search,
  Save,
  Delete,
  Print,
  Science
} from '@mui/icons-material';
import { FormProvider } from 'react-hook-form';

import type { MainTest, Package } from '@/types/labTests';
import { 
    getAllActiveMainTestsForPriceList, 
    batchUpdateTestPrices, 
    batchDeleteMainTests 
} from '@/services/mainTestService';
import { downloadLabPriceListPdf } from '@/services/reportService';
import { getPackagesList } from '@/services/packageService';

// Zod schema for the form managing an array of price list items
const priceListItemSchema = z.object({
  id: z.number(),
  main_test_name: z.string(),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "يجب أن يكون السعر رقمًا موجبًا."}),
  isSelectedForDelete: z.boolean().optional(), // For mass delete
});

const priceListSchema = z.object({
  tests: z.array(priceListItemSchema),
});
type PriceListFormValues = z.infer<typeof priceListSchema>;

interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const LabPriceListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [numColumns, setNumColumns] = useState(3); // Default columns
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Calculate number of columns based on screen width
  useEffect(() => {
     const calculateCols = () => {
         // Approx width per item (name + price input)
         const itemWidth = 280; // Adjust as needed (e.g., 250px for name + 100px for price + gap)
         const screenWidth = window.innerWidth - 240 - 64; // Subtract sidebar and padding approx
         setNumColumns(Math.max(1, Math.floor(screenWidth / itemWidth)));
     };
     calculateCols();
     window.addEventListener('resize', calculateCols);
     return () => window.removeEventListener('resize', calculateCols);
  }, []);

  const { data: allTests, isLoading: isLoadingTests } = useQuery<MainTest[], Error>({
    queryKey: ['allActiveMainTestsForPriceList', debouncedSearchTerm, selectedPackageId],
    queryFn: () => getAllActiveMainTestsForPriceList(debouncedSearchTerm, selectedPackageId),
  });

  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({
    queryKey: ['packagesList'], 
    queryFn: getPackagesList,
  });

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: { tests: [] },
  });
  const { control, handleSubmit, reset, getValues, formState: { dirtyFields, errors, isDirty } } = form;

  const { fields } = useFieldArray({
    control,
    name: "tests",
    keyName: "fieldId" // Important for React key
  });

  // Populate form with fetched tests
  useEffect(() => {
    if (allTests) {
      const formattedTests = allTests.map(test => ({
        id: test.id,
        main_test_name: test.main_test_name,
        price: test.price !== null && test.price !== undefined ? String(test.price) : '0',
        isSelectedForDelete: false,
      }));
      reset({ tests: formattedTests });
    }
  }, [allTests, reset]);

  const updatePricesMutation = useMutation({
    mutationFn: batchUpdateTestPrices,
    onSuccess: (data) => {
      toast.success(data.message || 'تم حفظ أسعار التحاليل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['allActiveMainTestsForPriceList'] });
      form.reset(getValues(), { keepValues: true, keepDirty: false, keepDefaultValues: false }); // Reset dirty state
    },
    onError: (error: ErrorResponse) => toast.error(error.response?.data?.message || 'فشل حفظ الأسعار'),
  });

  const deleteMutation = useMutation({
     mutationFn: batchDeleteMainTests,
     onSuccess: (data) => {
         toast.success(data.message || `تم حذف ${data.deleted_count} عنصر/عناصر بنجاح`);
         if (data.errors && data.errors.length > 0) {
             data.errors.forEach(errMsg => toast.warning(errMsg));
         }
         queryClient.invalidateQueries({ queryKey: ['allActiveMainTestsForPriceList'] });
     },
     onError: (error: ErrorResponse) => toast.error(error.response?.data?.message || 'فشل الحذف الجماعي'),
  });

  const onSubmit = (data: PriceListFormValues) => {
    const dirtyTestUpdates: Array<{ id: number; price: number }> = [];
    data.tests.forEach((test, index) => {
      if (dirtyFields.tests?.[index]?.price) {
        dirtyTestUpdates.push({ id: test.id, price: parseFloat(test.price) });
      }
    });

    if (dirtyTestUpdates.length > 0) {
      updatePricesMutation.mutate(dirtyTestUpdates);
    } else {
      toast.info('لا توجد تغييرات للحفظ');
    }
  };

  const handleDeleteSelected = () => {
     const selectedIds = getValues().tests.filter(t => t.isSelectedForDelete).map(t => t.id);
     if (selectedIds.length === 0) {
         toast.info('يرجى اختيار عناصر للحذف أولاً');
         return;
     }
     if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} عنصرًا؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
         deleteMutation.mutate(selectedIds);
     }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
        const filters: LabPriceListPdfFilters = {};
        if (debouncedSearchTerm) {
            filters.search_service_name = debouncedSearchTerm;
        }
        // Add other active filters if your UI has them (e.g., service_group_id)

        const blob = await downloadLabPriceListPdf(filters);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab_price_list_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('تم توليد ملف PDF لقائمة الأسعار بنجاح');

    } catch (error: any) {
        console.error("PDF generation error:", error.message);
        toast.error('فشل توليد ملف PDF لقائمة الأسعار', {
            description: error.response?.data?.message || error.message
        });
    } finally {
        setIsGeneratingPdf(false);
    }
};


  const testsToDisplay = fields;

  // Split tests into chunks for multi-column display
  const testChunks = useMemo(() => {
     const chunks = [];
     if (!testsToDisplay) return [];
     for (let i = 0; i < testsToDisplay.length; i += numColumns) {
         chunks.push(testsToDisplay.slice(i, i + numColumns));
     }
     return chunks;
  }, [testsToDisplay, numColumns]);

  if (isLoadingTests && !allTests) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={256}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography>جاري تحميل قائمة الأسعار...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Science color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              قائمة أسعار التحاليل
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={2}>
            <Button 
              onClick={handleGeneratePdf} 
              variant="outlined" 
              size="small" 
              disabled={isGeneratingPdf}
              startIcon={isGeneratingPdf ? <CircularProgress size={16} /> : <Print />}
            >
              توليد قائمة الأسعار PDF
            </Button>
            <Button 
              onClick={handleSubmit(onSubmit)} 
              size="small" 
              disabled={updatePricesMutation.isPending || !isDirty}
              startIcon={updatePricesMutation.isPending ? <CircularProgress size={16} /> : <Save />}
            >
              حفظ جميع الأسعار
            </Button>
          </Stack>
        </Stack>
        
        <Typography variant="body2" color="text.secondary">
          تحديث أسعار التحاليل بشكل مجمّع والبحث عن التحاليل
        </Typography>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              sx={{ flexGrow: 1 }}
            >
              <TextField
                type="search"
                placeholder="ابحث عن اسم التحليل"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 250 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                <InputLabel>فلترة حسب الحزمة</InputLabel>
                <Select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  label="فلترة حسب الحزمة"
                  disabled={isLoadingPackages}
                >
                  <MenuItem value="">جميع الحزم</MenuItem>
                  {isLoadingPackages ? (
                    <MenuItem value="loading" disabled>جاري التحميل...</MenuItem>
                  ) : (
                    packages?.map(pkg => (
                      <MenuItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Stack>
            
            <Button 
              variant="contained" 
              color="error"
              size="small" 
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending || getValues().tests.filter(t => t.isSelectedForDelete).length === 0}
              startIcon={<Delete />}
            >
              حذف المحدد ({getValues().tests.filter(t => t.isSelectedForDelete).length})
            </Button>
          </Stack>
        </Paper>

        {isLoadingTests && testsToDisplay.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={5}>
            <CircularProgress />
          </Box>
        ) : null}
        
        {!isLoadingTests && testsToDisplay.length === 0 ? (
          <Paper elevation={1} sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {searchTerm || selectedPackageId ? 'لا توجد نتائج' : 'لا توجد تحاليل للعرض'}
            </Typography>
          </Paper>
        ) : (
          <FormProvider {...form}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                <Stack spacing={1}>
                  {testChunks.map((chunk, rowIndex) => (
                    <Grid key={`row-${rowIndex}`} container spacing={1}>
                      {chunk.map((field, colIndex) => {
                        const actualIndex = rowIndex * numColumns + colIndex;
                        return (
                          <Grid key={field.fieldId} item xs={12} sm={6} md={4} lg={3}>
                            <Card 
                              sx={{ 
                                p: 1.5, 
                                border: errors.tests?.[actualIndex]?.price ? '1px solid' : 'none',
                                borderColor: errors.tests?.[actualIndex]?.price ? 'error.main' : 'transparent'
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Controller
                                  control={control}
                                  name={`tests.${actualIndex}.isSelectedForDelete`}
                                  render={({ field: checkboxField }) => (
                                    <Checkbox
                                      id={`delete-${field.id}`}
                                      checked={checkboxField.value}
                                      onChange={checkboxField.onChange}
                                      size="small"
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography 
                                    variant="body2" 
                                    component="label" 
                                    htmlFor={`price-${field.id}`}
                                    sx={{ 
                                      display: 'block', 
                                      fontWeight: 'medium', 
                                      mb: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={field.main_test_name}
                                  >
                                    {field.main_test_name}
                                  </Typography>
                                  <Controller
                                    control={control}
                                    name={`tests.${actualIndex}.price`}
                                    render={({ field: priceField }) => (
                                      <TextField
                                        id={`price-${field.id}`}
                                        type="number"
                                        inputProps={{ step: "0.01" }}
                                        size="small"
                                        fullWidth
                                        {...priceField}
                                        error={!!errors.tests?.[actualIndex]?.price}
                                        helperText={errors.tests?.[actualIndex]?.price?.message}
                                        sx={{ 
                                          '& .MuiInputBase-input': { 
                                            fontSize: '0.75rem',
                                            py: 0.5
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                </Box>
                              </Stack>
                            </Card>
                          </Grid>
                        );
                      })}
                      {/* Fill empty cells in the last row if chunk is not full */}
                      {Array(numColumns - chunk.length).fill(0).map((_, emptyIndex) => (
                        <Grid key={`empty-${rowIndex}-${emptyIndex}`} item xs={12} sm={6} md={4} lg={3} />
                      ))}
                    </Grid>
                  ))}
                </Stack>
              </Box>
            </Box>
          </FormProvider>
        )}
      </Stack>
    </Container>
  );
};

export default LabPriceListPage;