// src/pages/companies/CompanyServiceContractsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import _debounce from 'lodash/debounce';

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
  IconButton,
  CircularProgress,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import {
  MoreHorizontal,
  Trash2,
  PlusCircle,
  ArrowRightLeft,
  FileText,
  Search,
  Printer,
  Copy,
  File,
  RefreshCw,
} from "lucide-react";

import type {
  Company,
  CompanyServiceContract,
  CompanyServiceFormData,
} from "@/types/companies";
import type { ApiError } from "@/types/api";
import {
  getCompanyById,
  importAllServicesToCompanyContract,
  updateCompanyServiceContract,
  type ImportAllServicesPayload,
} from "@/services/companyService"; // To get company name
import {
  getCompanyContractedServices,
  removeServiceFromCompanyContract,
} from "@/services/companyService"; // Service functions related to contracts

import type { PaginatedResponse } from "@/types/common";
import AddCompanyServiceDialog from "./AddCompanyServiceDialog";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  downloadCompanyServiceContractPdf,
  type CompanyContractPdfFilters,
} from "@/services/reportService";
import CopyCompanyContractDialog from "@/components/companies/CopyCompanyContractDialog";
import type { PriceImportPreference } from "@/components/companies/dialogs/ImportPricePreferenceDialog";
import ImportPricePreferenceDialog from "@/components/companies/dialogs/ImportPricePreferenceDialog";
import { useDebounce } from '@/hooks/useDebounce';

// TODO: Define these permissions in your backend and PermissionName type
// import { useAuthorization } from '@/hooks/useAuthorization';

// Zod schema for the form array
const contractItemSchema = z.object({
  // Read-only fields for display
  service_id: z.number(),
  service_name: z.string(),
  service_group_name: z.string().optional(),
  
  // Editable fields
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Price must be a positive number"),
  static_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Static endurance must be a positive number"),
  percentage_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, "Must be between 0-100"),
  static_wage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Static wage must be a positive number"),
  percentage_wage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, "Must be between 0-100"),
  use_static: z.boolean(),
  approval: z.boolean(),
});

const formSchema = z.object({
  contracts: z.array(contractItemSchema),
});

type FormValues = z.infer<typeof formSchema>;
type ContractFormItem = FormValues['contracts'][0];

export default function CompanyServiceContractsPage() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleGenerateServiceContractPdf = async () => {
    if (!companyId) return;
    setIsGeneratingPdf(true);
    try {
      const filters: CompanyContractPdfFilters = {};
      if (searchTerm) filters.search = searchTerm;

      const blob = await downloadCompanyServiceContractPdf(
        Number(companyId),
        filters
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company_${companyId}_service_contracts_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("تم إنشاء ملف PDF بنجاح");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error("فشل في إنشاء ملف PDF", {
        description: apiError.response?.data?.message || apiError.message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const { companyId } = useParams<{ companyId: string }>();
  const [isCopyContractDialogOpen, setIsCopyContractDialogOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isImportAllDialogOpen, setIsImportAllDialogOpen] = useState(false);
  const [isImportPreferenceDialogOpen, setIsImportPreferenceDialogOpen] = useState(false);
  const [importAllPayloadOverrides, setImportAllPayloadOverrides] = useState<ImportAllServicesPayload | undefined>(undefined);

  // --- React Hook Form Setup ---
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { contracts: [] },
  });
  const { control, getValues, formState: { dirtyFields } } = form;
  const { fields, replace } = useFieldArray({ control, name: "contracts" });

  useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm]);

  const contractedServicesQueryKey = ['companyContractedServices', companyId, currentPage, debouncedSearchTerm] as const;

  // --- Data Fetching ---
  const { data: company, isLoading: isLoadingCompany } = useQuery<
    Company,
    Error
  >({
    queryKey: ["company", companyId],
    queryFn: () => getCompanyById(Number(companyId)).then((res) => res.data),
    enabled: !!companyId,
  });

  const {
    data: paginatedContracts,
    isLoading: isLoadingContracts,
    error: contractsError,
    isFetching: isFetchingContracts,
  } = useQuery<PaginatedResponse<CompanyServiceContract>, Error>({
    queryKey: contractedServicesQueryKey,
    queryFn: () =>
      getCompanyContractedServices(Number(companyId), currentPage, {
        search: debouncedSearchTerm,
      }),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });

  // Update form when data changes
  useEffect(() => {
    if (paginatedContracts?.data) {
      const formattedData = paginatedContracts.data.map(c => ({
        service_id: c.service_id,
        service_name: c.service_name,
        service_group_name: c.service_group_name,
        price: String(c.price),
        static_endurance: String(c.static_endurance),
        percentage_endurance: String(c.percentage_endurance),
        static_wage: String(c.static_wage),
        percentage_wage: String(c.percentage_wage),
        use_static: c.use_static,
        approval: c.approval,
      }));
      
      // Only replace if the data is actually different to prevent unnecessary re-renders
      const currentValues = getValues('contracts');
      const hasChanges = formattedData.length !== currentValues.length || 
        formattedData.some((item, index) => {
          const current = currentValues[index];
          return !current || 
            item.service_id !== current.service_id ||
            item.price !== current.price ||
            item.static_endurance !== current.static_endurance ||
            item.percentage_endurance !== current.percentage_endurance ||
            item.static_wage !== current.static_wage ||
            item.percentage_wage !== current.percentage_wage ||
            item.use_static !== current.use_static ||
            item.approval !== current.approval;
        });
      
      if (hasChanges) {
        replace(formattedData);
      }
    }
  }, [paginatedContracts, replace, getValues]);

  // --- Autosave Mutation and Logic ---
  const updateMutation = useMutation({
    mutationFn: (params: { serviceId: number, data: Partial<CompanyServiceFormData> }) =>
      updateCompanyServiceContract(Number(companyId), params.serviceId, params.data),
    onSuccess: (updatedContract) => {
      // Don't update the query cache immediately to prevent re-renders that cause focus loss
      // The form will be updated when the user navigates away or manually refreshes
      toast.success("تم الحفظ تلقائياً", { id: `autosave-${updatedContract.data.service_id}` });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error("فشل في التحديث", { description: error.response?.data?.message });
      // Only invalidate on error to revert optimistic updates
      queryClient.invalidateQueries({ queryKey: contractedServicesQueryKey });
    },
  });
  
  const debouncedUpdate = useCallback(
    _debounce((index: number, fieldName: keyof ContractFormItem) => {
      // Check if the specific field was actually changed by the user
      if (dirtyFields.contracts?.[index]?.[fieldName]) {
        const fullRowData = getValues(`contracts.${index}`);
        const payload: Partial<CompanyServiceFormData> = {
            [fieldName]: fieldName === 'price' || fieldName === 'percentage_endurance' || fieldName === 'static_endurance' || fieldName === 'static_wage' || fieldName === 'percentage_wage'
                ? parseFloat(fullRowData[fieldName] as string)
                : fullRowData[fieldName]
        };
        toast.info("جاري الحفظ...", { id: `autosave-${fullRowData.service_id}-${fieldName}` });
        updateMutation.mutate({ serviceId: fullRowData.service_id, data: payload });
      }
    }, 200), // 200ms debounce
  [dirtyFields, getValues, updateMutation]
  );

  const importAllMutation = useMutation({
    mutationFn: (payload?: ImportAllServicesPayload) => importAllServicesToCompanyContract(Number(companyId), payload),
    onSuccess: (data) => {
        toast.success(data.message || "تم استيراد جميع الخدمات بنجاح"); // Assuming backend returns a message
        queryClient.invalidateQueries({ queryKey: contractedServicesQueryKey });
        queryClient.invalidateQueries({ queryKey: ['companyAvailableServices', Number(companyId)] });
    },
    onError: (error: ApiError) => toast.error(error.response?.data?.message || "فشل في استيراد الخدمات"),
  });

  // Modified handler for import all
  const handleOpenImportPreferenceDialog = () => {
    // You can pre-fill default endurance/wage from company settings if desired for the payload
    const defaultCompanyEndurance = company?.service_endurance; // Example
    setImportAllPayloadOverrides({
        // default_static_endurance: 0, // Or some default
        default_percentage_endurance: defaultCompanyEndurance ? parseFloat(String(defaultCompanyEndurance)) : 0,
        // ... other default overrides for wage, approval, use_static
    });
    setIsImportPreferenceDialogOpen(true);
  };

  const handleConfirmImportPreference = (preference: PriceImportPreference) => {
    setIsImportPreferenceDialogOpen(false);
    const payload = {
        ...importAllPayloadOverrides,
        price_preference: preference, // Add this to payload for backend
    };
    importAllMutation.mutate(payload);
  };

  const removeContractMutation = useMutation({
    mutationFn: (params: { companyId: number; serviceId: number }) =>
      removeServiceFromCompanyContract(params.companyId, params.serviceId),
    onSuccess: () => {
      toast.success("تم إزالة الخدمة من العقد بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["companyContractedServices", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["companyAvailableServices", companyId],
      }); // Also refetch available services
    },
    onError: (error: ApiError) => {
      toast.error("فشل في الحذف",
        { description: error.response?.data?.message || error.message }
      );
    },
  });

  const handleContractAdded = () => {
    // The dialog already invalidates queries
    // If you want to reset to page 1 after adding:
    // setCurrentPage(1);
  };

  const handleRemoveContract = (serviceId: number, serviceName: string) => {
    if (
      window.confirm(
        `هل تريد إزالة الخدمة "${serviceName}" من العقد؟`
      )
    ) {
      removeContractMutation.mutate({
        companyId: Number(companyId),
        serviceId,
      });
    }
  };

  const handleContractsCopied = () => {
    setIsCopyContractDialogOpen(false);
    // Force a refresh of the contracts list
    queryClient.invalidateQueries({
      queryKey: ["companyContractedServices", companyId],
      exact: true
    });
    // Reset to first page to ensure we see the new contracts
    setCurrentPage(1);
    toast.info("تم نسخ العقود بنجاح، جاري التحديث...");
  };

  // Determine if the "Copy Contract" button should be enabled
  const canCopyContracts =
    (paginatedContracts?.data?.length || 0) === 0 && !isLoadingContracts && !isFetchingContracts;

  if (isLoadingCompany || (isLoadingContracts && !isFetchingContracts)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 10rem)' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }
  if (contractsError)
    return (
      <Typography variant="body1" color="error" sx={{ p: 2 }}>
        فشل في جلب عقود الخدمات: {contractsError.message}
      </Typography>
    );

  const contracts = paginatedContracts?.data || [];
  const meta = paginatedContracts?.meta;

  const BackButtonIcon = ArrowRightLeft;

  return (
    <Box >
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/settings/companies")}
          sx={{ mb: 2 }}
        >
          <BackButtonIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          العودة إلى قائمة الشركات
        </Button>
        <Box sx={{ px: 0, pt: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            عقود خدمات {company?.name || "جاري التحميل..."}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة الخدمات وأسعارها المحددة المدرجة في عقد هذه الشركة.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
        <Button
          onClick={() => setIsCopyContractDialogOpen(true)}
          variant="outlined"
          size="small"
          disabled={!canCopyContracts || importAllMutation.isPending}
          sx={{ height: 36 }}
        >
          <Copy className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          نسخ العقود
        </Button>
        <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={handleOpenImportPreferenceDialog}
                    disabled={importAllMutation.isPending}
                >
                    {importAllMutation.isPending ? <CircularProgress size={16} className="ltr:mr-2 rtl:ml-2"/> : <File className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                    استيراد جميع الخدمات
                </Button>
        <Button
          onClick={handleGenerateServiceContractPdf}
          variant="outlined"
          size="small"
          sx={{ height: 36 }}
          disabled={isGeneratingPdf || isLoadingContracts || !contracts.length}
        >
          {isGeneratingPdf ? (
            <CircularProgress size={16} />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">
            طباعة
          </span>
        </Button>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => queryClient.invalidateQueries({ queryKey: contractedServicesQueryKey })}
          disabled={isLoadingContracts}
        >
          <RefreshCw className={`h-4 w-4 ltr:mr-2 rtl:ml-2 ${isLoadingContracts ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
        <AddCompanyServiceDialog
          companyId={Number(companyId)}
          companyName={company?.name || ""}
          onContractAdded={handleContractAdded}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ position: 'relative', width: { xs: '100%', sm: 'auto' }, maxWidth: { sm: 320 } }}>
          <TextField
            type="search"
            placeholder="البحث في الخدمات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4" />
                </InputAdornment>
              ),
            }}
            sx={{ width: '100%' }}
          />
        </Box>
      </Box>

      {isFetchingContracts && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          جاري تحديث القائمة...
        </Typography>
      )}

      {contracts.length === 0 && !isLoadingContracts ? (
        <Card sx={{ textAlign: 'center', py: 5 }}>
          <CardContent>
            <FileText className="mx-auto h-12 w-12" style={{ opacity: 0.5, marginBottom: 16 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              لا توجد عقود خدمات
            </Typography>
            <AddCompanyServiceDialog
              companyId={Number(companyId)}
              companyName={company?.name || ""}
              onContractAdded={handleContractAdded}
              triggerButton={
                <Button size="small" sx={{ mt: 2 }}>
                  <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  إضافة عقد خدمة
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <form>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 200, textAlign: 'center' }}>
                        اسم الخدمة
                      </TableCell>
                      <TableCell sx={{ width: 130, textAlign: 'center' }}>
                        السعر
                      </TableCell>
                      <TableCell sx={{ width: 120, textAlign: 'center', display: { xs: 'none', md: 'table-cell' } }}>
                        التحمل الثابت
                      </TableCell>
                      <TableCell sx={{ width: 120, textAlign: 'center', display: { xs: 'none', md: 'table-cell' } }}>
                        التحمل النسبي
                      </TableCell>
                      <TableCell sx={{ width: 120, textAlign: 'center', display: { xs: 'none', lg: 'table-cell' } }}>
                        الأجر الثابت
                      </TableCell>
                      <TableCell sx={{ width: 120, textAlign: 'center', display: { xs: 'none', lg: 'table-cell' } }}>
                        الأجر النسبي
                      </TableCell>
                      <TableCell sx={{ width: 100, textAlign: 'center' }}>
                        استخدام الثابت
                      </TableCell>
                      <TableCell sx={{ width: 100, textAlign: 'center' }}>
                        الموافقة
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', width: 120 }}>
                        فتح القائمة
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoadingContracts && <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', height: 96 }}><CircularProgress size={24} /></TableCell></TableRow>}
                    {!isLoadingContracts && fields.length === 0 && <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', height: 96, color: 'text.secondary' }}>لا توجد عقود خدمات</TableCell></TableRow>}
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                          {field.service_name}
                          {field.service_group_name && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {field.service_group_name}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center' }}>
                          <Controller name={`contracts.${index}.price`} control={control} render={({ field: f }) => (
                             <TextField 
                               {...f} 
                               type="number" 
                               size="small"
                               inputProps={{ step: "0.01" }}
                               sx={{ width: '100%', '& input': { textAlign: 'center' } }}
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'price'); }}
                               onFocus={(e) => e.target.select()}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
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
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', display: { xs: 'none', md: 'table-cell' } }}>
                          <Controller name={`contracts.${index}.static_endurance`} control={control} render={({ field: f }) => (
                             <TextField 
                               {...f} 
                               type="number" 
                               size="small"
                               inputProps={{ step: "0.01" }}
                               sx={{ width: '100%', '& input': { textAlign: 'center' } }}
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'static_endurance'); }}
                               onFocus={(e) => e.target.select()}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   const nextIndex = index + 1;
                                   if (nextIndex < fields.length) {
                                     const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.static_endurance"]`) as HTMLInputElement;
                                     if (nextInput) {
                                       nextInput.focus();
                                       nextInput.select();
                                     }
                                   }
                                 }
                               }}
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', display: { xs: 'none', md: 'table-cell' } }}>
                          <Controller name={`contracts.${index}.percentage_endurance`} control={control} render={({ field: f }) => (
                             <TextField 
                               {...f} 
                               type="number" 
                               size="small"
                               inputProps={{ step: "0.01", min: "0", max: "100" }}
                               placeholder="%"
                               sx={{ width: '100%', '& input': { textAlign: 'center' } }}
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'percentage_endurance'); }}
                               onFocus={(e) => e.target.select()}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   const nextIndex = index + 1;
                                   if (nextIndex < fields.length) {
                                     const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.percentage_endurance"]`) as HTMLInputElement;
                                     if (nextInput) {
                                       nextInput.focus();
                                       nextInput.select();
                                     }
                                   }
                                 }
                               }}
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', display: { xs: 'none', lg: 'table-cell' } }}>
                          <Controller name={`contracts.${index}.static_wage`} control={control} render={({ field: f }) => (
                             <TextField 
                               {...f} 
                               type="number" 
                               size="small"
                               inputProps={{ step: "0.01" }}
                               sx={{ width: '100%', '& input': { textAlign: 'center' } }}
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'static_wage'); }}
                               onFocus={(e) => e.target.select()}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   const nextIndex = index + 1;
                                   if (nextIndex < fields.length) {
                                     const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.static_wage"]`) as HTMLInputElement;
                                     if (nextInput) {
                                       nextInput.focus();
                                       nextInput.select();
                                     }
                                   }
                                 }
                               }}
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', display: { xs: 'none', lg: 'table-cell' } }}>
                          <Controller name={`contracts.${index}.percentage_wage`} control={control} render={({ field: f }) => (
                             <TextField 
                               {...f} 
                               type="number" 
                               size="small"
                               inputProps={{ step: "0.01", min: "0", max: "100" }}
                               placeholder="%"
                               sx={{ width: '100%', '& input': { textAlign: 'center' } }}
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'percentage_wage'); }}
                               onFocus={(e) => e.target.select()}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   const nextIndex = index + 1;
                                   if (nextIndex < fields.length) {
                                     const nextInput = document.querySelector(`input[name="contracts.${nextIndex}.percentage_wage"]`) as HTMLInputElement;
                                     if (nextInput) {
                                       nextInput.focus();
                                       nextInput.select();
                                     }
                                   }
                                 }
                               }}
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center' }}>
                          <Controller name={`contracts.${index}.use_static`} control={control} render={({ field: f }) => (
                             <Switch 
                               checked={f.value} 
                               onChange={(e) => { f.onChange(e.target.checked); debouncedUpdate(index, 'use_static'); }} 
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center' }}>
                          <Controller name={`contracts.${index}.approval`} control={control} render={({ field: f }) => (
                             <Checkbox 
                               checked={f.value} 
                               onChange={(e) => { f.onChange(e.target.checked); debouncedUpdate(index, 'approval'); }} 
                             />
                          )} />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'right' }}>
                          <IconButton
                            size="small"
                            onClick={(event) => setAnchorEl(event.currentTarget)}
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
                              onClick={() => {
                                handleRemoveContract(field.service_id, field.service_name);
                                setAnchorEl(null);
                              }}
                              disabled={
                                removeContractMutation.isPending &&
                                removeContractMutation.variables?.serviceId === field.service_id
                              }
                              sx={{ color: 'error.main' }}
                            >
                              {removeContractMutation.isPending &&
                              removeContractMutation.variables?.serviceId === field.service_id ? (
                                <CircularProgress size={16} className="rtl:ml-2 ltr:mr-2" />
                              ) : (
                                <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              )}
                              إزالة العقد
                            </MenuItem>
                          </Menu>
                        </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </form>
          </CardContent>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            السابق
          </Button>
          <Typography variant="body2" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center' }}>
            صفحة {currentPage} من {meta.last_page}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))
            }
            disabled={currentPage === meta.last_page}
          >
            التالي
          </Button>
        </Box>
      )}

      <Dialog
        open={isImportAllDialogOpen}
        onClose={() => setIsImportAllDialogOpen(false)}
      >
        <DialogTitle>
          استيراد جميع الخدمات
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل تريد استيراد جميع الخدمات المتاحة إلى عقد هذه الشركة؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsImportAllDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => importAllMutation.mutate(undefined)}
            disabled={importAllMutation.isPending}
            variant="contained"
          >
            {importAllMutation.isPending ? (
              <CircularProgress size={16} className="ltr:mr-2 rtl:ml-2" />
            ) : null}
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
         {/* NEW: Copy Contract Dialog */}
         {company && ( // Ensure company data is loaded before rendering this dialog
        <CopyCompanyContractDialog
            isOpen={isCopyContractDialogOpen}
            onOpenChange={setIsCopyContractDialogOpen}
            targetCompanyId={company.id}
            targetCompanyName={company.name}
            onContractsCopied={handleContractsCopied}
        />
      )}
           <ImportPricePreferenceDialog
            isOpen={isImportPreferenceDialogOpen}
            onOpenChange={setIsImportPreferenceDialogOpen}
            onConfirm={handleConfirmImportPreference}
            companyName={company?.name || ''}
        />
    </Box>
  );
}
