// src/pages/lab/MainTestsListPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  TableHeader,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  CircularProgress,
  Stack,
  Container,
  InputAdornment,
  Chip,
  Pagination
} from '@mui/material';
import {
  Edit,
  Delete,
  MoreVert,
  Science,
  CheckCircle,
  Cancel,
  Search,
  Add
} from '@mui/icons-material';

import { getMainTests, deleteMainTest } from '@/services/mainTestService';
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
  const queryClient = useQueryClient();
  // const { can } = useAuthorization();
  const canCreateTests = true; // Placeholder: can('create lab_tests');
  const canEditTests = true;   // Placeholder: can('edit lab_tests');
  const canDeleteTests = true; // Placeholder: can('delete lab_tests');

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: deleteMainTest,
    onSuccess: () => {
      toast.success('تم حذف الاختبار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mainTests'] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('خطأ في حذف الاختبار', { description: err.response?.data?.message || err.message });
    },
  });

  const handleDelete = (testId: number, testName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الاختبار "${testName}"؟`)) {
      deleteMutation.mutate(testId);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, testId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTestId(testId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTestId(null);
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
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
              قائمة الاختبارات الرئيسية
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
                  <TableCell align="center">المعرف</TableCell>
                  <TableCell align="center">اسم الاختبار</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    الوعاء
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    السعر
                  </TableCell>
                  <TableCell align="center">متاح</TableCell>
                  <TableCell align="right">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                      {test.id}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                      {test.main_test_name}
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {test.container?.container_name || test.container_name || '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {test.price ? Number(test.price).toFixed(2) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      {test.available ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Cancel color="error" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, test.id)}
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
          {canEditTests && (
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
          )}
          {canDeleteTests && (
            <>
              <Divider />
              <MenuItem 
                onClick={() => {
                  if (selectedTestId) {
                    const test = tests.find(t => t.id === selectedTestId);
                    if (test) {
                      handleDelete(test.id, test.main_test_name);
                    }
                  }
                  handleMenuClose();
                }}
                disabled={deleteMutation.isPending && deleteMutation.variables === selectedTestId}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <Delete fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>حذف</ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>
      </Stack>
    </Container>
  );
}