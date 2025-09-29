// src/pages/lab/MainTestsListPage.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  Stack,
  Container,
  InputAdornment,
  Pagination
} from '@mui/material';
import {
  Edit,
  MoreVert,
  Science,
  CheckCircle,
  Cancel,
  Search,
  Add,
  PictureAsPdf
} from '@mui/icons-material';

import { getMainTests, updateMainTest } from '@/services/mainTestService';
import apiClient from '@/services/api';
// import { useAuthorization } from '@/hooks/useAuthorization';

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

export default function MainTestsListPage() {
  const navigate = useNavigate();
  // const { can } = useAuthorization();
  const canCreateTests = true; // Placeholder: can('create lab_tests');

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['mainTests', currentPage, debouncedSearchTerm],
    queryFn: () => getMainTests(currentPage, { search: debouncedSearchTerm }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const currentTests = (paginatedData?.data || []) as MainTestWithContainer[];
    const nextMap: Record<number, string> = {};
    currentTests.forEach(t => {
      nextMap[t.id] = t.price !== undefined && t.price !== null ? String(t.price) : '';
    });
    setPriceInputs(nextMap);
  }, [paginatedData]);

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, price }: { id: number; price: string }) => updateMainTest(id, { price }),
    onSuccess: () => {
      toast.success('تم تحديث السعر بنجاح');
      // queryClient.invalidateQueries({ queryKey: ['mainTests'] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('خطأ في تحديث السعر', { description: err.response?.data?.message || err.message });
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, testId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTestId(testId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTestId(null);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, testId: number, currentIndex: number) => {
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

      updatePriceMutation.mutate({ id: testId, price: priceToSave });
    }
  };

  const handlePriceFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleGeneratePDF = async () => {
    try {
      const response = await apiClient.get('/reports/price-list-pdf', {
        responseType: 'blob'
      });

      if (response.status !== 200) {
        throw new Error('Failed to generate PDF');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `price-list-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم إنشاء قائمة الأسعار بنجاح');
    } catch (error) {
      toast.error('خطأ في إنشاء قائمة الأسعار');
      console.error('PDF generation error:', error);
    }
  };

  if (isLoading && !isFetching && currentPage === 1) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={256}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography>جاري تحميل الاختبارات...</Typography>
        </Stack>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        خطأ في تحميل قائمة الاختبارات: {(error as Error).message}
      </Typography>
    );
  }

  const tests = (paginatedData?.data || []) as MainTestWithContainer[];
  const meta = paginatedData?.meta;

  return (
    <Container  className="text-2xl! p-2 max-w-2xl mx-auto" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
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
              قائمة التحاليل الرئيسية
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
            <Stack direction="row" spacing={1}>
              <Button 
                onClick={handleGeneratePDF}
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdf />}
                color="error"
              >
                قائمة الأسعار PDF
              </Button>
              {canCreateTests && (
                <Button 
                  component={Link} 
                  to="/settings/laboratory/new"
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                >
                  إضافة اختبار
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
        
        {isFetching && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            جاري تحديث القائمة...
          </Typography>
        )}
      
        {!isLoading && tests.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Science sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'لم يتم العثور على نتائج' : 'لا توجد اختبارات'}
              </Typography>
              {canCreateTests && !searchTerm && (
                <Button 
                  component={Link} 
                  to="/settings/laboratory/new"
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  sx={{ mt: 2 }}
                >
                  إضافة اختبار
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="text-2xl!" align="center">الكود</TableCell>
                  <TableCell className="text-2xl!" align="center">اسم </TableCell>
                  <TableCell className="text-2xl!" align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    الوعاء
                  </TableCell>
                  <TableCell className="text-2xl!" align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    السعر
                  </TableCell>
                  <TableCell className="text-2xl!" align="center">متاح</TableCell>
                  <TableCell className="text-2xl!" align="right">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((test, index) => (
                  <TableRow 
                    key={test.id}
                    hover
                    onClick={() => navigate(`/settings/laboratory/${test.id}/edit`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell className="text-2xl!" align="center" sx={{ fontWeight: 'medium' }}>
                      {test.id}
                    </TableCell>
                    <TableCell className="text-2xl!" align="center" sx={{ fontWeight: 'medium' }}>
                      {test.main_test_name}
                    </TableCell>
                    <TableCell className="text-2xl!" align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {test.container?.container_name || test.container_name || '-'}
                    </TableCell>
                    <TableCell 
                      className="text-2xl!" 
                      align="center" 
                      sx={{ display: { xs: 'none', md: 'table-cell' } }}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          width: 100,
                          '& .MuiInputBase-input': {
                            textAlign: 'center',
                            fontSize: '1.25rem'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-2xl!" align="center">
                      {test.available ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Cancel color="error" />
                      )}
                    </TableCell>
                    <TableCell className="text-2xl!" align="right">
                      <IconButton
                        onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, test.id); }}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        {meta && meta.last_page > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={meta.last_page}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              disabled={isLoading}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
      
            <MenuItem 
              component={Link} 
              to={`/settings/laboratory/${selectedTestId}/edit`}
              onClick={handleMenuClose}
            >
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>تعديل</ListItemText>
            </MenuItem>
       
         
        </Menu>
      </Stack>
    </Container>
  );
}