// src/pages/settings/LabPriceListPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Box,
  TextField,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Stack,
  Container,
  InputAdornment,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Science,
  Search,
  TrendingDown,
  Update
} from '@mui/icons-material';

// Removed local DB fetching; Firestore only
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getAllActiveMainTestsForPriceList } from '@/services/mainTestService';

interface MainTestWithContainer {
  id: number;
  main_test_name: string;
  container_name?: string;
  container?: {
    container_name: string;
  };
  price?: string | number;
  available: boolean;
}

const LabPriceListPage = () => {
  const { labId } = useParams();
  const [labName, setLabName] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [testsAll, setTestsAll] = useState<MainTestWithContainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reloadTs, setReloadTs] = useState(0);
  const [bulkAdjustmentDialog, setBulkAdjustmentDialog] = useState(false);
  const [adjustmentPercentage, setAdjustmentPercentage] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isUpdatingCashPrices, setIsUpdatingCashPrices] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const run = async () => {
      if (!labId) {
        setLabName('');
        return;
      }
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

  useEffect(() => {
    const load = async () => {
      if (!labId) {
        setTestsAll([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
        const snap = await getDocs(colRef);
        let items: MainTestWithContainer[] = snap.docs.map(d => {
          const data = d.data() as { id?: number; name?: string; price?: number | string };
          return {
            id: data.id ?? Number(d.id),
            main_test_name: String(data.name ?? d.id),
            price: data.price != null ? String(data.price) : '0',
            available: true,
          };
        });
        // sort by id asc
        items.sort((a, b) => a.id - b.id);
        const term = debouncedSearchTerm.trim().toLowerCase();
        if (term) {
          items = items.filter(item => item.main_test_name.toLowerCase().includes(term));
        }
        setTestsAll(items);
        // Reset priceInputs map to current values
        const nextMap: Record<number, string> = {};
        items.forEach(t => {
          nextMap[t.id] = t.price !== undefined && t.price !== null ? String(t.price) : '';
        });
        setPriceInputs(nextMap);
      } catch (e) {
        const err = e as Error;
        setError(err);
        toast.error('فشل تحميل قائمة الأسعار من Firestore', { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [labId, debouncedSearchTerm, reloadTs]);


  const handlePriceKeyDown = async (e: React.KeyboardEvent, testId: number, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = (priceInputs[testId] ?? '').trim();
      const priceToSave = value === '' ? '0' : value;

      // Focus next input first for fast data entry
      const nextIndex = currentIndex + 1;
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-price-index="${nextIndex}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }

      try {
        if (!labId) {
          toast.error('لم يتم تحديد المختبر (labId)');
          return;
        }
        const test = testsAll.find(t => t.id === testId);
        const name = test?.main_test_name || String(testId);
        const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
        const ref = doc(colRef, String(testId));
        await setDoc(ref, {
          id: testId,
          name,
          price: parseFloat(priceToSave) || 0,
        }, { merge: true });
        toast.success('تم تحديث سعر Firestore بنجاح');
      } catch (err) {
        const message = (err as { message?: string })?.message || 'خطأ غير معروف';
        toast.error('فشل تحديث سعر Firestore', { description: message });
      }
    }
  };

  const handlePriceFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleUploadPriceListToFirestore = async () => {
    if (!labId) {
      toast.error('لا يمكن الرفع بدون labId');
      return;
    }
    try {
      setIsUploading(true);
      // Fetch latest main tests from backend (local DB)
      const freshTests = await getAllActiveMainTestsForPriceList('');
      if (!Array.isArray(freshTests) || freshTests.length === 0) {
        toast.error('لا توجد تحاليل لرفعها من قاعدة البيانات');
        return;
      }
      const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
      const BATCH_LIMIT = 450;
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
      }
      toast.success('تم رفع قائمة الأسعار إلى Firestore');
      setReloadTs(Date.now());
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'حدث خطأ أثناء الرفع';
      toast.error('فشل رفع قائمة الأسعار', { description: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkPriceAdjustment = async () => {
    if (!labId) {
      toast.error('لا يمكن التعديل بدون labId');
      return;
    }

    const percentage = parseFloat(adjustmentPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast.error('يرجى إدخال نسبة صحيحة بين 1 و 100');
      return;
    }

    try {
      setIsAdjusting(true);
      const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
      const BATCH_LIMIT = 450;
      
      // Get all current tests
      const currentTests = testsAll.filter(test => test.price && parseFloat(String(test.price)) > 0);
      
      if (currentTests.length === 0) {
        toast.error('لا توجد أسعار للتعديل');
        return;
      }

      // Calculate new prices with decrease
      const decreaseFactor = 1 - (percentage / 100); // Convert percentage to factor
      
      for (let i = 0; i < currentTests.length; i += BATCH_LIMIT) {
        const slice = currentTests.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        
        slice.forEach(test => {
          const currentPrice = parseFloat(String(test.price)) || 0;
          const newPrice = Math.max(0, currentPrice * decreaseFactor); // Ensure price doesn't go below 0
          
          const docRef = doc(colRef, String(test.id));
          batch.update(docRef, {
            price: Math.round(newPrice)  // Round to 2 decimal places
          });
        });
        
        await batch.commit();
      }
      
      toast.success(`تم تطبيق خصم ${percentage}% على جميع الأسعار بنجاح`);
      setBulkAdjustmentDialog(false);
      setAdjustmentPercentage('');
      setReloadTs(Date.now());
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'حدث خطأ أثناء التعديل';
      toast.error('فشل تعديل الأسعار', { description: message });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleUpdateWithCashPrices = async () => {
    if (!labId) {
      toast.error('لا يمكن التحديث بدون labId');
      return;
    }

    try {
      setIsUpdatingCashPrices(true);
      toast.info('جاري جلب الأسعار النقدية من قاعدة البيانات...');

      // Fetch all active main tests with their cash prices from local DB
      const freshTests = await getAllActiveMainTestsForPriceList('');
      
      if (!Array.isArray(freshTests) || freshTests.length === 0) {
        toast.error('لا توجد تحاليل في قاعدة البيانات');
        return;
      }

      // Create a map of test ID to cash price for quick lookup
      const cashPriceMap = new Map<number, number>();
      freshTests.forEach(test => {
        if (test.price !== null && test.price !== undefined) {
          cashPriceMap.set(test.id, Number(test.price));
        }
      });

      if (cashPriceMap.size === 0) {
        toast.error('لا توجد أسعار نقدية في قاعدة البيانات');
        return;
      }

      toast.info(`جاري تحديث ${cashPriceMap.size} سعر نقدي...`);

      const colRef = collection(db, 'labToLap', String(labId), 'pricelist');
      const BATCH_LIMIT = 450;
      let updatedCount = 0;

      // Process in batches
      const testIds = Array.from(cashPriceMap.keys());
      for (let i = 0; i < testIds.length; i += BATCH_LIMIT) {
        const slice = testIds.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        
        slice.forEach(testId => {
          const cashPrice = cashPriceMap.get(testId);
          if (cashPrice !== undefined) {
            const docRef = doc(colRef, String(testId));
            batch.set(docRef, {
              id: testId,
              name: freshTests.find(t => t.id === testId)?.main_test_name || `Test ${testId}`,
              price: cashPrice,
            }, { merge: true });
            updatedCount++;
          }
        });
        
        await batch.commit();
      }
      
      toast.success(`تم تحديث ${updatedCount} سعر نقدي بنجاح`);
      setReloadTs(Date.now());
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'حدث خطأ أثناء التحديث';
      toast.error('فشل تحديث الأسعار النقدية', { description: message });
    } finally {
      setIsUpdatingCashPrices(false);
    }
  };

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        خطأ في تحميل قائمة الاختبارات: {(error as Error).message}
      </Typography>
    );
  }

  // Client-side pagination
  const perPage = 20;
  const total = testsAll.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const startIndex = (currentPage - 1) * perPage;
  const tests = testsAll.slice(startIndex, startIndex + perPage);

  return (
    <Container  className="text-2xl! p-2 max-w-2xl mx-auto" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {labId && (
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography variant="h3" component="div" fontWeight="bold">
            {labName}
          </Typography>
        </Box>
      )}
      <p className="text-sm!  animate-bounce">
        اضغط <kbd>Enter</kbd> <span style={{fontSize: '1.1em'}}>⏎</span> لتحديث السعر
      </p>
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
          
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <TextField
              type="search"
              placeholder="البحث في الاختبارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 256 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="outlined"
              startIcon={<TrendingDown />}
              onClick={() => setBulkAdjustmentDialog(true)}
              disabled={testsAll.length === 0}
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              خصم على الأسعار
            </Button>
            
            <Button
              variant="contained"
              startIcon={isUpdatingCashPrices ? <CircularProgress size={16} /> : <Update />}
              onClick={handleUpdateWithCashPrices}
              disabled={isUpdatingCashPrices}
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              {isUpdatingCashPrices ? 'جاري التحديث...' : 'تحديث بالأسعار النقدية'}
            </Button>
            
          </Stack>
        </Stack>
        
        {/* Table area with inline loading */}
        {(!isLoading && tests.length === 0) ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Science sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'لم يتم العثور على نتائج' : 'لا توجد اختبارات'}
              </Typography>
              {labId && (
                <Button 
                  onClick={handleUploadPriceListToFirestore} 
                  variant="contained" 
                  size="small"
                  disabled={isUploading}
                  startIcon={isUploading ? <CircularProgress size={16} /> : undefined}
                  sx={{ mt: 2 }}
                >
                  رفع قائمة الأسعار للمختبر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="text-2xl!" align="center">الكود</TableCell>
                    <TableCell className="text-2xl!" align="center">اسم التحليل</TableCell>
                    <TableCell className="text-2xl!" align="center">السعر</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tests.map((test, index) => (
                    <TableRow 
                      key={test.id}
                      hover
                    >
                      <TableCell className="text-2xl!" align="center" sx={{ fontWeight: 'medium' }}>
                        {test.id}
                      </TableCell>
                      <TableCell className="text-2xl!" align="center" sx={{ fontWeight: 'medium' }}>
                        {test.main_test_name}
                      </TableCell>
                      <TableCell className="text-2xl!" align="center">
                        <TextField
                          value={priceInputs[test.id] ?? ''}
                          onChange={(e) => setPriceInputs(prev => ({ ...prev, [test.id]: e.target.value }))}
                          onKeyDown={(e) => handlePriceKeyDown(e, test.id, index)}
                          onFocus={handlePriceFocus}
                          size="small"
                          type="number"
                          inputProps={{ 
                            step: "0.01",
                            min: "0",
                            style: { textAlign: 'center', fontSize: '1.25rem' },
                            'data-price-index': index,
                          }}
                          sx={{ 
                            width: 150,
                            '& .MuiInputBase-input': { 
                              textAlign: 'center',
                              fontSize: '1.25rem'
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}
        {lastPage > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={lastPage}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              disabled={isLoading}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}


        {/* Bulk Price Adjustment Dialog */}
        <Dialog 
          open={bulkAdjustmentDialog} 
          onClose={() => setBulkAdjustmentDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrendingDown color="primary" />
              <Typography variant="h6" fontWeight="bold">
                تطبيق خصم على جميع الأسعار
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                سيتم تطبيق نسبة الخصم على جميع الأسعار الموجودة في قائمة الأسعار
              </Typography>
              
              <TextField
                label="نسبة الخصم (%)"
                type="number"
                value={adjustmentPercentage}
                onChange={(e) => setAdjustmentPercentage(e.target.value)}
                placeholder="مثال: 5"
                fullWidth
                inputProps={{ 
                  min: 1, 
                  max: 100,
                  step: 0.1
                }}
                helperText="أدخل النسبة من 1 إلى 100 (مثال: 5 يعني خصم 5%)"
              />
              
              {adjustmentPercentage && !isNaN(parseFloat(adjustmentPercentage)) && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>مثال:</strong> إذا كان السعر الحالي 100 جنيه ونسبة الخصم {adjustmentPercentage}%
                    <br />
                    <strong>السعر الجديد:</strong> {Math.round((100 * (1 - parseFloat(adjustmentPercentage) / 100)) * 100) / 100} جنيه
                  </Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setBulkAdjustmentDialog(false)}
              disabled={isAdjusting}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleBulkPriceAdjustment}
              variant="contained"
              disabled={isAdjusting || !adjustmentPercentage || isNaN(parseFloat(adjustmentPercentage))}
              startIcon={isAdjusting ? <CircularProgress size={16} /> : <TrendingDown />}
            >
              {isAdjusting ? 'جاري التطبيق...' : 'تطبيق الخصم'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
};

export default LabPriceListPage;