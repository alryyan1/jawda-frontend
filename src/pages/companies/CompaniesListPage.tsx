// src/pages/companies/CompaniesListPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getCompanies, deleteCompany, activateAllCompanies, getSubcompaniesList, getCompanyRelationsList, updateCompanyRelation, updateSubcompany, createSubcompany, createCompanyRelation } from "@/services/companyService";
import type { Subcompany, CompanyRelation } from "@/types/companies";
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
  TextField,
  Stack,
  Collapse,
  InputAdornment,
} from "@mui/material";
import {
  MoreHorizontal,
  Edit,
  Loader2,
  FileText,
  Building,
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthorization } from "@/hooks/useAuthorization"; // For permission checks
import { webUrl } from "../constants";

// Company Relations List Component
function CompanyRelationsListContent({ companyId }: { companyId?: number }) {
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<number, { service_endurance?: string; lab_endurance?: string }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRelation, setNewRelation] = useState({ name: '', lab_endurance: '0', service_endurance: '0' });

  const { data: companyRelations, isLoading, error } = useQuery<CompanyRelation[], Error>({
    queryKey: ['companyRelationsList'],
    queryFn: () => getCompanyRelationsList(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ relationId, data }: { relationId: number; data: { service_endurance?: number; lab_endurance?: number } }) =>
      updateCompanyRelation(relationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyRelationsList'] });
      toast.success('تم تحديث العلاقة بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('فشل التحديث', { description: err.response?.data?.message || err.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; lab_endurance: number; service_endurance: number; company_id: number }) =>
      createCompanyRelation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyRelationsList'] });
      toast.success('تم إضافة العلاقة بنجاح');
      setNewRelation({ name: '', lab_endurance: '0', service_endurance: '0' });
      setShowAddForm(false);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('فشل الإضافة', { description: err.response?.data?.message || err.message });
    },
  });

  const handleAddRelation = () => {
    if (!companyId) {
      toast.error('يرجى اختيار شركة');
      return;
    }
    if (!newRelation.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    createMutation.mutate({
      name: newRelation.name,
      lab_endurance: parseFloat(newRelation.lab_endurance || '0') || 0,
      service_endurance: parseFloat(newRelation.service_endurance || '0') || 0,
      company_id: companyId,
    });
  };

  const handleValueChange = (relationId: number, field: 'service_endurance' | 'lab_endurance', value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [relationId]: {
        ...prev[relationId],
        [field]: value,
      },
    }));
  };

  const handleSave = (relation: CompanyRelation) => {
    const edited = editingValues[relation.id];
    if (!edited) return;

    const updates: { service_endurance?: number; lab_endurance?: number } = {};
    if (edited.service_endurance !== undefined) {
      const numValue = parseFloat(edited.service_endurance);
      if (!isNaN(numValue)) {
        updates.service_endurance = numValue;
      }
    }
    if (edited.lab_endurance !== undefined) {
      const numValue = parseFloat(edited.lab_endurance);
      if (!isNaN(numValue)) {
        updates.lab_endurance = numValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({ relationId: relation.id, data: updates });
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[relation.id];
        return newValues;
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        حدث خطأ أثناء جلب العلاقات: {error.message}
      </Typography>
    );
  }

  // Filter relations by company if companyId is provided
  const filteredRelations = companyId 
    ? companyRelations?.filter(relation => relation.company_id === companyId) || []
    : companyRelations || [];

  if (filteredRelations.length === 0 && !showAddForm) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={showAddForm ? <ChevronUp /> : <ChevronDown />}
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={!companyId}
          >
            {showAddForm ? 'إخفاء النموذج' : 'إضافة علاقة جديدة'}
          </Button>
        </Box>
        <Collapse in={showAddForm}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="اسم العلاقة"
                value={newRelation.name}
                onChange={(e) => setNewRelation(prev => ({ ...prev, name: e.target.value }))}
                size="small"
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="تحمل المختبر"
                  type="number"
                  value={newRelation.lab_endurance}
                  onChange={(e) => setNewRelation(prev => ({ ...prev, lab_endurance: e.target.value }))}
                  size="small"
                  inputProps={{ step: '0.01', min: 0 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="تحمل الخدمات"
                  type="number"
                  value={newRelation.service_endurance}
                  onChange={(e) => setNewRelation(prev => ({ ...prev, service_endurance: e.target.value }))}
                  size="small"
                  inputProps={{ step: '0.01', min: 0 }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => { setShowAddForm(false); setNewRelation({ name: '', lab_endurance: '0', service_endurance: '0' }); }} size="small">
                  إلغاء
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAddRelation}
                  disabled={createMutation.isPending}
                  size="small"
                  startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <Plus />}
                >
                  إضافة
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Collapse>
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          لا توجد علاقات متاحة {companyId ? 'لهذه الشركة' : ''}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={showAddForm ? <ChevronUp /> : <ChevronDown />}
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!companyId}
        >
          {showAddForm ? 'إخفاء النموذج' : 'إضافة علاقة جديدة'}
        </Button>
      </Box>
      <Collapse in={showAddForm}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم العلاقة"
              value={newRelation.name}
              onChange={(e) => setNewRelation(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="تحمل المختبر"
                type="number"
                value={newRelation.lab_endurance}
                onChange={(e) => setNewRelation(prev => ({ ...prev, lab_endurance: e.target.value }))}
                size="small"
                inputProps={{ step: '0.01', min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="تحمل الخدمات"
                type="number"
                value={newRelation.service_endurance}
                onChange={(e) => setNewRelation(prev => ({ ...prev, service_endurance: e.target.value }))}
                size="small"
                inputProps={{ step: '0.01', min: 0 }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => { setShowAddForm(false); setNewRelation({ name: '', lab_endurance: '0', service_endurance: '0' }); }} size="small">
                إلغاء
              </Button>
              <Button
                variant="contained"
                onClick={handleAddRelation}
                disabled={createMutation.isPending}
                size="small"
                startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <Plus />}
              >
                إضافة
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Collapse>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>المعرف</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>الاسم</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>تحمل الخدمات</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>تحمل المختبر</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {filteredRelations.map((relation) => {
            const edited = editingValues[relation.id];
            const serviceEndurance = edited?.service_endurance !== undefined 
              ? edited.service_endurance 
              : (relation.service_endurance != null ? relation.service_endurance.toString() : '0');
            const labEndurance = edited?.lab_endurance !== undefined 
              ? edited.lab_endurance 
              : (relation.lab_endurance != null ? relation.lab_endurance.toString() : '0');

            return (
              <TableRow key={relation.id}>
                <TableCell sx={{ textAlign: 'center' }}>{relation.id}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{relation.name}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <TextField
                    type="number"
                    value={serviceEndurance}
                    onChange={(e) => handleValueChange(relation.id, 'service_endurance', e.target.value)}
                    onBlur={() => handleSave(relation)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSave(relation);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    size="small"
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'center', width: '80px' } }}
                    sx={{ '& .MuiInputBase-root': { width: '100px' } }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <TextField
                    type="number"
                    value={labEndurance}
                    onChange={(e) => handleValueChange(relation.id, 'lab_endurance', e.target.value)}
                    onBlur={() => handleSave(relation)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSave(relation);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    size="small"
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'center', width: '80px' } }}
                    sx={{ '& .MuiInputBase-root': { width: '100px' } }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  );
}

// Subcompanies List Component
function SubcompaniesListContent({ companyId }: { companyId?: number }) {
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<number, { service_endurance?: string; lab_endurance?: string }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubcompany, setNewSubcompany] = useState({ name: '', lab_endurance: '0', service_endurance: '0' });

  const { data: subcompanies, isLoading, error } = useQuery<Subcompany[], Error>({
    queryKey: ['subcompaniesList', companyId],
    queryFn: () => companyId ? getSubcompaniesList(companyId) : Promise.resolve([]),
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ subcompanyId, data }: { subcompanyId: number; data: { service_endurance?: number; lab_endurance?: number } }) => {
      if (!companyId) throw new Error('Company ID is required');
      return updateSubcompany(companyId, subcompanyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcompaniesList', companyId] });
      toast.success('تم تحديث الجهة بنجاح');
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('فشل التحديث', { description: err.response?.data?.message || err.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; lab_endurance: number; service_endurance: number; company_id: number }) =>
      createSubcompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcompaniesList', companyId] });
      toast.success('تم إضافة الجهة بنجاح');
      setNewSubcompany({ name: '', lab_endurance: '0', service_endurance: '0' });
      setShowAddForm(false);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('فشل الإضافة', { description: err.response?.data?.message || err.message });
    },
  });

  const handleAddSubcompany = () => {
    if (!companyId) {
      toast.error('يرجى اختيار شركة');
      return;
    }
    if (!newSubcompany.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    createMutation.mutate({
      name: newSubcompany.name,
      lab_endurance: parseFloat(newSubcompany.lab_endurance || '0') || 0,
      service_endurance: parseFloat(newSubcompany.service_endurance || '0') || 0,
      company_id: companyId,
    });
  };

  const handleValueChange = (subcompanyId: number, field: 'service_endurance' | 'lab_endurance', value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [subcompanyId]: {
        ...prev[subcompanyId],
        [field]: value,
      },
    }));
  };

  const handleSave = (subcompany: Subcompany) => {
    const edited = editingValues[subcompany.id];
    if (!edited) return;

    const updates: { service_endurance?: number; lab_endurance?: number } = {};
    if (edited.service_endurance !== undefined) {
      const numValue = parseFloat(edited.service_endurance);
      if (!isNaN(numValue)) {
        updates.service_endurance = numValue;
      }
    }
    if (edited.lab_endurance !== undefined) {
      const numValue = parseFloat(edited.lab_endurance);
      if (!isNaN(numValue)) {
        updates.lab_endurance = numValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({ subcompanyId: subcompany.id, data: updates });
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[subcompany.id];
        return newValues;
      });
    }
  };

  if (!companyId) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        يرجى اختيار شركة
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        حدث خطأ أثناء جلب الجهات: {error.message}
      </Typography>
    );
  }

  if (!subcompanies || subcompanies.length === 0) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={showAddForm ? <ChevronUp /> : <ChevronDown />}
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={!companyId}
          >
            {showAddForm ? 'إخفاء النموذج' : 'إضافة جهة جديدة'}
          </Button>
        </Box>
        <Collapse in={showAddForm}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="اسم الجهة"
                value={newSubcompany.name}
                onChange={(e) => setNewSubcompany(prev => ({ ...prev, name: e.target.value }))}
                size="small"
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="تحمل المختبر"
                  type="number"
                  value={newSubcompany.lab_endurance}
                  onChange={(e) => setNewSubcompany(prev => ({ ...prev, lab_endurance: e.target.value }))}
                  size="small"
                  inputProps={{ step: '0.01', min: 0 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="تحمل الخدمات"
                  type="number"
                  value={newSubcompany.service_endurance}
                  onChange={(e) => setNewSubcompany(prev => ({ ...prev, service_endurance: e.target.value }))}
                  size="small"
                  inputProps={{ step: '0.01', min: 0 }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => { setShowAddForm(false); setNewSubcompany({ name: '', lab_endurance: '0', service_endurance: '0' }); }} size="small">
                  إلغاء
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAddSubcompany}
                  disabled={createMutation.isPending}
                  size="small"
                  startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <Plus />}
                >
                  إضافة
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Collapse>
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          لا توجد جهات متاحة لهذه الشركة
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={showAddForm ? <ChevronUp /> : <ChevronDown />}
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!companyId}
        >
          {showAddForm ? 'إخفاء النموذج' : 'إضافة جهة جديدة'}
        </Button>
      </Box>
      <Collapse in={showAddForm}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم الجهة"
              value={newSubcompany.name}
              onChange={(e) => setNewSubcompany(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="تحمل المختبر"
                type="number"
                value={newSubcompany.lab_endurance}
                onChange={(e) => setNewSubcompany(prev => ({ ...prev, lab_endurance: e.target.value }))}
                size="small"
                inputProps={{ step: '0.01', min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="تحمل الخدمات"
                type="number"
                value={newSubcompany.service_endurance}
                onChange={(e) => setNewSubcompany(prev => ({ ...prev, service_endurance: e.target.value }))}
                size="small"
                inputProps={{ step: '0.01', min: 0 }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => { setShowAddForm(false); setNewSubcompany({ name: '', lab_endurance: '0', service_endurance: '0' }); }} size="small">
                إلغاء
              </Button>
              <Button
                variant="contained"
                onClick={handleAddSubcompany}
                disabled={createMutation.isPending}
                size="small"
                startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <Plus />}
              >
                إضافة
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Collapse>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>المعرف</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>الاسم</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>تحمل الخدمات</TableCell>
              <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>تحمل المختبر</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {subcompanies.map((subcompany) => {
            const edited = editingValues[subcompany.id];
            const serviceEndurance = edited?.service_endurance !== undefined 
              ? edited.service_endurance 
              : (subcompany.service_endurance != null ? subcompany.service_endurance.toString() : '0');
            const labEndurance = edited?.lab_endurance !== undefined 
              ? edited.lab_endurance 
              : (subcompany.lab_endurance != null ? subcompany.lab_endurance.toString() : '0');

            return (
              <TableRow key={subcompany.id}>
                <TableCell sx={{ textAlign: 'center' }}>{subcompany.id}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{subcompany.name}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <TextField
                    type="number"
                    value={serviceEndurance}
                    onChange={(e) => handleValueChange(subcompany.id, 'service_endurance', e.target.value)}
                    onBlur={() => handleSave(subcompany)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSave(subcompany);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    size="small"
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'center', width: '80px' } }}
                    sx={{ '& .MuiInputBase-root': { width: '100px' } }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <TextField
                    type="number"
                    value={labEndurance}
                    onChange={(e) => handleValueChange(subcompany.id, 'lab_endurance', e.target.value)}
                    onBlur={() => handleSave(subcompany)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSave(subcompany);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    size="small"
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'center', width: '80px' } }}
                    sx={{ '& .MuiInputBase-root': { width: '100px' } }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  );
}

export default function CompaniesListPage() {
  // i18n removed
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { can ,user} = useAuthorization(); // Get permission checking function
    console.log(user,'user')
  // TODO: Define these permissions in your backend and PermissionName type
  const canCreateCompany = can("create companies" ) || true;
  const canEditCompany = can("edit companies" ) || true;
  const canDeleteCompany = can("delete companies" ) || true;
  const canManageContracts = can("manage company_contracts" as never) || true; // Example permission for contracts
  console.log(canCreateCompany,'canCreateCompany','user',user)
  console.log(canManageContracts,'canManageContracts','user',user)
  const {
    data: paginatedData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["companies", currentPage, searchQuery],
    queryFn: () => getCompanies(currentPage, searchQuery ? { search: searchQuery } : {}),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      toast.success('تم حذف الشركة بنجاح');
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error('فشل الحذف', { description: err.response?.data?.message || err.message });
    },
  });

  const activateAllMutation = useMutation({
    mutationFn: activateAllCompanies,
    onSuccess: (res) => {
      toast.success('تم تفعيل جميع الشركات', { description: `${res.updated_count} شركة` });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
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
  const [selectedCompany, setSelectedCompany] = useState<{ id: number; name: string } | null>(null);
  
  // Insurance reclaim dialog state
  const [reclaimDialogOpen, setReclaimDialogOpen] = useState(false);
  const [reclaimCompany, setReclaimCompany] = useState<{ id: number; name: string } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Company relations dialog state
  const [relationsDialogOpen, setRelationsDialogOpen] = useState(false);
  const [relationsCompany, setRelationsCompany] = useState<{ id: number; name: string } | null>(null);
  
  // Subcompanies dialog state
  const [subcompaniesDialogOpen, setSubcompaniesDialogOpen] = useState(false);
  const [subcompaniesCompany, setSubcompaniesCompany] = useState<{ id: number; name: string } | null>(null);
  const handleRowClick = (company: { id: number; name: string }) => {
    setSelectedCompany(company);
    setRowDialogOpen(true);
  };
  const handleCloseRowDialog = () => {
    setRowDialogOpen(false);
    setSelectedCompany(null);
  };

  const handleOpenReclaimDialog = (company: { id: number; name: string }) => {
    setReclaimCompany(company);
    setReclaimDialogOpen(true);
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const handleCloseReclaimDialog = () => {
    setReclaimDialogOpen(false);
    setReclaimCompany(null);
    setStartDate('');
    setEndDate('');
  };

  const handleGenerateReclaim = async () => {
    if (!reclaimCompany || !startDate || !endDate) {
      toast.error('يرجى اختيار الشركة وتاريخ البداية والنهاية');
      return;
    }

    try {
      const url = `${webUrl}excel/reclaim?company=${reclaimCompany.id}&first=${startDate}&second=${endDate}`;
      window.open(url, '_blank');
      handleCloseReclaimDialog();
      toast.success('تم إنشاء مطالبة التأمين بنجاح');
    } catch (error) {
      toast.error('خطأ في إنشاء مطالبة التأمين');
      console.error('Reclaim generation error:', error);
    }
  };

  const handleOpenRelationsDialog = (company: { id: number; name: string }) => {
    setRelationsCompany(company);
    setRelationsDialogOpen(true);
  };

  const handleCloseRelationsDialog = (event?: {}, reason?: string) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      // Allow closing on backdrop click or escape key
    }
    setRelationsDialogOpen(false);
    setRelationsCompany(null);
  };

  const handleOpenSubcompaniesDialog = (company: { id: number; name: string }) => {
    setSubcompaniesCompany(company);
    setSubcompaniesDialogOpen(true);
  };

  const handleCloseSubcompaniesDialog = (event?: {}, reason?: string) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      // Allow closing on backdrop click or escape key
    }
    setSubcompaniesDialogOpen(false);
    setSubcompaniesCompany(null);
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when search changes
  };

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
      {/* Search Field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="البحث عن شركة..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

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
        <Card className="text-2xl!">
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="text-2xl!" sx={{ width: 50, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      المعرف
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ textAlign: 'center' }}>الإسم</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                      الهاتف
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                      تحمل الخدمات
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                      تحمل المختبر
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ textAlign: 'center' }}>
                      الحالة
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                      العقود
                    </TableCell>
                    <TableCell className="text-2xl!" sx={{ textAlign: 'center' }}>
                      الإجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} hover onClick={() => handleRowClick(company)} sx={{ cursor: 'pointer' }}>
                      <TableCell className="text-2xl!" sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>
                        {company.id}
                      </TableCell>
                      <TableCell className="text-2xl!" sx={{ fontWeight: 'medium', textAlign: 'center' }}>{company.name}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                        {company.phone || "-"}
                      </TableCell>
                      <TableCell className="text-2xl!" sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                        {company.service_endurance || "-"}
                      </TableCell>
                      <TableCell className="text-2xl!" sx={{ display: { xs: 'none', lg: 'table-cell' }, textAlign: 'center' }}>
                        {company.lab_endurance || "-"}
                      </TableCell>


                      <TableCell className="text-2xl!" sx={{ textAlign: 'center' }}>
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
                         
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/contracts`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              إدارة عقود الخدمات
                            </MenuItem>
                     
                        
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/test-contracts`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <FileText className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              إدارة عقود التحاليل
                            </MenuItem>
                        
                            <Divider />
                            <MenuItem
                              onClick={() => {
                                handleOpenReclaimDialog(company);
                                setAnchorEl(null);
                              }}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Download className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              المطالبات
                            </MenuItem>
                        
                            <MenuItem
                              component={Link}
                              to={`/settings/companies/${company.id}/edit`}
                              onClick={() => setAnchorEl(null)}
                              sx={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Edit className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              تعديل
                            </MenuItem>
                        
                     
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
            {selectedCompany && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  handleOpenReclaimDialog(selectedCompany);
                  handleCloseRowDialog();
                }}
                startIcon={<Download />}
              >
                المطالبات
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
            {selectedCompany && (
              <Button
                variant="outlined"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  const company = selectedCompany;
                  handleCloseRowDialog();
                  // Use setTimeout to ensure the main dialog closes before opening the new one
                  setTimeout(() => {
                    handleOpenRelationsDialog(company);
                  }, 100);
                }}
              >
                العلاقات
              </Button>
            )}
            {selectedCompany && (
              <Button
                variant="outlined"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  const company = selectedCompany;
                  handleCloseRowDialog();
                  // Use setTimeout to ensure the main dialog closes before opening the new one
                  setTimeout(() => {
                    handleOpenSubcompaniesDialog(company);
                  }, 100);
                }}
              >
                الجهات
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
                disabled={deleteMutation.isPending && (deleteMutation.variables as number) === selectedCompany?.id}
              >
                {deleteMutation.isPending && (deleteMutation.variables as number) === selectedCompany?.id ? (
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

      {/* Insurance Reclaim Dialog */}
      <Dialog open={reclaimDialogOpen} onClose={handleCloseReclaimDialog} fullWidth maxWidth="sm">
        <DialogTitle>إنشاء مطالبة تأمين - {reclaimCompany?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="تاريخ البداية"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="تاريخ النهاية"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReclaimDialog}>إلغاء</Button>
          <Button 
            onClick={handleGenerateReclaim}
            variant="contained"
            color="primary"
            startIcon={<Download />}
          >
            إنشاء المطالبة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Company Relations Dialog */}
      <Dialog 
        open={relationsDialogOpen} 
        onClose={handleCloseRelationsDialog} 
        fullWidth 
        maxWidth="md"
      >
        <DialogTitle>العلاقات - {relationsCompany?.name}</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <CompanyRelationsListContent companyId={relationsCompany?.id} />
        </DialogContent>
        <DialogActions onClick={(e) => e.stopPropagation()}>
          <Button onClick={(e) => {
            e.stopPropagation();
            handleCloseRelationsDialog();
          }}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Subcompanies Dialog */}
      <Dialog 
        open={subcompaniesDialogOpen} 
        onClose={handleCloseSubcompaniesDialog} 
        fullWidth 
        maxWidth="md"
      >
        <DialogTitle>الجهات - {subcompaniesCompany?.name}</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <SubcompaniesListContent companyId={subcompaniesCompany?.id} />
        </DialogContent>
        <DialogActions onClick={(e) => e.stopPropagation()}>
          <Button onClick={(e) => {
            e.stopPropagation();
            handleCloseSubcompaniesDialog();
          }}>إغلاق</Button>
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
