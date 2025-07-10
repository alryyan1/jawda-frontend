// src/pages/companies/CompanyMainTestContractsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form'; // Import RHF hooks
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import _debounce from 'lodash/debounce';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch'; // Good for boolean toggles
import { Loader2, ArrowLeft, Search, Trash2, RefreshCw, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

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

// --- Zod Schema for the Form Array ---
const contractItemSchema = z.object({
  // Read-only fields for display
  main_test_id: z.number(),
  main_test_name: z.string(),
  container_name: z.string().optional(),
  
  // Editable fields
  status: z.boolean(),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Price must be a positive number"),
  approve: z.boolean(),
  endurance_static: z.string().refine(val => /^\d+$/.test(val), "Must be a whole number"),
  endurance_percentage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, "Must be between 0-100"),
  use_static: z.boolean(),
});

const formSchema = z.object({
  contracts: z.array(contractItemSchema),
});

type FormValues = z.infer<typeof formSchema>;
type ContractFormItem = FormValues['contracts'][0];

const CompanyMainTestContractsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { t } = useTranslation(['companies', 'common', 'labTests']);
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
    resolver: zodResolver(formSchema),
    defaultValues: { contracts: [] },
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
      toast.success(t('common:autosaveSuccess'), { id: `autosave-${updatedContract.data.main_test_id}` });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(t('common:error.updateFailed'), { description: error.response?.data?.message });
      // Only invalidate on error to revert optimistic updates
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
    },
  });
  
  const debouncedUpdate = useCallback(
    _debounce((index: number, fieldName: keyof ContractFormItem) => {
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
        toast.info(t('common:autosaving'), { id: `autosave-${fullRowData.main_test_id}-${fieldName}` });
        updateMutation.mutate({ mainTestId: fullRowData.main_test_id, data: payload });
      }
    }, 200), // 200ms debounce
  [dirtyFields, getValues, updateMutation, t]
  );
  

  const removeMutation = useMutation({
    mutationFn: (mainTestId: number) => removeMainTestFromCompanyContract(Number(companyId), mainTestId),
    onSuccess: () => {
      toast.success(t('contracts.removedSuccess'));
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => toast.error(t('common:error.deleteFailed'), { description: error.response?.data?.message }),
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
      toast.success(t('contracts.printedSuccess'));
    } catch (error) {
      console.error('Print error:', error);
      toast.error(t('common:error.printFailed'));
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
    <>
      <div className="container mx-auto py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon"><Link to="/settings/companies"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
                <h1 className="text-2xl font-bold">{company?.name || t('common:loading')}</h1>
                <p className="text-sm text-muted-foreground">{t('contracts.manageTestContracts')}</p>
            </div>
        </div>
        {/* Actions Bar */}
        <div className="flex justify-between items-center">
            <div className="relative w-full max-w-sm">
                <Input type="search" placeholder={t('common:searchPlaceholder', { entity: t('labTests:testEntityNamePlural') })} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="ps-10" />
                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
                <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: contractsQueryKey })}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ltr:mr-2 rtl:ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common:refresh')}
                </Button>
                <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handlePrintContract}
                    disabled={isPrinting || isLoading}
                >
                    <Printer className={`h-4 w-4 ltr:mr-2 rtl:ml-2 ${isPrinting ? 'animate-spin' : ''}`} />
                    {t('contracts.printContract')}
                </Button>
                {/* <Button size="sm" onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{t('contracts.addTestToContract')}</Button> */}
            </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <form> {/* Form wraps the table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">{t('common:id')}</TableHead>
                    <TableHead className="w-[200px] text-center">{t('labTests:table.name')}</TableHead>
                    <TableHead className="w-[120px] text-center">{t('contracts.table.status')}</TableHead>
                    <TableHead className="w-[120px] text-center">{t('contracts.table.price')}</TableHead>
                    <TableHead className="w-[120px] text-center">{t('contracts.table.approve')}</TableHead>
                    <TableHead className="w-[150px] text-center">{t('contracts.table.endurancePercentage')}</TableHead>
                    <TableHead className="w-[150px] text-center">{t('contracts.table.enduranceStatic')}</TableHead>
                    <TableHead className="w-[100px] text-center">{t('contracts.table.useStatic')}</TableHead>
                    <TableHead className="w-[60px] text-right">{t('common:actions.title')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={9} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>}
                  {!isLoading && fields.length === 0 && <TableRow><TableCell colSpan={9} className="text-center h-24 text-muted-foreground">{t('contracts.noContractedTests')}</TableCell></TableRow>}
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-center font-mono text-sm">{field.main_test_id}</TableCell>
                      <TableCell className="font-medium text-center">{field.main_test_name}</TableCell>
                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.status`} control={control} render={({ field: f }) => (
                           <Switch checked={f.value} onCheckedChange={(val) => { f.onChange(val); debouncedUpdate(index, 'status'); }} />
                        )} />
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
                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.approve`} control={control} render={({ field: f }) => (
                           <Checkbox checked={f.value} onCheckedChange={(val) => { f.onChange(val); debouncedUpdate(index, 'approve'); }} />
                        )} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.endurance_percentage`} control={control} render={({ field: f }) => (
                            <Input 
                              {...f} 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max="100" 
                              className="h-8 text-center" 
                              placeholder="%" 
                              onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'endurance_percentage'); }}
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
                        )} />
                      </TableCell>
                      <TableCell className="text-center">
                         <Controller name={`contracts.${index}.endurance_static`} control={control} render={({ field: f }) => (
                             <Input 
                               {...f} 
                               type="number" 
                               step="1" 
                               min="0" 
                               className="h-8 text-center" 
                               onChange={(e) => { f.onChange(e); debouncedUpdate(index, 'endurance_static'); }}
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
                         )} />
                       </TableCell>
                      <TableCell className="text-center">
                        <Controller name={`contracts.${index}.use_static`} control={control} render={({ field: f }) => (
                           <Switch checked={f.value} onCheckedChange={(val) => { f.onChange(val); debouncedUpdate(index, 'use_static'); }} />
                        )} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMutation.mutate(field.main_test_id)} disabled={removeMutation.isPending && removeMutation.variables === field.main_test_id}>
                            {removeMutation.isPending && removeMutation.variables === field.main_test_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </form>
          </CardContent>
        </Card>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t('common:previous')}
            </Button>
            
            {/* Page numbers */}
            <div className="flex gap-1">
              {/* First page */}
              {meta.current_page > 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>
              )}
              
              {/* Ellipsis */}
              {meta.current_page > 4 && (
                <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
              )}
              
              {/* Previous pages */}
              {Array.from({ length: Math.min(2, meta.current_page - 1) }, (_, i) => {
                const page = meta.current_page - 2 + i;
                if (page > 1) {
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                }
                return null;
              })}
              
              {/* Current page */}
              <Button
                size="sm"
                variant="default"
                disabled
              >
                {meta.current_page}
              </Button>
              
              {/* Next pages */}
              {Array.from({ length: Math.min(2, meta.last_page - meta.current_page) }, (_, i) => {
                const page = meta.current_page + 1 + i;
                if (page < meta.last_page) {
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                }
                return null;
              })}
              
              {/* Ellipsis */}
              {meta.current_page < meta.last_page - 3 && (
                <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
              )}
              
              {/* Last page */}
              {meta.current_page < meta.last_page - 2 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(meta.last_page)}
                >
                  {meta.last_page}
                </Button>
              )}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === meta.last_page}
            >
              {t('common:next')}
              <ChevronRight className="h-4 w-4 ltr:ml-2 rtl:mr-2" />
            </Button>
          </div>
        )}

        {/* Results info */}
        {meta && (
          <div className="text-center text-sm text-muted-foreground">
            {t('common:showingResults', {
              from: meta.from,
              to: meta.to,
              total: meta.total
            })}
          </div>
        )}
      </div>

      {/* <AddMainTestToContractDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        companyId={Number(companyId)}
        onContractAdded={() => queryClient.invalidateQueries({ queryKey: contractsQueryKey })}
      /> */}
    </>
  );
};
export default CompanyMainTestContractsPage;