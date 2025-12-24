// src/pages/settings/BindingMatchingPage.tsx

import React, { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { getAllChildTests } from "@/services/childTestService";
import type { ChildTest } from "@/types/labTests";

// MUI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  InputLabel,
  Stack,
  CircularProgress,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Link as LinkIcon,
} from "@mui/icons-material";

interface Binding {
  id: number;
  child_id_array: string;
  name_in_sysmex_table?: string;
  name_in_mindray_table?: string;
  name_in_hormone_table?: string;
}

type BindingType = 'cbc' | 'chemistry' | 'hormone';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`binding-tabpanel-${index}`}
      aria-labelledby={`binding-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BindingMatchingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<Binding | null>(null);
  const [bindingIdToDelete, setBindingIdToDelete] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBinding, setSelectedBinding] = useState<Binding | null>(null);
  
  const [formData, setFormData] = useState({
    child_id_array: '',
    name_in_table: '',
  });
  const [childTestSearch, setChildTestSearch] = useState('');
  const [childTestOpen, setChildTestOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [columnOpen, setColumnOpen] = useState(false);
  
  // Table data dialogs
  const [tableDialogOpen, setTableDialogOpen] = useState<{ sysmex: boolean; hormone: boolean; mindray2: boolean }>({
    sysmex: false,
    hormone: false,
    mindray2: false,
  });
  const [tableDataSearch, setTableDataSearch] = useState('');
  const [selectedTableType, setSelectedTableType] = useState<'sysmex' | 'hormone' | 'mindray2' | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{ id: number; type: string } | null>(null);

  const bindingTypes: BindingType[] = ['cbc', 'chemistry', 'hormone'];
  const currentBindingType = bindingTypes[activeTab];

  const getBindings = async (type: BindingType) => {
    const response = await apiClient.get(`/bindings?type=${type}`);
    return response.data.data as Binding[];
  };

  const { data: bindings, isLoading, error, refetch } = useQuery<Binding[], Error>({
    queryKey: ['bindings', currentBindingType],
    queryFn: () => getBindings(currentBindingType),
  });

  // Fetch child tests for autocomplete
  const { data: childTests = [], isLoading: isLoadingChildTests } = useQuery<ChildTest[], Error>({
    queryKey: ['allChildTests', childTestSearch],
    queryFn: () => getAllChildTests(childTestSearch, 100),
    enabled: childTestOpen,
  });

  // Fetch table columns for autocomplete
  const getTableColumns = async (type: BindingType): Promise<string[]> => {
    const response = await apiClient.get(`/bindings/table-columns?type=${type}`);
    return response.data.data as string[];
  };

  const { data: tableColumns = [], isLoading: isLoadingColumns } = useQuery<string[], Error>({
    queryKey: ['tableColumns', currentBindingType],
    queryFn: () => getTableColumns(currentBindingType),
    enabled: columnOpen || isManageDialogOpen, // Fetch when dialog is open or autocomplete is open
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: BindingType; child_id_array: string; name_in_table: string }) => {
      const response = await apiClient.post('/bindings', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الربط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['bindings', currentBindingType] });
      setIsManageDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error('فشل الإنشاء', {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { type: BindingType; child_id_array: string; name_in_table: string } }) => {
      const response = await apiClient.put(`/bindings/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم تحديث الربط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['bindings', currentBindingType] });
      setIsManageDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error('فشل التحديث', {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/bindings/${id}?type=${currentBindingType}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم حذف الربط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['bindings', currentBindingType] });
      setBindingIdToDelete(null);
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', {
        description: err.response?.data?.message || err.message,
      });
      setBindingIdToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({
      child_id_array: '',
      name_in_table: '',
    });
    setEditingBinding(null);
    setChildTestSearch('');
    setChildTestOpen(false);
    setColumnSearch('');
    setColumnOpen(false);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsManageDialogOpen(true);
  };

  const handleOpenEditDialog = (binding: Binding) => {
    const nameInTable = binding.name_in_sysmex_table || 
                        binding.name_in_mindray_table || 
                        binding.name_in_hormone_table || '';
    setFormData({
      child_id_array: binding.child_id_array,
      name_in_table: nameInTable,
    });
    setEditingBinding(binding);
    setIsManageDialogOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, binding: Binding) => {
    setAnchorEl(event.currentTarget);
    setSelectedBinding(binding);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBinding(null);
  };

  const handleSubmit = () => {
    if (!formData.child_id_array.trim() || !formData.name_in_table.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const data = {
      type: currentBindingType,
      child_id_array: formData.child_id_array.trim(),
      name_in_table: formData.name_in_table.trim(),
    };

    if (editingBinding) {
      updateMutation.mutate({ id: editingBinding.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTableNameLabel = (type: BindingType): string => {
    switch (type) {
      case 'cbc':
        return 'اسم العمود في جدول Sysmex';
      case 'chemistry':
        return 'اسم العمود في جدول Mindray';
      case 'hormone':
        return 'اسم العمود في جدول Hormone';
      default:
        return 'اسم العمود';
    }
  };

  const getTypeLabel = (type: BindingType): string => {
    switch (type) {
      case 'cbc':
        return 'CBC';
      case 'chemistry':
        return 'الكيمياء';
      case 'hormone':
        return 'الهرمونات';
      default:
        return '';
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Fetch table data
  const getTableData = async (type: 'sysmex' | 'hormone' | 'mindray2', search: string = '') => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (search) params.append('search', search);
    params.append('limit', '100');
    const response = await apiClient.get(`/bindings/table-data?${params.toString()}`);
    return response.data;
  };

  const { data: tableDataResponse, isLoading: isLoadingTableData, refetch: refetchTableData } = useQuery({
    queryKey: ['tableData', selectedTableType, tableDataSearch],
    queryFn: () => selectedTableType ? getTableData(selectedTableType, tableDataSearch) : null,
    enabled: Boolean(selectedTableType && (tableDialogOpen.sysmex || tableDialogOpen.hormone || tableDialogOpen.mindray2)),
  });

  const deleteTableRecordMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const response = await apiClient.delete(`/bindings/table-record/${id}?type=${type}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم حذف السجل بنجاح');
      refetchTableData();
      setRecordToDelete(null);
    },
    onError: (err: any) => {
      toast.error('فشل الحذف', {
        description: err.response?.data?.message || err.message,
      });
      setRecordToDelete(null);
    },
  });

  const handleOpenTableDialog = (type: 'sysmex' | 'hormone' | 'mindray2') => {
    setSelectedTableType(type);
    setTableDialogOpen(prev => ({ ...prev, [type]: true }));
    setTableDataSearch('');
  };

  const handleCloseTableDialog = (type: 'sysmex' | 'hormone' | 'mindray2') => {
    setTableDialogOpen(prev => ({ ...prev, [type]: false }));
    setSelectedTableType(null);
    setTableDataSearch('');
  };

  const tableData = tableDataResponse?.data || [];
  const tableDataColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error" gutterBottom>
              فشل الجلب
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              حدث خطأ أثناء جلب البيانات: {error.message}
            </Typography>
            <Button variant="contained" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <LinkIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            جداول الربط
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة جداول ربط نتائج الأجهزة
          </Typography>
        </Box>
      </Stack>

      {/* Table Data Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={() => handleOpenTableDialog('sysmex')}
          startIcon={<LinkIcon />}
        >
          عرض بيانات Sysmex
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleOpenTableDialog('hormone')}
          startIcon={<LinkIcon />}
        >
          عرض بيانات Hormone
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleOpenTableDialog('mindray2')}
          startIcon={<LinkIcon />}
        >
          عرض بيانات Mindray
        </Button>
      </Stack>

      <Card>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="CBC" />
          <Tab label="الكيمياء" />
          <Tab label="الهرمونات" />
        </Tabs>

        {bindingTypes.map((type, index) => (
          <TabPanel key={type} value={activeTab} index={index}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateDialog}
                  size="small"
                >
                  إضافة ربط
                </Button>
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    جاري تحميل البيانات...
                  </Typography>
                </Box>
              ) : !bindings || bindings.length === 0 ? (
                <Card variant="outlined" sx={{ textAlign: 'center', py: 6, borderStyle: 'dashed' }}>
                  <CardContent>
                    <LinkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      لا توجد روابط
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      أضف أول ربط للبدء
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateDialog}
                      size="small"
                    >
                      إضافة ربط
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ width: 80 }}>المعرف</TableCell>
                        <TableCell align="center">{getTableNameLabel(type)}</TableCell>
                        <TableCell align="center">معرفات الفحوصات الفرعية</TableCell>
                        <TableCell align="center" sx={{ width: 100 }}>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bindings.map((binding) => (
                        <TableRow key={binding.id} hover>
                          <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                            {binding.id}
                          </TableCell>
                          <TableCell align="center">
                            {binding.name_in_sysmex_table || 
                             binding.name_in_mindray_table || 
                             binding.name_in_hormone_table || '-'}
                          </TableCell>
                          <TableCell align="center">
                            {binding.child_id_array}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, binding)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </TabPanel>
        ))}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isManageDialogOpen}
        onClose={() => setIsManageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingBinding ? 'تعديل الربط' : `إضافة ربط جديد - ${getTypeLabel(currentBindingType)}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              open={columnOpen}
              onOpen={() => setColumnOpen(true)}
              onClose={() => setColumnOpen(false)}
              options={tableColumns}
              loading={isLoadingColumns}
              value={formData.name_in_table || null}
              onChange={(_, newValue: string | null) => {
                setFormData({ ...formData, name_in_table: newValue || '' });
              }}
              inputValue={columnSearch}
              onInputChange={(_, newInputValue) => {
                setColumnSearch(newInputValue);
              }}
              freeSolo
              filterOptions={(options, params) => {
                const filtered = options.filter((option) =>
                  option.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                return filtered;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={getTableNameLabel(currentBindingType)}
                  placeholder="ابحث عن عمود..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingColumns ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Box>
              <InputLabel sx={{ mb: 1 }}>معرفات الفحوصات الفرعية (مفصولة بفواصل)</InputLabel>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  value={formData.child_id_array}
                  onChange={(e) => setFormData({ ...formData, child_id_array: e.target.value })}
                  placeholder="مثال: 1,2,3"
                />
                <Box sx={{ width: 300 }}>
                  <Autocomplete
                    open={childTestOpen}
                    onOpen={() => setChildTestOpen(true)}
                    onClose={() => setChildTestOpen(false)}
                    options={childTests}
                    loading={isLoadingChildTests}
                    getOptionLabel={(option) => {
                      const mainTestName = option.main_test_name ? `[${option.main_test_name}]` : '';
                      return `${mainTestName} ${option.child_test_name} (ID: ${option.id})`.trim();
                    }}
                    value={null}
                    onChange={(_, newValue: ChildTest | null) => {
                      if (newValue && newValue.id) {
                        const currentIds = formData.child_id_array
                          .split(',')
                          .map(id => id.trim())
                          .filter(id => id !== '');
                        
                        if (!currentIds.includes(String(newValue.id))) {
                          const updatedIds = currentIds.length > 0
                            ? [...currentIds, String(newValue.id)].join(',')
                            : String(newValue.id);
                          setFormData({ ...formData, child_id_array: updatedIds });
                        } else {
                          toast.info('هذا الفحص موجود بالفعل في القائمة');
                        }
                      }
                      setChildTestSearch('');
                    }}
                    inputValue={childTestSearch}
                    onInputChange={(_, newInputValue) => {
                      setChildTestSearch(newInputValue);
                    }}
                    filterOptions={(x) => x}
                    noOptionsText="لا توجد نتائج"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="ابحث عن فحص فرعي..."
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingChildTests ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsManageDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            startIcon={(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={16} /> : null}
          >
            {editingBinding ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!bindingIdToDelete}
        onClose={() => setBindingIdToDelete(null)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف هذا الربط؟ هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBindingIdToDelete(null)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              bindingIdToDelete && deleteMutation.mutate(bindingIdToDelete)
            }
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedBinding) {
              handleOpenEditDialog(selectedBinding);
            }
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          تعديل
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedBinding) {
              setBindingIdToDelete(selectedBinding.id);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Table Data Dialogs */}
      {(['sysmex', 'hormone', 'mindray2'] as const).map((tableType) => (
        <Dialog
          key={tableType}
          open={tableDialogOpen[tableType]}
          onClose={() => handleCloseTableDialog(tableType)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            {tableType === 'sysmex' && 'بيانات جدول Sysmex'}
            {tableType === 'hormone' && 'بيانات جدول Hormone'}
            {tableType === 'mindray2' && 'بيانات جدول Mindray'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                placeholder="ابحث برقم زيارة الطبيب (doctorvisit_id)..."
                value={tableDataSearch}
                onChange={(e) => setTableDataSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1 }}>
                      <Typography variant="body2" color="text.secondary">🔍</Typography>
                    </Box>
                  ),
                }}
              />
              {isLoadingTableData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : tableData.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    لا توجد بيانات
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {tableDataColumns.map((column) => (
                          <TableCell key={column} align="center" sx={{ fontWeight: 'bold' }}>
                            {column}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: 100 }}>
                          الإجراءات
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.map((row: any, index: number) => (
                        <TableRow key={row.id || index} hover>
                          {tableDataColumns.map((column) => (
                            <TableCell key={column} align="center">
                              {row[column] !== null && row[column] !== undefined 
                                ? String(row[column]) 
                                : '-'}
                            </TableCell>
                          ))}
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setRecordToDelete({ id: row.id, type: tableType })}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleCloseTableDialog(tableType)}>
              إغلاق
            </Button>
          </DialogActions>
        </Dialog>
      ))}

      {/* Delete Record Confirmation Dialog */}
      <Dialog
        open={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordToDelete(null)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (recordToDelete) {
                deleteTableRecordMutation.mutate({
                  id: recordToDelete.id,
                  type: recordToDelete.type,
                });
              }
            }}
            disabled={deleteTableRecordMutation.isPending}
            startIcon={deleteTableRecordMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BindingMatchingPage;
