// src/pages/companies/CompaniesListPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getCompanies, deleteCompany, activateAllCompanies } from "@/services/companyService";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Chip,
  CircularProgress,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  FileText,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthorization } from "@/hooks/useAuthorization"; // For permission checks
import { webUrl } from "../constants";

export default function CompaniesListPage() {
  // i18n removed
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { can ,user} = useAuthorization(); // Get permission checking function
    console.log(user,'user')
  // TODO: Define these permissions in your backend and PermissionName type
  const canCreateCompany = can("create companies" ) || true;
  const canEditCompany = can("edit companies" ) || true;
  const canDeleteCompany = can("delete companies" ) || true;
  const canManageContracts = can("manage company_contracts" ) || true; // Example permission for contracts
  console.log(canCreateCompany,'canCreateCompany','user',user)
  console.log(canManageContracts,'canManageContracts','user',user)
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["companies", currentPage],
    queryFn: () => getCompanies(currentPage),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      toast.success('تم حذف الشركة بنجاح');
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', { description: err.response?.data?.message || err.message });
    },
  });

  const activateAllMutation = useMutation({
    mutationFn: activateAllCompanies,
    onSuccess: (res) => {
      toast.success('تم تفعيل جميع الشركات', { description: `${res.updated_count} شركة` });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: any) => {
      toast.error('فشل التفعيل الجماعي', { description: err.response?.data?.message || err.message });
    },
  });

  const handleDelete = (companyId: number, companyName: string) => {
    if (window.confirm(`هل تريد حذف الشركة "${companyName}"؟`)) {
      deleteMutation.mutate(companyId);
    }
  };

  // New: row-click dialog state
  const [rowDialogOpen, setRowDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const handleRowClick = (company: any) => {
    setSelectedCompany(company);
    setRowDialogOpen(true);
  };
  const handleCloseRowDialog = () => {
    setRowDialogOpen(false);
    setSelectedCompany(null);
  };

  if (isLoading && !isFetching)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          جاري تحميل الشركات...
        </Typography>
      </Box>
    );
  if (error)
    return (
      <Typography variant="body1" color="error" sx={{ p: 2 }}>
        حدث خطأ أثناء جلب الشركات: {error.message}
      </Typography>
    );

  const companies = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Building className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">الشركات</h1>
        </div>
        <div className="flex items-center gap-2">
          {canCreateCompany && (
            <Button
              component={Link}
              to="/settings/companies/new"
              size="small"
              variant="contained"
              sx={{ textDecoration: 'none' }}
            >
              إضافة شركة
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => window.open(`${webUrl}reports/companies/pdf`, '_blank')}
          >
            طباعة الكل (PDF)
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => activateAllMutation.mutate()}
            disabled={activateAllMutation.isPending}
          >
            {activateAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                جارِ التفعيل...
              </>
            ) : (
              'تفعيل جميع الشركات'
            )}
          </Button>
        </div>
      </div>
      {isFetching && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          جاري تحديث القائمة...
        </Typography>
      )}

      {companies.length === 0 && !isLoading ? (
        <Card sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
          <CardContent>
            <Building className="mx-auto h-12 w-12" style={{ opacity: 0.5, marginBottom: 16 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              لا توجد شركات للعرض.
            </Typography>
            {canCreateCompany && (
              <Button
                component={Link}
                to="/settings/companies/new"
                size="small"
                variant="contained"
                sx={{ textDecoration: 'none' }}
              >
                إضافة شركة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      المعرف
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الإسم</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                      الهاتف
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                      تحمل الخدمات
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                      تحمل المختبر
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      الحالة
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      العقود
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      الإجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} hover onClick={() => handleRowClick(company)} sx={{ cursor: 'pointer' }}>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                        {company.id}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'medium', textAlign: 'center' }}>{company.name}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                        {company.phone || "-"}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                        {company.service_endurance || "-"}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                        {company.lab_endurance || "-"}
                      </TableCell>


                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={company.status ? "نشط" : "غير نشط"}
                          color={company.status ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                        {company.contracted_services_count !== undefined
                          ? company.contracted_services_count
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={(event) => { event.stopPropagation(); setAnchorEl(event.currentTarget); }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={() => setAnchorEl(null)}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                          }}
                        >
                          {canManageContracts && (
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/contracts`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              إدارة عقود الخدمات
                            </MenuItem>
                          )}
                          {canManageContracts && (
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/test-contracts`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              إدارة عقود التحاليل
                            </MenuItem>
                          )}
                          {canEditCompany && (
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/edit`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              تعديل
                            </MenuItem>
                          )}
                          {canDeleteCompany && (
                            <>
                              <Divider />
                              <MenuItem
                                onClick={() => {
                                  handleDelete(company.id, company.name);
                                  setAnchorEl(null);
                                }}
                                disabled={
                                  deleteMutation.isPending &&
                                  (deleteMutation.variables as any) === company.id
                                }
                                sx={{ color: 'error.main' }}
                              >
                                {deleteMutation.isPending &&
                                (deleteMutation.variables as any) === company.id ? (
                                  <CircularProgress size={16} className="rtl:ml-2 ltr:mr-2" />
                                ) : (
                                  <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                                )}
                                حذف
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
      {/* Dialog with same actions as dropdown */}
      <Dialog open={rowDialogOpen} onClose={handleCloseRowDialog} fullWidth maxWidth="xs">
        <DialogTitle>إجراءات الشركة {selectedCompany?.name ? `- ${selectedCompany.name}` : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1 }}>
            {canManageContracts && selectedCompany && (
              <Button
                component={Link}
                to={`/settings/companies/${selectedCompany.id}/contracts`}
                variant="outlined"
                onClick={handleCloseRowDialog}
              >
                إدارة عقود الخدمات
              </Button>
            )}
            {canManageContracts && selectedCompany && (
              <Button
                component={Link}
                to={`/settings/companies/${selectedCompany.id}/test-contracts`}
                variant="outlined"
                onClick={handleCloseRowDialog}
              >
                إدارة عقود التحاليل
              </Button>
            )}
            {canEditCompany && selectedCompany && (
              <Button
                component={Link}
                to={`/settings/companies/${selectedCompany.id}/edit`}
                variant="outlined"
                onClick={handleCloseRowDialog}
              >
                تعديل الشركة
              </Button>
            )}
            {canDeleteCompany && selectedCompany && (
              <Button
                color="error"
                variant="outlined"
                onClick={() => {
                  handleDelete(selectedCompany.id, selectedCompany.name);
                  handleCloseRowDialog();
                }}
                disabled={deleteMutation.isPending && (deleteMutation.variables as any) === selectedCompany?.id}
              >
                {deleteMutation.isPending && (deleteMutation.variables as any) === selectedCompany?.id ? (
                  <>
                    <CircularProgress size={16} className="rtl:ml-2 ltr:mr-2" />
                    جارٍ الحذف...
                  </>
                ) : (
                  'حذف الشركة'
                )}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRowDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isFetching}
            size="small"
            variant="outlined"
          >
            السابق
          </Button>
          <Typography variant="body2" color="text.secondary">
            صفحة {meta.current_page} من {meta.last_page}
          </Typography>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage >= meta.last_page || isFetching}
            size="small"
            variant="outlined"
          >
            التالي
          </Button>
        </Box>
      )}
    </div>
  );
}
