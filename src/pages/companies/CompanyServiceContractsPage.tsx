// src/pages/companies/CompanyServiceContractsPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import _debounce from 'lodash/debounce';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  ArrowRightLeft,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Save,
  Search,
  LibrarySquare,
  Printer,
  Copy,
  File,
  RefreshCw,
} from "lucide-react"; // ArrowRightLeft can be for "Back" in RTL

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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  const { t, i18n } = useTranslation(["companies", "common", "services"]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
      toast.success(t("common:pdfGeneratedSuccess"));
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(t("common:pdfGeneratedError"), {
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
      toast.success(t('common:autosaveSuccess'), { id: `autosave-${updatedContract.data.service_id}` });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(t('common:error.updateFailed'), { description: error.response?.data?.message });
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
        toast.info(t('common:autosaving'), { id: `autosave-${fullRowData.service_id}-${fieldName}` });
        updateMutation.mutate({ serviceId: fullRowData.service_id, data: payload });
      }
    }, 200), // 200ms debounce
  [dirtyFields, getValues, updateMutation, t]
  );

  const importAllMutation = useMutation({
    mutationFn: (payload?: ImportAllServicesPayload) => importAllServicesToCompanyContract(companyId, payload),
    onSuccess: (data) => {
        toast.success(data.message || t('companies:contracts.importAllSuccess')); // Assuming backend returns a message
        queryClient.invalidateQueries({ queryKey: contractedServicesQueryKey });
        queryClient.invalidateQueries({ queryKey: ['companyAvailableServices', companyId] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('companies:contracts.importAllError')),
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
      toast.success(
        t(
          "companies:serviceContracts.removedSuccess",
          "Service removed from contract."
        )
      );
      queryClient.invalidateQueries({
        queryKey: ["companyContractedServices", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["companyAvailableServices", companyId],
      }); // Also refetch available services
    },
    onError: (error: ApiError) => {
      toast.error(
        t("common:error.deleteFailed", {
          entity: t(
            "companies:serviceContracts.contractEntityName",
            "Contract"
          ),
        }),
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
        t("companies:serviceContracts.removeConfirm", { serviceName })
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
    toast.info(t("companies:serviceContracts.copyProcessCompletedRefresh"));
  };

  // Determine if the "Copy Contract" button should be enabled
  const canCopyContracts =
    (paginatedContracts?.data?.length || 0) === 0 && !isLoadingContracts && !isFetchingContracts;

  if (isLoadingCompany || (isLoadingContracts && !isFetchingContracts)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (contractsError)
    return (
      <p className="text-destructive p-4">
        {t("common:error.fetchFailedExt", {
          entity: t("companies:serviceContracts.title"),
          message: contractsError.message,
        })}
      </p>
    );

  const contracts = paginatedContracts?.data || [];
  const meta = paginatedContracts?.meta;

  const BackButtonIcon = i18n.dir() === "rtl" ? ArrowRightLeft : ArrowLeft;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/settings/companies")}
          className="mb-4"
        >
          <BackButtonIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("common:backToList", { listName: t("companies:pageTitle") })}
        </Button>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl sm:text-3xl font-bold">
            {t("companies:serviceContracts.title", {
              companyName: company?.name || t("common:loading"),
            })}
          </CardTitle>
          <CardDescription>
            {t(
              "companies:serviceContracts.description",
              "Manage the services and their specific pricing included in this company's contract."
            )}
          </CardDescription>
        </CardHeader>
      </div>

      <div className="flex gap-2 w-full sm:w-auto justify-end">
        <Button
          onClick={() => setIsCopyContractDialogOpen(true)}
          variant="outline"
          size="sm"
          disabled={!canCopyContracts || importAllMutation.isPending} // Disable if importing all or cannot copy
          className="h-9"
        >
          <Copy className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("companies:serviceContracts.copyContractsButton")}
        </Button>
        <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleOpenImportPreferenceDialog} // MODIFIED
                    disabled={importAllMutation.isPending}
                >
                    {importAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> : <File className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>}
                    {t('companies:contracts.importAllServicesButton')}
                </Button>
        <Button
          onClick={handleGenerateServiceContractPdf}
          variant="outline"
          size="sm"
          className="h-9"
          disabled={isGeneratingPdf || isLoadingContracts || !contracts.length}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">
            {t("common:print")}
          </span>
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: contractedServicesQueryKey })}
          disabled={isLoadingContracts}
        >
          <RefreshCw className={`h-4 w-4 ltr:mr-2 rtl:ml-2 ${isLoadingContracts ? 'animate-spin' : ''}`} />
          {t('common:refresh')}
        </Button>
        <AddCompanyServiceDialog
          companyId={Number(companyId)}
          companyName={company?.name || ""}
          onContractAdded={handleContractAdded}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Input
            type="search"
            placeholder={t("common:searchPlaceholder", "Search services...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 rtl:pr-10" // Padding for icon
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isFetchingContracts && (
        <div className="text-sm text-muted-foreground mb-2">
          {t("common:updatingList")}
        </div>
      )}

      {contracts.length === 0 && !isLoadingContracts ? (
        <Card className="text-center py-10">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {t("companies:serviceContracts.noContracts")}
            </p>
            <AddCompanyServiceDialog
              companyId={Number(companyId)}
              companyName={company?.name || ""}
              onContractAdded={handleContractAdded}
              triggerButton={
                <Button size="sm" className="mt-4">
                  <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {t("companies:serviceContracts.addContractButton")}
                </Button>
              }
            />
          
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <form> {/* Form wraps the table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] text-center">
                      {t("companies:serviceContracts.serviceName")}
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      {t("companies:serviceContracts.price")}
                    </TableHead>
                    <TableHead className="w-[120px] text-center hidden md:table-cell">
                      {t("companies:serviceContracts.staticEndurance")}
                    </TableHead>
                    <TableHead className="w-[120px] text-center hidden md:table-cell">
                      {t("companies:serviceContracts.percentageEndurance")}
                    </TableHead>
                    <TableHead className="w-[120px] text-center hidden lg:table-cell">
                      {t("companies:serviceContracts.staticWage")}
                    </TableHead>
                    <TableHead className="w-[120px] text-center hidden lg:table-cell">
                      {t("companies:serviceContracts.percentageWage")}
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      {t("companies:serviceContracts.useStatic")}
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      {t("companies:serviceContracts.approval")}
                    </TableHead>
                    <TableHead className="text-right w-[120px]">
                      {t("common:actions.openMenu")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingContracts && <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>}
                  {!isLoadingContracts && fields.length === 0 && <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">{t("companies:serviceContracts.noContracts")}</TableCell></TableRow>}
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium text-center">
                        {field.service_name}
                        {field.service_group_name && (
                          <span className="block text-xs text-muted-foreground">
                            {field.service_group_name}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.price`} control={control} render={({ field: f }) => (
                           <Input 
                             {...f} 
                             type="number" 
                             step="0.01" 
                             className="h-8 text-center" 
                             onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'price'); }}
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
                        )} />
                      </TableCell>

                      <TableCell className="text-center hidden md:table-cell">
                        <Controller name={`contracts.${index}.static_endurance`} control={control} render={({ field: f }) => (
                           <Input 
                             {...f} 
                             type="number" 
                             step="0.01" 
                             className="h-8 text-center" 
                             onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'static_endurance'); }}
                             onFocus={(e) => e.target.select()}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 // Find next static endurance input
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

                      <TableCell className="text-center hidden md:table-cell">
                        <Controller name={`contracts.${index}.percentage_endurance`} control={control} render={({ field: f }) => (
                           <Input 
                             {...f} 
                             type="number" 
                             step="0.01" 
                             min="0" 
                             max="100" 
                             className="h-8 text-center" 
                             placeholder="%" 
                             onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'percentage_endurance'); }}
                             onFocus={(e) => e.target.select()}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 // Find next percentage endurance input
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

                      <TableCell className="text-center hidden lg:table-cell">
                        <Controller name={`contracts.${index}.static_wage`} control={control} render={({ field: f }) => (
                           <Input 
                             {...f} 
                             type="number" 
                             step="0.01" 
                             className="h-8 text-center" 
                             onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'static_wage'); }}
                             onFocus={(e) => e.target.select()}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 // Find next static wage input
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

                      <TableCell className="text-center hidden lg:table-cell">
                        <Controller name={`contracts.${index}.percentage_wage`} control={control} render={({ field: f }) => (
                           <Input 
                             {...f} 
                             type="number" 
                             step="0.01" 
                             min="0" 
                             max="100" 
                             className="h-8 text-center" 
                             placeholder="%" 
                             onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'percentage_wage'); }}
                             onFocus={(e) => e.target.select()}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 // Find next percentage wage input
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

                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.use_static`} control={control} render={({ field: f }) => (
                           <Switch checked={f.value} onCheckedChange={(val) => { f.onChange(val); debouncedUpdate(index, 'use_static'); }} />
                        )} />
                      </TableCell>

                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.approval`} control={control} render={({ field: f }) => (
                           <Checkbox checked={f.value} onCheckedChange={(val) => { f.onChange(val); debouncedUpdate(index, 'approval'); }} />
                        )} />
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu dir={i18n.dir()}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleRemoveContract(
                                  field.service_id,
                                  field.service_name
                                )
                              }
                              className="text-destructive focus:text-destructive"
                              disabled={
                                removeContractMutation.isPending &&
                                removeContractMutation.variables?.serviceId ===
                                  field.service_id
                              }
                            >
                              {removeContractMutation.isPending &&
                              removeContractMutation.variables?.serviceId ===
                                field.service_id ? (
                                <Loader2 className="rtl:ml-2 ltr:mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                              )}
                              {t("companies:serviceContracts.removeContract")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </form>
          </CardContent>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            {t("common:previous")}
          </Button>
          <span className="px-2 py-1 text-sm">
            {t("common:page")} {currentPage} {t("common:of")} {meta.last_page}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, meta.last_page))
            }
            disabled={currentPage === meta.last_page}
          >
            {t("common:next")}
          </Button>
        </div>
      )}

      <AlertDialog
        open={isImportAllDialogOpen}
        onOpenChange={setIsImportAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("companies:serviceContracts.importAllButton")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("companies:serviceContracts.importAllConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importAllMutation.mutate(undefined)}
              disabled={importAllMutation.isPending}
            >
              {importAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              ) : null}
              {t("common:confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    </div>
  );
}
