// src/pages/roles/RolesListPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getRoles, deleteRole } from '@/services/roleService';
import { Role, Permission } from '@/types/auth';
import { toast } from 'sonner';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
} from '@mui/material';
import { MoreHorizontal, Trash2, Edit, Loader2 } from 'lucide-react';

export default function RolesListPage() {
  // i18n removed
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedData, isLoading, error, isFetching } = useQuery({
    queryKey: ['roles', currentPage],
    queryFn: () => getRoles(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'فشل حذف الدور';
      toast.error(message, { description: err.message && err.message !== message ? err.message : 'حدث خطأ غير متوقع' });
    },
  });

  const handleDelete = (role: Role) => {
    // You might want to fetch role.users_count from backend to use in the confirmation message
    // For now, a generic message
    if (window.confirm(`هل تريد حذف الدور "${role.name}"؟`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const renderPermissions = (permissions?: Permission[]) => {
    if (!permissions || permissions.length === 0) return <Typography variant="caption" color="text.secondary">لا يوجد</Typography>;
    const displayLimit = 3;
    const displayed = permissions.slice(0, displayLimit);
    const remaining = permissions.length - displayLimit;

    return (
      <Box display="flex" flexWrap="wrap" gap={0.5} alignItems="center">
        {displayed.map(p => (
          <Chip key={p.id} label={p.name} size="small" variant="outlined" sx={{ fontSize: 12 }} />
        ))}
        {remaining > 0 && (
          <Chip label={`+${remaining} المزيد`} size="small" variant="outlined" sx={{ fontSize: 12 }} />
        )}
      </Box>
    );
  };

  if (isLoading && !isFetching) return <Box display="flex" justifyContent="center" alignItems="center" height={256}><Loader2 className="h-8 w-8 animate-spin" /> <Typography sx={{ ml: 1 }}>جاري تحميل الأدوار...</Typography></Box>;
  if (error) return <Typography color="error" sx={{ p: 2 }}>حدث خطأ أثناء جلب الأدوار: {error.message}</Typography>;

  const roles = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, lg: 4 } }} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">الأدوار</Typography>
        <Link to="/roles/new">
          <Button variant="contained" size="small">إضافة دور</Button>
        </Link>
      </Box>
      {isFetching && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>جاري تحديث القائمة...</Typography>}

      {roles.length === 0 && !isLoading ? (
        <Typography textAlign="center" color="text.secondary" sx={{ py: 6 }}>لا توجد أدوار للعرض</Typography>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: { xs: 80, sm: 100 } }}>الإسم</TableCell>
                    <TableCell>الصلاحيات</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{role.name}</TableCell>
                      <TableCell>{renderPermissions(role.permissions)}</TableCell>
                      <TableCell align="right">
                        <div className="flex items-center gap-2">
                        <Link to={`/roles/${role.id}/edit`}>
                          <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {role.name !== 'Super Admin' && (
                          <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(role)} disabled={deleteMutation.isPending && deleteMutation.variables === role.id}>
                            {deleteMutation.isPending && deleteMutation.variables === role.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
      {meta && meta.last_page > 1 && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={3}>
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} size="small" variant="outlined">السابق</Button>
          <Typography variant="body2" color="text.secondary">صفحة {meta.current_page} من {meta.last_page}</Typography>
          <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} size="small" variant="outlined">التالي</Button>
        </Box>
      )}
    </Container>
  );
}