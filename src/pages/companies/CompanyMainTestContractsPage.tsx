// src/pages/companies/CompanyMainTestContractsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form'; // Import RHF hooks
import { toast } from 'sonner';
import _debounce from 'lodash/debounce';

// UI Components
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Checkbox,
  Switch,
  Box,
  Typography,
  IconButton,
  Pagination,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowLeft,
  Search as SearchIcon,
  Delete as Trash2,
  Refresh as RefreshCw,
  Print as Printer,
} from '@mui/icons-material';

// Services & Types
import { getCompanyById } from '@/services/companyService';
import {
  getCompanyContractedMainTests,
  updateCompanyMainTestContract,
  removeMainTestFromCompanyContract,
  generateCompanyMainTestContractPdf,
  // ... other service imports
} from '@/services/companyService';
import type { Company, CompanyMainTestFormData, PaginatedCompanyMainTestContractsResponse } from '@/types/companies';
import { useDebounce } from '@/hooks/useDebounce';

// --- Form Types ---
interface ContractFormItem {
  // Read-only fields for display
  main_test_id: number;
  main_test_name: string;
  container_name?: string;
  
  // Editable fields
  status: boolean;
  price: string;
  approve: boolean;
  endurance_static: string;
  endurance_percentage: string;
  use_static: boolean;
}

interface FormValues {
  contracts: ContractFormItem[];
}

const CompanyMainTestContractsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isPrinting, setIsPrinting] = useState(false);
  // const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // --- Data Fetching ---
  const companyQueryKey = ['company', companyId];
  const { data: company } = useQuery<Company, Error>({
    queryKey: companyQueryKey,
    queryFn: () => getCompanyById(Number(companyId)).then(res => res.data),
    enabled: !!companyId,
  });

  const contractsQueryKey = ['companyContractedMainTests', companyId, currentPage, debouncedSearchTerm];
  const { data: paginatedData, isLoading } = useQuery<PaginatedCompanyMainTestContractsResponse, Error>({
    queryKey: contractsQueryKey,
    queryFn: () => getCompanyContractedMainTests(Number(companyId), currentPage, { search: debouncedSearchTerm }),
    placeholderData: keepPreviousData,
    enabled: !!companyId,
  });

  // --- React Hook Form Setup ---
  const form = useForm<FormValues>({
    defaultValues: { contracts: [] },
    mode: 'onChange',
  });
  const { control, getValues, formState: { dirtyFields } } = form;
  const { fields, replace } = useFieldArray({ control, name: "contracts" });

  useEffect(() => {
    if (paginatedData?.data) {
      const formattedData = paginatedData.data.map(c => ({
        main_test_id: c.main_test_id,
        main_test_name: c.main_test_name,
        container_name: c.container_name,
        status: c.contract_details.status,
        price: String(c.contract_details.price),
        approve: c.contract_details.approve,
        endurance_static: String(c.contract_details.endurance_static),
        endurance_percentage: String(c.contract_details.endurance_percentage),
        use_static: c.contract_details.use_static,
      }));
      
      // Only replace if the data is actually different to prevent unnecessary re-renders
      const currentValues = getValues('contracts');
      const hasChanges = formattedData.length !== currentValues.length || 
        formattedData.some((item, index) => {
          const current = currentValues[index];
          return !current || 
            item.main_test_id !== current.main_test_id ||
            item.status !== current.status ||
            item.price !== current.price ||
            item.approve !== current.approve ||
            item.endurance_static !== current.endurance_static ||
            item.endurance_percentage !== current.endurance_percentage ||
            item.use_static !== current.use_static;
        });
      
      if (hasChanges) {
        replace(formattedData);
      }
    }
  }, [paginatedData, replace, getValues]);

  // --- Autosave Mutation and Logic ---
  const updateMutation = useMutation({
    mutationFn: (params: { mainTestId: number, data: Partial<CompanyMainTestFormData> }) =>
      updateCompanyMainTestContract(Number(companyId), params.mainTestId, params.data),
    onSuccess: (updatedContract) => {
      // Don't update the query cache immediately to prevent re-renders that cause focus loss
      // The form will be updated when the user navigates away or manually refreshes
      toast.success("تم الحفظ تلقائياً", { id: `autosave-${updatedContract.data.main_test_id}` });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error("فشل في التحديث", { description: error.response?.data?.message });
      // Only invalidate on error to revert optimistic updates
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
    },
  });
  
  const updateFunction = useCallback(
    (index: number, fieldName: keyof ContractFormItem) => {
      // Check if the specific field was actually changed by the user
      if (dirtyFields.contracts?.[index]?.[fieldName]) {
        const fullRowData = getValues(`contracts.${index}`);
        const payload: Partial<CompanyMainTestFormData> = {
            [fieldName]: fieldName === 'price' || fieldName === 'endurance_percentage' 
                ? parseFloat(fullRowData[fieldName] as string)
                : fieldName === 'endurance_static'
                ? parseInt(fullRowData[fieldName] as string)
                : fullRowData[fieldName]
        };
        toast.info("جاري الحفظ...", { id: `autosave-${fullRowData.main_test_id}-${fieldName}` });
        updateMutation.mutate({ mainTestId: fullRowData.main_test_id, data: payload });
      }
    },
    [dirtyFields, getValues, updateMutation]
  );

  const debouncedUpdate = useMemo(
    () => _debounce(updateFunction, 200),
    [updateFunction]
  );
  

  const removeMutation = useMutation({
    mutationFn: (mainTestId: number) => removeMainTestFromCompanyContract(Number(companyId), mainTestId),
    onSuccess: () => {
      toast.success("تم حذف العقد بنجاح");
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => toast.error("فشل في الحذف", { description: error.response?.data?.message }),
  });

  // Print contract function
  const handlePrintContract = async () => {
    if (!companyId) return;
    
    setIsPrinting(true);
    try {
      const pdfBlob = await generateCompanyMainTestContractPdf(Number(companyId), searchTerm);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `company_test_contracts_${companyId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("تم طباعة العقد بنجاح");
    } catch (error) {
      console.error('Print error:', error);
      toast.error("فشل في الطباعة");
    } finally {
      setIsPrinting(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const meta = paginatedData?.meta;

  return (
    <Box >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton 
          component={Link} 
          to="/settings/companies" 
          size="small"
          sx={{ border: 1, borderColor: 'divider' }}
        >
          <ArrowLeft />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            {company?.name || "جاري التحميل..."}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة عقود الفحوصات الرئيسية
          </Typography>
        </Box>
      </Box>
      {/* Actions Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          type="search"
          placeholder="البحث في الفحوصات..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          size="small"
          sx={{ width: '300px' }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => queryClient.invalidateQueries({ queryKey: contractsQueryKey })}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshCw />}
          >
            تحديث
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handlePrintContract}
            disabled={isPrinting || isLoading}
            startIcon={isPrinting ? <CircularProgress size={16} /> : <Printer />}
          >
            طباعة العقد
          </Button>
          {/* <Button size="small" onClick={() => setIsAddDialogOpen(true)} startIcon={<PlusCircle />}>إضافة فحص للعقد</Button> */}
        </Stack>
      </Box>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box component="form">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }}>المعرف</TableCell>
                  <TableCell sx={{ width: '200px', textAlign: 'center', fontWeight: 'bold' }}>اسم الفحص</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'center', fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'center', fontWeight: 'bold' }}>السعر</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'center', fontWeight: 'bold' }}>الموافقة</TableCell>
                  <TableCell sx={{ width: '150px', textAlign: 'center', fontWeight: 'bold' }}>نسبة التحمل</TableCell>
                  <TableCell sx={{ width: '150px', textAlign: 'center', fontWeight: 'bold' }}>التحمل الثابت</TableCell>
                  <TableCell sx={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>استخدام الثابت</TableCell>
                  <TableCell sx={{ width: '60px', textAlign: 'right', fontWeight: 'bold' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', height: '96px' }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', height: '96px', color: 'text.secondary' }}>
                      لا توجد فحوصات متعاقد عليها
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {field.main_test_id}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                      {field.main_test_name}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.status`} 
                        control={control} 
                        render={({ field: f }) => (
                          <Switch 
                            checked={f.value} 
                            onChange={(e) => { 
                              f.onChange(e.target.checked); 
                              debouncedUpdate(index, 'status'); 
                            }} 
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.price`} 
                        control={control} 
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            type="number"
                            inputProps={{ step: "0.01" }}
                            size="small"
                            sx={{ width: '100px' }}
                            onChange={(e) => { 
                              f.onChange(e); 
                              debouncedUpdate(index, 'price'); 
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Find next price input
                                const nextIndex = index + 1;
                                if (nextIndex < fields.length) {
                                  const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.price"]`) as HTMLInputElement;
                                  if (nextInput) {
                                    nextInput.focus();
                                    nextInput.select();
                                  }
                                }
                              }
                            }}
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.approve`} 
                        control={control} 
                        render={({ field: f }) => (
                          <Checkbox 
                            checked={f.value} 
                            onChange={(e) => { 
                              f.onChange(e.target.checked); 
                              debouncedUpdate(index, 'approve'); 
                            }} 
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.endurance_percentage`} 
                        control={control} 
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            type="number"
                            inputProps={{ step: "0.01", min: "0", max: "100" }}
                            size="small"
                            placeholder="%"
                            sx={{ width: '100px' }}
                            onChange={(e) => { 
                              f.onChange(e); 
                              debouncedUpdate(index, 'endurance_percentage'); 
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Find next endurance percentage input
                                const nextIndex = index + 1;
                                if (nextIndex < fields.length) {
                                  const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.endurance_percentage"]`) as HTMLInputElement;
                                  if (nextInput) {
                                    nextInput.focus();
                                    nextInput.select();
                                  }
                                }
                              }
                            }}
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.endurance_static`} 
                        control={control} 
                        render={({ field: f }) => (
                          <TextField
                            {...f}
                            type="number"
                            inputProps={{ step: "1", min: "0" }}
                            size="small"
                            sx={{ width: '100px' }}
                            onChange={(e) => { 
                              f.onChange(e); 
                              debouncedUpdate(index, 'endurance_static'); 
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Find next endurance static input
                                const nextIndex = index + 1;
                                if (nextIndex < fields.length) {
                                  const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.endurance_static"]`) as HTMLInputElement;
                                  if (nextInput) {
                                    nextInput.focus();
                                    nextInput.select();
                                  }
                                }
                              }
                            }}
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Controller 
                        name={`contracts.${index}.use_static`} 
                        control={control} 
                        render={({ field: f }) => (
                          <Switch 
                            checked={f.value} 
                            onChange={(e) => { 
                              f.onChange(e.target.checked); 
                              debouncedUpdate(index, 'use_static'); 
                            }} 
                          />
                        )} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeMutation.mutate(field.main_test_id)}
                        disabled={removeMutation.isPending && removeMutation.variables === field.main_test_id}
                      >
                        {removeMutation.isPending && removeMutation.variables === field.main_test_id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Trash2 />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={meta.last_page}
            page={currentPage}
            onChange={(_, page) => handlePageChange(page)}
            color="primary"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      )}

      {/* Results info */}
      {meta && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          عرض {meta.from} إلى {meta.to} من أصل {meta.total} نتيجة
        </Typography>
      )}

      {/* <AddMainTestToContractDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        companyId={Number(companyId)}
        onContractAdded={() => queryClient.invalidateQueries({ queryKey: contractsQueryKey })}
      /> */}
    </Box>
  );
};

export default CompanyMainTestContractsPage;