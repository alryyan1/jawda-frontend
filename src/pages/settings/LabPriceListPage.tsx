// src/pages/settings/LabPriceListPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
  Typography,
  CircularProgress,
  Stack,
  Container,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Skeleton
} from '@mui/material';
import {
  Search,
  Save,
  Delete,
  Print,
  Science
} from '@mui/icons-material';
import { FormProvider } from 'react-hook-form';
import { db } from '@/lib/firebase';
import { writeBatch, doc, collection, getDocs, query as fsQuery, orderBy, startAt, endAt, where, getDoc } from 'firebase/firestore';

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
  const { labId } = useParams();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [numColumns, setNumColumns] = useState(3); // Default columns
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingPriceList, setIsUploadingPriceList] = useState(false);
  const [labName, setLabName] = useState<string>('');

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
    queryFn: () => getAllActiveMainTestsForPriceList(debouncedSearchTerm, selectedPackageId as string | number | null),
    enabled: !labId, // Disable backend fetching when viewing contracted lab price list
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

  // Populate form with fetched tests (backend) when not in lab view
  useEffect(() => {
    if (!labId && allTests) {
      const formattedTests = allTests.map(test => ({
        id: test.id,
        main_test_name: test.main_test_name,
        price: test.price !== null && test.price !== undefined ? String(test.price) : '0',
        isSelectedForDelete: false,
      }));
      reset({ tests: formattedTests });
    }
  }, [labId, allTests, reset]);

  // Populate form with Firestore price list when viewing a contracted lab
  const [isLoadingFs, setIsLoadingFs] = useState(false);
  useEffect(() => {
    const loadFs = async () => {
      if (!labId) return;
      setIsLoadingFs(true);
      try {
        const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
        // Search by name using orderBy + startAt/endAt for prefix match
        let q = fsQuery(colRef);
        // Filter by pack if selected
        const packId = selectedPackageId ? parseInt(String(selectedPackageId), 10) : null;
        if (packId && !Number.isNaN(packId)) {
          q = fsQuery(colRef, where('pack_id', '==', packId));
        }
        const term = debouncedSearchTerm?.trim();
        if (term) {
          // Firestore requires ordering by the field used in range.
          // If both pack filter and name search are applied, include where + orderBy.
          if (packId && !Number.isNaN(packId)) {
            q = fsQuery(colRef, where('pack_id', '==', packId), orderBy('name'), startAt(term), endAt(term + '\uf8ff'));
          } else {
            q = fsQuery(colRef, orderBy('name'), startAt(term), endAt(term + '\uf8ff'));
          }
        }
        const snap = await getDocs(q);
        const formatted = snap.docs.map(d => {
          const data = d.data() as { id?: number; name?: string; price?: number | string };
          return {
            id: data.id ?? Number(d.id),
            main_test_name: String(data.name ?? d.id),
            price: data.price != null ? String(data.price) : '0',
            isSelectedForDelete: false,
          };
        });
        reset({ tests: formatted });
      } finally {
        setIsLoadingFs(false);
      }
    };
    loadFs();
  }, [labId, debouncedSearchTerm, selectedPackageId, reset]);

  // Load lab name for header when in lab context
  useEffect(() => {
    const run = async () => {
      if (!labId) return setLabName('');
      try {
        const ref = doc(db, 'labToLap', String(labId));
        const snap = await getDoc(ref);
        const data = snap.data() as { name?: string } | undefined;
        setLabName(data?.name || String(labId));
      } catch {
        setLabName(String(labId));
      }
    };
    run();
  }, [labId]);

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

  const handleUploadPriceListToFirestore = async () => {
    if (!labId) return;
    try {
      setIsUploadingPriceList(true);
      // Fetch latest main tests from backend (local DB), not from Firestore form
      const freshTests = await getAllActiveMainTestsForPriceList('');
      if (!Array.isArray(freshTests) || freshTests.length === 0) {
        toast.error('لا توجد تحاليل لرفعها من قاعدة البيانات');
        return;
      }
      const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
      const BATCH_LIMIT = 450;
      let uploaded = 0;
      for (let i = 0; i < freshTests.length; i += BATCH_LIMIT) {
        const slice = freshTests.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        slice.forEach(item => {
          const priceNum = item.price !== null && item.price !== undefined ? Number(item.price) : 0;
          const docRef = doc(colRef, String(item.id));
          batch.set(docRef, {
            id: item.id,
            name: item.main_test_name,
            price: isNaN(priceNum) ? 0 : priceNum,
            pack_id: item.pack_id ?? null,
            container_id: item.container_id ?? null,
          }, { merge: true });
        });
        await batch.commit();
        uploaded += slice.length;
      }
      toast.success(`تم رفع ${uploaded} عنصرًا إلى Firestore بنجاح`);
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'حدث خطأ أثناء الرفع';
      toast.error('فشل رفع قائمة الأسعار', { description: message });
    } finally {
      setIsUploadingPriceList(false);
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
        const filters: { search_service_name?: string } = {};
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

    } catch (error: unknown) {
        const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'unknown error';
        console.error("PDF generation error:", message);
        toast.error('فشل توليد ملف PDF لقائمة الأسعار', {
            description: message
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

  const isLoadingTable = (isLoadingTests && !allTests) || isLoadingFs;

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
          {labId && (
            <Typography variant="subtitle1" color="text.secondary">
              المختبر: {labName}
            </Typography>
          )}
          
          <Stack direction="row" spacing={2}>
            {labId && (
              <Button 
                onClick={handleUploadPriceListToFirestore}
                variant="contained"
                size="small"
                disabled={isUploadingPriceList}
                startIcon={isUploadingPriceList ? <CircularProgress size={16} /> : <Save />}
              >
                رفع قائمة الأسعار للمختبر
              </Button>
            )}
            <Button 
              onClick={handleGeneratePdf} 
              variant="outlined" 
              size="small" 
              disabled={isGeneratingPdf}
              startIcon={isGeneratingPdf ? <CircularProgress size={16} /> : <Print />}
            >
              توليد قائمة الأسعار PDF
            </Button>
            {!labId && (
              <Button 
                onClick={handleSubmit(onSubmit)} 
                size="small" 
                disabled={updatePricesMutation.isPending || !isDirty}
                startIcon={updatePricesMutation.isPending ? <CircularProgress size={16} /> : <Save />}
              >
                حفظ جميع الأسعار
              </Button>
            )}
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

        {isLoadingTable ? (
          <Grid container spacing={1}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <Grid key={idx} item xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ p: 1.5 }}>
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="rectangular" height={36} sx={{ mt: 1 }} />
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : !isLoadingTests && testsToDisplay.length === 0 ? (
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
                                        onFocus={
                                          (e) => e.target.select()
                                        }
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