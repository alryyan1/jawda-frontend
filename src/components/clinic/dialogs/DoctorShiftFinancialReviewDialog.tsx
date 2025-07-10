// src/components/clinic/dialogs/DoctorShiftFinancialReviewDialog.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, CheckCircle, ShieldQuestion, Download, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';

// MUI Imports for Autocomplete
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import type { DoctorShift } from '@/types/doctors';
import type { PaginatedResponse } from '@/types/common';
import {
  getDoctorShiftsReport,
  getDoctorShiftFinancialSummary,
  downloadDoctorShiftFinancialSummaryPdf,
  type DoctorReclaimsPdfFilters,
  downloadDoctorReclaimsPdf
} from '@/services/reportService';
import { getUsers } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import AddDoctorEntitlementCostDialog from './AddDoctorEntitlementCostDialog';
import { formatNumber } from '@/lib/utils';
import type { DoctorShiftReportItem } from '@/types/reports';
import { updateDoctorShiftProofingFlags } from '@/services/doctorShiftService';
import { useAuthorization } from '@/hooks/useAuthorization';
import { webUrl } from '@/pages/constants';

// Combine DoctorShiftReportItem with its full financial summary
interface DoctorShiftWithFinancials extends DoctorShiftReportItem {
  is_cash_revenue_prooved: boolean;
  is_cash_reclaim_prooved: boolean;
  is_company_revenue_prooved: boolean;
  is_company_reclaim_prooved: boolean;
  total_doctor_entitlement?: number;
  cash_entitlement?: number;
  insurance_entitlement?: number;
}

interface DoctorShiftFinancialReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Filters {
  userId: string; // 'all' or user ID
  dateFrom: string;
  dateTo: string;
  searchDoctor: string;
  status: 'open' | 'closed' | 'all';
}

type ProofingFlags = {
  is_cash_revenue_prooved: boolean;
  is_cash_reclaim_prooved: boolean;
  is_company_revenue_prooved: boolean;
  is_company_reclaim_prooved: boolean;
};

const DoctorShiftFinancialReviewDialog: React.FC<DoctorShiftFinancialReviewDialogProps> = ({
  isOpen, onOpenChange
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common', 'reports', 'finances', 'review']);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization();

  const canViewAllUsersShifts = can('list all_doctor_shifts');

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    userId: currentUser?.id?.toString() || 'all',
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    searchDoctor: '',
    status: 'open',
  });
  const [debouncedSearchDoctor, setDebouncedSearchDoctor] = useState('');
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [selectedShiftForCost, setSelectedShiftForCost] = useState<DoctorShiftWithFinancials | null>(null);
  const [isDownloadingPdfId, setIsDownloadingPdfId] = useState<number | null>(null);
  const [isDownloadingReclaimsPdf, setIsDownloadingReclaimsPdf] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchDoctor(filters.searchDoctor), 300);
    return () => clearTimeout(handler);
  }, [filters.searchDoctor]);

  useEffect(() => {
    if (!canViewAllUsersShifts && filters.userId === 'all' && currentUser?.id) {
      setFilters(f => ({ ...f, userId: currentUser.id.toString() }));
    }
  }, [canViewAllUsersShifts, currentUser, filters.userId]);

  const { data: usersForFilter, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['usersListForShiftReviewFilter'],
    queryFn: () => getUsers(1, { per_page: 200 }),
    enabled: isOpen && canViewAllUsersShifts,
  });

  const shiftsQueryKey = ['doctorShiftsForReview', currentPage, filters] as const;

  const { data: paginatedShifts, isLoading, isFetching } = useQuery<PaginatedResponse<DoctorShiftWithFinancials>, Error>({
    queryKey: shiftsQueryKey,
    queryFn: async () => {
      const reportFilters: {
        page: number;
        date_from: string;
        date_to: string;
        doctor_name_search?: string;
        user_id_opened?: number;
        status?: string;
      } = {
        page: currentPage,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_name_search: debouncedSearchDoctor || undefined,
        user_id_opened: filters.userId === 'all' ? undefined : parseInt(filters.userId),
        status: filters.status === 'all' ? undefined : (filters.status === 'open' ? '1' : '0'),
      };

      const reportResult = await getDoctorShiftsReport(reportFilters);

      const shiftsWithFinancials = await Promise.all(
        reportResult.data.map(async (ds) => {
          let financialSummary = { total_doctor_share: 0, doctor_cash_share_total: 0, doctor_insurance_share_total: 0 };
          try {
            financialSummary = await getDoctorShiftFinancialSummary(ds.id);
          } catch (e) {
            console.warn(`Failed to fetch financial summary for doctor shift ${ds.id}`, e);
          }

          const dsTyped = ds as DoctorShiftReportItem & Partial<ProofingFlags>;

          return {
            ...ds,
            is_cash_revenue_prooved: dsTyped.is_cash_revenue_prooved || false,
            is_cash_reclaim_prooved: dsTyped.is_cash_reclaim_prooved || false,
            is_company_revenue_prooved: dsTyped.is_company_revenue_prooved || false,
            is_company_reclaim_prooved: dsTyped.is_company_reclaim_prooved || false,
            total_doctor_entitlement: financialSummary.total_doctor_share,
            cash_entitlement: financialSummary.doctor_cash_share_total,
            insurance_entitlement: financialSummary.doctor_insurance_share_total,
          };
        })
      );
      return { ...reportResult, data: shiftsWithFinancials };
    },
    placeholderData: keepPreviousData,
    enabled: isOpen,
  });

  const proofingFlagsMutation = useMutation<DoctorShift, Error, { shiftId: number; flags: Partial<ProofingFlags> }, unknown>({
    mutationFn: (params) => updateDoctorShiftProofingFlags(params.shiftId, params.flags),
    onSuccess: () => {
      toast.success(t('clinic:doctorShiftReview.proofingStatusUpdated'));
      queryClient.invalidateQueries({ queryKey: shiftsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || t('common:error.updateFailed')),
  });

  const handleProofingAction = (shiftId: number, flagField: keyof ProofingFlags, currentValue: boolean) => {
    const flagsToUpdate: Partial<ProofingFlags> = { [flagField]: !currentValue };
    proofingFlagsMutation.mutate({ shiftId, flags: flagsToUpdate });
  };

  const handleOpenAddEntitlementCostDialog = (shift: DoctorShiftWithFinancials) => {
    setSelectedShiftForCost(shift);
    setIsAddCostDialogOpen(true);
  };

  const handleCostAddedAndProved = () => {
    if (selectedShiftForCost) {
      handleProofingAction(selectedShiftForCost.id, 'is_cash_revenue_prooved', false);
    }
    setIsAddCostDialogOpen(false);
    setSelectedShiftForCost(null);
  };

  const handleViewShiftPdf = async (shiftId: number) => {
    setIsDownloadingPdfId(shiftId);
    try {
      const blob = await downloadDoctorShiftFinancialSummaryPdf(shiftId);
      const url = window.URL.createObjectURL(blob);
      setCurrentPdfUrl(url);
      setPdfViewerOpen(true);
      toast.success(t('reports:pdfGeneratedSuccess'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reports:pdfGeneratedError'), { description: errorMessage });
    } finally {
      setIsDownloadingPdfId(null);
    }
  };

  const shifts = paginatedShifts?.data || [];
  const meta = paginatedShifts?.meta;

  const handleDownloadReclaimsReport = async () => {
    setIsDownloadingReclaimsPdf(true);
    try {
      const pdfFilters: DoctorReclaimsPdfFilters = {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        user_id_opened: filters.userId === 'all' ? null : filters.userId,
        doctor_name_search: debouncedSearchDoctor || undefined,
      };
      const blob = await downloadDoctorReclaimsPdf(pdfFilters);
      const url = window.URL.createObjectURL(blob);
      setCurrentPdfUrl(url);
      setPdfViewerOpen(true);
      toast.success(t('reports:pdfGeneratedSuccess'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reports:pdfGeneratedError'), { description: errorMessage });
    } finally {
      setIsDownloadingReclaimsPdf(false);
    }
  };

  const statusOptions = [
    { value: 'open', label: t('filters.statusOpen') },
    { value: 'closed', label: t('filters.statusClosed') },
    { value: 'all', label: t('filters.statusAll') }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent style={{direction: i18n.dir(), zIndex: 1000}} className="w-[80vw] !max-w-[80vw] max-h-[90vh] flex flex-col text-base dark:bg-slate-900 dark:text-slate-100 overflow-visible">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">{t('review.dialogTitle')}</DialogTitle>
            <DialogDescription className="text-base">{t('review.dialogDescription')}</DialogDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReclaimsReport}
              disabled={isDownloadingReclaimsPdf || isLoading || isFetching || shifts.length === 0}
              className="text-sm"
            >
              {isDownloadingReclaimsPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1"/> : <Download className="h-4 w-4 ltr:mr-1 rtl:ml-1"/>}
              {t('review.printReclaimsReport')}
            </Button>
          </DialogHeader>

          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            {canViewAllUsersShifts && (
              <div>
                <Label htmlFor="dsr-user-filter" className="text-sm font-medium">{t('filters.user')}</Label>
                <Autocomplete
                  options={[{ id: 'all', name: t('filters.allUsers') }, ...(usersForFilter?.data || [])]}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={usersForFilter?.data?.find(u => u.id.toString() === filters.userId) || { id: 'all', name: t('filters.allUsers') }}
                  onChange={(_, newValue) => {
                    const userId = newValue?.id === 'all' ? 'all' : newValue?.id.toString() || 'all';
                    setFilters(f => ({ ...f, userId, currentPage: 1 }));
                  }}
                  loading={isLoadingUsers}
                  size="small"
                  disablePortal={false}
                  sx={{
                    '& .MuiAutocomplete-popper': {
                      zIndex: 9999,
                    },
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={t('filters.user')} 
                      variant="outlined" 
                      className="dark:bg-slate-800 dark:text-slate-100"
                      InputProps={{
                        ...params.InputProps, 
                        endAdornment: (
                          <>
                            {isLoadingUsers ? <CircularProgress size={16}/> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" style={{ zIndex: 99999 }} />}
                />
              </div>
            )}
            <div>
              <Label htmlFor="dsr-status-filter" className="text-sm font-medium">{t('filters.status')}</Label>
              <Autocomplete
                options={statusOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                value={statusOptions.find(opt => opt.value === filters.status) || statusOptions[0]}
                onChange={(_, newValue) => {
                  const status = newValue?.value as Filters['status'] || 'open';
                  setFilters(f => ({ ...f, status, currentPage: 1 }));
                }}
                size="small"
                                  disablePortal={false}
                  slotProps={{
                    popper: {
                      style: { zIndex: 999999999 },
                      container: () => document.body
                    }
                  }}
                  sx={{
                    '& .MuiAutocomplete-popper': {
                      zIndex: 99999999999,
                    },
                  }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={t('filters.status')} 
                    variant="outlined"
                    className="dark:bg-slate-800 dark:text-slate-100"
                  />
                )}
                PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" style={{ zIndex: 99999 }} />}
              />
            </div>
            <div>
              <Label htmlFor="dsr-date-from" className="text-sm font-medium">{t('filters.dateFrom')}</Label>
              <Input 
                id="dsr-date-from" 
                type="date" 
                value={filters.dateFrom} 
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, currentPage: 1 }))} 
                className="h-10 text-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" 
              />
            </div>
            <div>
              <Label htmlFor="dsr-date-to" className="text-sm font-medium">{t('filters.dateTo')}</Label>
              <Input 
                id="dsr-date-to" 
                type="date" 
                value={filters.dateTo} 
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, currentPage: 1 }))} 
                className="h-10 text-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" 
              />
            </div>
            <div className={!canViewAllUsersShifts ? "md:col-span-2" : ""}>
              <Label htmlFor="dsr-search-doc" className="text-sm font-medium">{t('filters.searchDoctor')}</Label>
              <Input 
                id="dsr-search-doc" 
                type="search" 
                placeholder={t('filters.searchPlaceholderName')} 
                value={filters.searchDoctor} 
                onChange={e => setFilters(f => ({ ...f, searchDoctor: e.target.value, currentPage: 1 }))} 
                className="h-10 text-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600" 
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-400px)] flex-grow px-2 sm:px-4 py-2">
            {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            {isFetching && <div className="text-sm text-center py-1 text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> {t('common:loadingData')}</div>}
            {!isLoading && shifts.length === 0 && <p className="text-center py-10 text-muted-foreground text-base">{t('common:noDataAvailable')}</p>}

            {shifts.length > 0 && (
              <Table dir={i18n.dir()} className="text-sm">
                <TableHeader>
                  <TableRow className="dark:border-slate-700">
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('table.doctorName')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('table.id')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('table.startTime')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('review.totalEntitlement')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('review.cashEntitlement')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('review.insuranceEntitlement')}</TableHead>
                    <TableHead className="text-center text-sm font-medium dark:text-slate-200">{t('common:actions.openMenu')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map(ds => (
                    <TableRow key={ds.id} className="dark:border-slate-700 dark:hover:bg-slate-800">
                      <TableCell className="text-center py-2 text-sm dark:text-slate-200">{ds.doctor_name}</TableCell>
                      <TableCell className="text-center py-2 text-sm dark:text-slate-200">{ds.id}</TableCell>
                      <TableCell className="text-center py-2 text-sm dark:text-slate-200">{ds.formatted_start_time}</TableCell>
                      <TableCell className="text-center py-2 font-semibold text-sm dark:text-slate-200">{formatNumber(ds.total_doctor_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-2 text-sm dark:text-slate-200">{formatNumber(ds.cash_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-2 text-sm dark:text-slate-200">{formatNumber(ds.insurance_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 py-1 text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => handleViewShiftPdf(ds.id)}
                            disabled={isDownloadingPdfId === ds.id}
                          >
                            {isDownloadingPdfId === ds.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <a className="h-8 px-3 py-1 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" href={`${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${ds.id}`}>
                            {t('reports:clinicReportOldPdf')}
                          </a>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-3 py-1 text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                                {t('review.proofingActions')} <MoreHorizontal className="h-4 w-4 ltr:ml-1 rtl:mr-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-sm dark:bg-slate-800 dark:border-slate-700">
                              <DropdownMenuItem
                                onClick={() => handleOpenAddEntitlementCostDialog(ds)}
                                disabled={proofingFlagsMutation.status === 'pending' || ds.is_cash_revenue_prooved}
                                className="dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                {ds.is_cash_revenue_prooved ? <CheckCircle className="h-4 w-4 text-green-500 ltr:mr-2 rtl:ml-2" /> : <ShieldQuestion className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                                {t('review.proveCashRevenue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_cash_reclaim_prooved', !!ds.is_cash_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'} className="dark:text-slate-200 dark:hover:bg-slate-700">
                                {ds.is_cash_reclaim_prooved ? <CheckCircle className="h-4 w-4 text-green-500 ltr:mr-2 rtl:ml-2" /> : <ShieldQuestion className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                                {t('review.proveCashEntitlement')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="dark:bg-slate-700" />
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_revenue_prooved', !!ds.is_company_revenue_prooved)} disabled={proofingFlagsMutation.status === 'pending'} className="dark:text-slate-200 dark:hover:bg-slate-700">
                                {ds.is_company_revenue_prooved ? <CheckCircle className="h-4 w-4 text-green-500 ltr:mr-2 rtl:ml-2" /> : <ShieldQuestion className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                                {t('review.proveInsuranceRevenue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_reclaim_prooved', !!ds.is_company_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'} className="dark:text-slate-200 dark:hover:bg-slate-700">
                                {ds.is_company_reclaim_prooved ? <CheckCircle className="h-4 w-4 text-green-500 ltr:mr-2 rtl:ml-2" /> : <ShieldQuestion className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                                {t('review.proveInsuranceEntitlement')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {meta && meta.last_page > 1 && (
            <div className="px-6 pt-3 pb-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} className="text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{t('common:pagination.previous')}</Button>
              <span className="text-sm text-muted-foreground dark:text-slate-400">{t('common:pagination.pageXOfY', { current: currentPage, total: meta.last_page })}</span>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} className="text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{t('common:pagination.next')}</Button>
            </div>
          )}

          <DialogFooter className="px-6 pb-6 pt-0 mt-auto">
            <DialogClose asChild><Button type="button" variant="outline" className="text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{t('common:close')}</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[90vh] !max-h-[90vh] dark:bg-slate-900 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="dark:text-slate-200">{t('reports:pdfViewer')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {currentPdfUrl && (
              <iframe
                src={currentPdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            )}
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setPdfViewerOpen(false);
                if (currentPdfUrl) {
                  window.URL.revokeObjectURL(currentPdfUrl);
                  setCurrentPdfUrl('');
                }
              }}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('common:close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedShiftForCost && (
        <AddDoctorEntitlementCostDialog
          isOpen={isAddCostDialogOpen}
          onOpenChange={setIsAddCostDialogOpen}
          doctorShift={selectedShiftForCost}
          onCostAddedAndProved={handleCostAddedAndProved}
        />
      )}
    </>
  );
};
export default DoctorShiftFinancialReviewDialog;