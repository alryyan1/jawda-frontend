// src/pages/companies/CompanyMainTestContractsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, ArrowLeft, LibrarySquare, Search, FileText, CheckCircle2, XCircle, Trash2, Printer } from 'lucide-react';

import type { Company, PaginatedCompanyMainTestContractsResponse } from '@/types/companies';
import { getCompanyById, importAllMainTestsToCompanyContract } from '@/services/companyService';
import { 
    getCompanyContractedMainTests, 
    removeMainTestFromCompanyContract,
    // updateCompanyMainTestContract // For inline editing later
} from '@/services/companyService';

import AddCompanyMainTestDialog from '@/components/companies/AddCompanyMainTestDialog';
import { downloadCompanyTestContractPdf, type CompanyContractPdfFilters } from '@/services/reportService';
// import { useAuthorization } from '@/hooks/useAuthorization';

export default function CompanyMainTestContractsPage() {
  const { t, i18n } = useTranslation(['companies', 'common', 'labTests']);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGenerateTestContractPdf = async () => {
    if (!companyId) return;
    setIsGeneratingPdf(true);
    try {
      const filters: CompanyContractPdfFilters = {};
      if (debouncedSearchTerm) filters.search = debouncedSearchTerm;

      const blob = await downloadCompanyTestContractPdf(Number(companyId), filters);
      const url = window.URL.createObjectURL(blob); 
      const a = document.createElement('a');
      a.href = url;
      a.download = `company_${companyId}_tests_contracts_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(t('common:pdfGeneratedSuccess'));
    } catch (error: any) {
      toast.error(t('common:pdfGeneratedError'), { description: error.response?.data?.message || error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // const [editingContractId, setEditingContractId] = useState<number | null>(null); // For inline edit later
  
  // const { can } = useAuthorization();
  // const canAddContract = can('create company_test_contracts' as any);
  // const canImportAll = can('import_all_tests_to_company_contract' as any);
  // const canDeleteContract = can('delete company_test_contracts' as any);

  useEffect(() => { // Debounce search
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => { // Reset page on search
    setCurrentPage(1);
  }, [debouncedSearchTerm]);


  const { data: company, isLoading: isLoadingCompany } = useQuery<Company, Error>({
    queryKey: ['company', companyId],
    queryFn: () => getCompanyById(Number(companyId)).then(res => res.data),
    enabled: !!companyId,
  });

  const contractsQueryKey = ['companyContractedMainTests', companyId, currentPage, debouncedSearchTerm] as const;
  const { 
    data: paginatedContracts, 
    isLoading: isLoadingContracts, 
    error: contractsError, 
    isFetching: isFetchingContracts 
  } = useQuery<PaginatedCompanyMainTestContractsResponse, Error>({
    queryKey: contractsQueryKey,
    queryFn: () => getCompanyContractedMainTests(Number(companyId), currentPage, { search: debouncedSearchTerm }),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });

  const importAllMutation = useMutation({
    mutationFn: () => importAllMainTestsToCompanyContract(Number(companyId)),
    onSuccess: (data) => {
        toast.success(data.message || t('companies:testContracts.allImportedSuccess'));
        queryClient.invalidateQueries({ queryKey: contractsQueryKey });
        queryClient.invalidateQueries({ queryKey: ['companyAvailableMainTests', companyId] });
    },
    onError: () => {
        toast.error(t('common:error.operationFailed'));
    }
  });

  const removeContractMutation = useMutation({
    mutationFn: (params: { mainTestId: number }) => 
        removeMainTestFromCompanyContract(Number(companyId), params.mainTestId),
    onSuccess: () => {
      toast.success(t('companies:testContracts.removedSuccess'));
      queryClient.invalidateQueries({ queryKey: contractsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['companyAvailableMainTests', companyId] });
    },
    onError: () => {
        toast.error(t('common:error.operationFailed'));
    }
  });

  const handleImportAll = () => {
    if (window.confirm(t('companies:testContracts.importAllConfirm'))) {
      importAllMutation.mutate();
    }
  };
  const handleContractAdded = () => { /* Parent already invalidates, this callback can be empty or for other UI updates */ };
  const handleRemoveContract = (mainTestId: number, testName: string) => {
    if (window.confirm(t('common:confirmDeleteMessageForItem', { item: testName, context: t('companies:testContracts.contractContext', "contract") }))) {
      removeContractMutation.mutate({ mainTestId });
    }
  };

  const BackButtonIcon = i18n.dir() === 'rtl' ? FileText : ArrowLeft; // FileText was example, ArrowLeft more common

  if (isLoadingCompany || (isLoadingContracts && !isFetchingContracts && currentPage === 1)) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (contractsError) return <p className="text-destructive p-4">{t('common:error.fetchFailedExt', { entity: t('companies:testContracts.title'), message: contractsError.message })}</p>;

  const contracts = paginatedContracts?.data || [];
  const meta = paginatedContracts?.meta;

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/settings/companies')} className="mb-4">
            <BackButtonIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t('common:backToList', { listName: t('companies:pageTitle') })}
        </Button>
        <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl sm:text-3xl font-bold">
                {t('companies:testContracts.title', { companyName: company?.name || t('common:loading') })}
            </CardTitle>
            <CardDescription>
                {t('companies:testContracts.description')}
            </CardDescription>
        </CardHeader>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Input type="search" placeholder={t('common:searchByName', { entity: t('labTests:testEntityNamePlural')})} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ps-10 rtl:pr-10 h-9"/>
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
            {/* {canImportAll && ( */}
            <Button onClick={handleGenerateTestContractPdf} variant="outline" size="sm" className="h-9" disabled={isGeneratingPdf || isLoadingContracts || !contracts.length}>
                     {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>}
                    <span className="ltr:ml-2 rtl:ml-2 hidden sm:inline">{t('common:print')}</span>
                </Button>
            <Button onClick={handleImportAll} variant="outline" size="sm" disabled={importAllMutation.isPending} className="h-9">
                {importAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : <LibrarySquare className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                {t('companies:testContracts.importAllButton')}
            </Button>
            {/* )} */}
            {/* {canAddContract && ( */}
            <AddCompanyMainTestDialog 
                companyId={Number(companyId)} 
                companyName={company?.name || ''}
                onContractAdded={handleContractAdded} 
            />
            {/* )} */}
        </div>
      </div>

      {isFetchingContracts && <div className="text-sm text-muted-foreground mb-2 text-center">{t('common:updatingList')}</div>}

      {!isLoadingContracts && contracts.length === 0 ? (
        <Card className="text-center py-10">
            <CardContent>
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{searchTerm ? t('common:noResultsFound') : t('companies:testContracts.noContracts')}</p>
                {/* ... Add Test to Contract button ... */}
            </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">{t('companies:testContracts.testName')}</TableHead>
                <TableHead className="text-center hidden sm:table-cell">{t('labTests:table.priceDefault')}</TableHead>
                <TableHead className="text-center">{t('companies:testContracts.contractPrice')}</TableHead>
                <TableHead className="text-center hidden md:table-cell">{t('companies:testContracts.status')}</TableHead>
                <TableHead className="text-center hidden lg:table-cell">{t('companies:testContracts.approval')}</TableHead>
                <TableHead className="text-center hidden lg:table-cell">{t('companies:testContracts.endurancePercentage')}</TableHead>
                <TableHead className="text-right w-[100px]">{t('common:actions.openMenu')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.contract_details.contract_id}>
                  <TableCell className="font-medium py-2">
                    {contract.main_test_name}
                    {contract.container_name && <span className="block text-xs text-muted-foreground">({contract.container_name})</span>}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell py-2">{Number(contract.default_price).toFixed(2)}</TableCell>
                  <TableCell className="text-center font-semibold py-2">{Number(contract.contract_details.price).toFixed(2)}</TableCell>
                  <TableCell className="text-center hidden md:table-cell py-2">
                    <Badge variant={contract.contract_details.status ? 'default' : 'outline'}>
                      {contract.contract_details.status ? t('companies:testContracts.active') : t('companies:testContracts.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell py-2">
                    {contract.contract_details.approve ? 
                        <div title={t('companies:testContracts.approved')}>
                          <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                        </div> : 
                        <div title={t('companies:testContracts.notApproved')}>
                          <XCircle className="h-5 w-5 text-slate-400 mx-auto" />
                        </div>}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell py-2">{Number(contract.contract_details.endurance_percentage).toFixed(1)}%</TableCell>
                  <TableCell className="text-right py-2">
                    <DropdownMenu dir={i18n.dir()}>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleRemoveContract(contract.main_test_id, contract.main_test_name)} 
                          className="text-destructive focus:text-destructive"
                          disabled={removeContractMutation.isPending && removeContractMutation.variables?.mainTestId === contract.main_test_id}
                        >
                          <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                          {t('common:delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isFetchingContracts}
          >
            {t('common:previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common:pageXOfY', { current: currentPage, total: meta.last_page })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(meta.last_page, prev + 1))}
            disabled={currentPage === meta.last_page || isFetchingContracts}
          >
            {t('common:next')}
          </Button>
        </div>
      )}
    </div>
  );
}