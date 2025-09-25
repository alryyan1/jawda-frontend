// src/pages/users/UsersListPage.tsx
import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getUsers, deleteUser } from "@/services/userService";
import type { User, PaginatedUsersResponse } from "@/types/users";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  UserPlus,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  UserCheck,
} from "lucide-react";

export default function UsersListPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const canCreateUsers = true;
  const canEditUsers = true;
  const canDeleteUsers = true;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);

  const filters = useMemo(() => ({ search: debouncedSearch }), [debouncedSearch]);

  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedUsersResponse, Error>({
    queryKey: ["users", currentPage, filters],
    queryFn: () => getUsers(currentPage, filters),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      const errorResponse = err as Error & { response?: { data?: { message?: string } } };
      toast.error("خطأ أثناء حذف المستخدم.", {
        description:
          errorResponse.response?.data?.message ||
          err.message ||
          "حدث خطأ غير متوقع.",
      });
    },
  });

  const handleDelete = (userToDelete: User) => {
    if (currentUser && currentUser.id === userToDelete.id) {
      toast.error("لا يمكنك حذف نفسك");
      return;
    }
    if (
      userToDelete.roles?.some((role) => role.name === "Super Admin") &&
      paginatedData?.data.filter((u: User) =>
        u.roles?.some((r) => r.name === "Super Admin")
      ).length === 1
    ) {
      toast.error("لا يمكن حذف آخر مشرف في النظام");
      return;
    }

    if (
      window.confirm(
        `هل أنت متأكد أنك تريد حذف المستخدم ${userToDelete.name}؟`
      )
    ) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUserId, setMenuUserId] = useState<number | null>(null);

  const openMenuFor = (event: React.MouseEvent<HTMLButtonElement>, userId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuUserId(userId);
  };

  const closeMenu = () => {
    setMenuAnchorEl(null);
    setMenuUserId(null);
  };

  if (isLoading && !isFetching && currentPage === 1 && !paginatedData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={256}>
        <CircularProgress color="primary" size={40} />
        <Typography sx={{ ml: 2 }} color="text.secondary">جارٍ تحميل المستخدمين...</Typography>
      </Box>
    );
  }
  if (error)
    return (
      <Typography color="error" textAlign="center" sx={{ p: 3 }}>
        {`فشل تحميل إدارة المستخدمين: ${error.message}`}
      </Typography>
    );

  const users = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, lg: 4 } }} dir="rtl">
      <Box sx={{ mb: 2 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <UsersIcon className="h-7 w-7" />
            <Typography variant="h5">إدارة المستخدمين</Typography>
          </Box>
          <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }}>
            <TextField
              size="small"
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              value={searchTerm}
              onChange={(e) => { setCurrentPage(1); setSearchTerm(e.target.value); }}
              fullWidth
              sx={{ minWidth: { sm: 280 }, flex: { xs: 1, sm: 'initial' } }}
            />
            {canCreateUsers && (
              <Link to="/users/new">
                <Button variant="contained" size="small" sx={{ height: 36, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserPlus className="h-4 w-4" /> إضافة مستخدم جديد
                </Button>
              </Link>
            )}
          </Box>
        </Box>
      </Box>

      {isFetching && (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          <Loader2 className="inline h-4 w-4 animate-spin" />
          <Box component="span" sx={{ mx: 0.5 }}></Box>
          جاري تحديث القائمة...
        </Typography>
      )}

      {users.length === 0 && !isLoading && !isFetching ? (
        <Card>
          <CardContent sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
            <UsersIcon className="h-16 w-16" />
            <Typography fontWeight={500}>
              {searchTerm ? "لم يتم العثور على نتائج" : "لم يتم العثور على مستخدمين."}
            </Typography>
            {canCreateUsers && !searchTerm && (
              <Link to="/users/new">
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>
                  إضافة مستخدم جديد
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, width: 50 }}>م</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>اسم المستخدم</TableCell>
                    <TableCell align="center">الأدوار</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>الحالة</TableCell>
                    <TableCell align="right" sx={{ width: 80 }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u: User) => (
                    <TableRow
                      key={u.id}
                      hover
                      onClick={() => navigate(`/users/${u.id}/edit`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, py: 1.25 }}>{u.id}</TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{u.name}</Typography>
                          {u.is_supervisor && (
                            <Tooltip title="مشرف">
                              <span>
                                <UserCheck className="h-4 w-4" />
                              </span>
                            </Tooltip>
                          )}
                          {currentUser?.id === u.id && (
                            <Chip label="أنت" size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }, py: 1.25 }}>
                        {u.username}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.25 }}>
                        <Box display="flex" flexWrap="wrap" gap={0.5} justifyContent="center">
                          {u.roles?.slice(0, 2).map((role) => (
                            <Chip key={role.id} label={role.name} size="small" variant="outlined" sx={{ fontSize: 12 }} />
                          ))}
                          {u.roles && u.roles.length > 2 && (
                            <Tooltip title={u.roles.slice(2).map((r) => r.name).join(", ")}> 
                              <Chip label={`+${u.roles.length - 2}`} size="small" variant="outlined" sx={{ fontSize: 12 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.25 }}>
                        {u.is_active ? (
                          <Chip color="success" label={
                            <Box display="flex" alignItems="center" gap={0.5}><CheckCircle2 className="h-3 w-3"/> نشط</Box>
                          } size="small" sx={{ fontSize: 12 }} />
                        ) : (
                          <Chip color="error" label={
                            <Box display="flex" alignItems="center" gap={0.5}><XCircle className="h-3 w-3"/> غير نشط</Box>
                          } size="small" sx={{ fontSize: 12 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.25 }}>
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openMenuFor(e, u.id); }}
                          disabled={deleteMutation.isPending && deleteMutation.variables === u.id}
                          aria-label="فتح القائمة"
                        >
                          {deleteMutation.isPending && deleteMutation.variables === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </IconButton>
                        <Menu
                          anchorEl={menuAnchorEl}
                          open={Boolean(menuAnchorEl) && menuUserId === u.id}
                          onClose={closeMenu}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                          dir="rtl"
                        >
                          {canEditUsers && (
                            <MenuItem onClick={closeMenu}>
                              <Link to={`/users/${u.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Edit className="h-4 w-4" /> تعديل
                              </Link>
                            </MenuItem>
                          )}
                          {canDeleteUsers && currentUser && currentUser.id !== u.id && (
                            <>
                              <Divider />
                              <MenuItem
                                onClick={() => { closeMenu(); handleDelete(u); }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === u.id}
                                sx={{ color: 'error.main' }}
                              >
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Trash2 className="h-4 w-4" /> حذف
                                </Box>
                              </MenuItem>
                            </>
                          )}
                        </Menu>
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
        <Box display="flex" alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-end' }} gap={1} mt={3}>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="small"
            variant="outlined"
          >
            السابق
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>{`صفحة ${meta.current_page} من ${meta.last_page}`}</Typography>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={currentPage === meta.last_page || isFetching}
            size="small"
            variant="outlined"
          >
            التالي
          </Button>
        </Box>
      )}
    </Container>
  );
}
