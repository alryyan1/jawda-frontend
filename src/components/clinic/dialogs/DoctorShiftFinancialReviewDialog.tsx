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
import { Loader2, MoreHorizontal, FileText, CheckCircle, ShieldQuestion, Download } from 'lucide-react'; // Added Filter
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import type { DoctorShift } from '@/types/doctors';
import type { UserStripped } from '@/types/auth';
import type { PaginatedResponse } from '@/types/common';
import {
  getDoctorShiftsReport, // This service now needs to accept doctor_name_search and user_id_opened
  getDoctorShiftFinancialSummary,
  downloadDoctorShiftFinancialSummaryPdf, // IMPORT THIS
  type DoctorReclaimsPdfFilters,
  downloadDoctorReclaimsPdf
} from '@/services/reportService';
import { getUsers } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import AddDoctorEntitlementCostDialog from './AddDoctorEntitlementCostDialog';
import { formatNumber } from '@/lib/utils';
import type { DoctorShiftReportItem } from '@/types/reports';
import { updateDoctorShiftProofingFlags } from '@/services/doctorShiftService';
import { useAuthorization } from '@/hooks/useAuthorization'; // For permission check
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
  status: 'open' | 'closed' | 'all'; // NEW FILTER
}

type ProofingFlags = Pick<DoctorShift,
  'is_cash_revenue_prooved' |
  'is_cash_reclaim_prooved' |
  'is_company_revenue_prooved' |
  'is_company_reclaim_prooved'
>;

const DoctorShiftFinancialReviewDialog: React.FC<DoctorShiftFinancialReviewDialogProps> = ({
  isOpen, onOpenChange
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common', 'reports', 'finances', 'review']); // Ensure 'review' namespace exists or add keys to 'clinic'
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { can } = useAuthorization(); // Get can function

  const canViewAllUsersShifts = can('list all_doctor_shifts'); // Example permission

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    userId: canViewAllUsersShifts ? 'all' : currentUser?.id?.toString() || 'all', // Default to current user if cannot view all
    dateFrom: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    searchDoctor: '',
    status: 'open', // Default to open shifts
  });
  const [debouncedSearchDoctor, setDebouncedSearchDoctor] = useState('');
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [selectedShiftForCost, setSelectedShiftForCost] = useState<DoctorShiftWithFinancials | null>(null);
  const [isDownloadingPdfId, setIsDownloadingPdfId] = useState<number | null>(null);
  const [isDownloadingReclaimsPdf, setIsDownloadingReclaimsPdf] = useState(false); // NEW state for overall repor

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchDoctor(filters.searchDoctor), 300);
    return () => clearTimeout(handler);
  }, [filters.searchDoctor]);

  useEffect(() => { // Reset to current user if permission changes (edge case)
    if (!canViewAllUsersShifts && filters.userId === 'all' && currentUser?.id) {
      setFilters(f => ({ ...f, userId: currentUser.id.toString() }));
    }
  }, [canViewAllUsersShifts, currentUser, filters.userId]);

  const { data: usersForFilter, isLoading: isLoadingUsers } = useQuery<PaginatedResponse<UserStripped>, Error>({
    queryKey: ['usersListForShiftReviewFilter'],
    queryFn: () => getUsers(1, { per_page: 200 }),
    enabled: isOpen && canViewAllUsersShifts, // Only fetch if user can filter by all users
  });

  const shiftsQueryKey = ['doctorShiftsForReview', currentPage, filters] as const;

  const { data: paginatedShifts, isLoading, isFetching } = useQuery<PaginatedResponse<DoctorShiftWithFinancials>, Error>({
    queryKey: shiftsQueryKey,
    queryFn: async () => {
      const reportFilters: any = {
        page: currentPage,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        doctor_name_search: debouncedSearchDoctor || undefined, // Send undefined if empty
        user_id_opened: filters.userId === 'all' ? undefined : parseInt(filters.userId),
        status: filters.status === 'all' ? undefined : (filters.status === 'open' ? '1' : '0'),
      };

      const reportResult = await getDoctorShiftsReport(reportFilters);

      const shiftsWithFinancials = await Promise.all(
        reportResult.data.map(async (ds) => {
          // Fetch financial summary only if needed (e.g., if not already on ds)
          let financialSummary = { total_doctor_share: 0, doctor_cash_share_total: 0, doctor_insurance_share_total: 0 };
          try {
            financialSummary = await getDoctorShiftFinancialSummary(ds.id);
          } catch (e) {
            console.warn(`Failed to fetch financial summary for doctor shift ${ds.id}`, e);
          }

          // Explicitly cast ds to include expected proofing flags from DoctorShift model
          const dsTyped = ds as DoctorShiftReportItem & Partial<ProofingFlags>;

          return {
            ...ds, // Spread properties from DoctorShiftReportItem
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
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.updateFailed')),
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
      handleProofingAction(selectedShiftForCost.id, 'is_cash_revenue_prooved', false); // This will toggle it to true
    }
    setIsAddCostDialogOpen(false);
    setSelectedShiftForCost(null);
  };

  const handleDownloadShiftPdf = async (shiftId: number, doctorName: string) => {
    setIsDownloadingPdfId(shiftId);
    try {
      const blob = await downloadDoctorShiftFinancialSummaryPdf(shiftId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DoctorShift_${shiftId}_${doctorName.replace(/\s+/g, '_')}_Financials.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('reports:pdfGeneratedSuccess'));
    } catch (error: any) {
      toast.error(t('reports:pdfGeneratedError'), { description: error.message });
    } finally {
      setIsDownloadingPdfId(null);
    }
  };

  const shifts = paginatedShifts?.data || [];
  const meta = paginatedShifts?.meta;
  // NEW: Handler for downloading the overall reclaims PDF
  const handleDownloadReclaimsReport = async () => {
    setIsDownloadingReclaimsPdf(true);
    try {
      const pdfFilters: DoctorReclaimsPdfFilters = {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        user_id_opened: filters.userId === 'all' ? null : filters.userId,
        doctor_name_search: debouncedSearchDoctor || undefined,
        // status: filters.status === 'all' ? undefined : filters.status, // Add if your backend uses it for this report
      };
      const blob = await downloadDoctorReclaimsPdf(pdfFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');  
      a.href = url;
      a.download = `Doctor_Reclaims_Report_${filters.dateFrom}_to_${filters.dateTo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('reports:pdfGeneratedSuccess'));
    } catch (error: any) {
      toast.error(t('reports:pdfGeneratedError'), { description: error.message || error.response?.data?.message });
    } finally {
      setIsDownloadingReclaimsPdf(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent style={{direction: i18n.dir()}} className="max-w-4xl xl:max-w-7xl max-h-[90vh] flex flex-col"> {/* Increased width */}
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t('review.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('review.dialogDescription')}</DialogDescription>
              {/* NEW PDF Export Button for the whole filtered list */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReclaimsReport}
            disabled={isDownloadingReclaimsPdf || isLoading || isFetching || shifts.length === 0}
          >
            {isDownloadingReclaimsPdf ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1"/> : <Download className="h-4 w-4 ltr:mr-1 rtl:ml-1"/>}
            {t('review.printReclaimsReport')}
          </Button>
          </DialogHeader>

          <div className="px-6 py-3 border-b grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            {canViewAllUsersShifts && (
              <div>
                <Label htmlFor="dsr-user-filter" className="text-xs">{t('filters.user')}</Label>
                <Select value={filters.userId} onValueChange={(val) => setFilters(f => ({ ...f, userId: val, currentPage: 1 }))} dir={i18n.dir()} disabled={isLoadingUsers}>
                  <SelectTrigger id="dsr-user-filter" className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filters.allUsers')}</SelectItem>
                    {usersForFilter?.data.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="dsr-status-filter" className="text-xs">{t('filters.status')}</Label>
              <Select value={filters.status} onValueChange={(val) => setFilters(f => ({ ...f, status: val as Filters['status'], currentPage: 1 }))} dir={i18n.dir()}>
                <SelectTrigger id="dsr-status-filter" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t('filters.statusOpen')}</SelectItem>
                  <SelectItem value="closed">{t('filters.statusClosed')}</SelectItem>
                  <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dsr-date-from" className="text-xs">{t('filters.dateFrom')}</Label>
              <Input id="dsr-date-from" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, currentPage: 1 }))} className="h-9" />
            </div>
            <div>
              <Label htmlFor="dsr-date-to" className="text-xs">{t('filters.dateTo')}</Label>
              <Input id="dsr-date-to" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, currentPage: 1 }))} className="h-9" />
            </div>
            <div className={!canViewAllUsersShifts ? "md:col-span-2" : ""}> {/* Adjust span if user filter is hidden */}
              <Label htmlFor="dsr-search-doc" className="text-xs">{t('filters.searchDoctor')}</Label>
              <Input id="dsr-search-doc" type="search" placeholder={t('filters.searchPlaceholderName')} value={filters.searchDoctor} onChange={e => setFilters(f => ({ ...f, searchDoctor: e.target.value, currentPage: 1 }))} className="h-9" />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-400px)] flex-grow px-2 sm:px-4 py-2">
            {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            {isFetching && <div className="text-xs text-center py-1 text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> {t('common:loadingData')}</div>}
            {!isLoading && shifts.length === 0 && <p className="text-center py-10 text-muted-foreground">{t('common:noDataAvailable')}</p>}

            {shifts.length > 0 && (
              <Table dir={i18n.dir()} className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t('table.doctorName')}</TableHead>
                    <TableHead className="text-center">{t('table.id')}</TableHead>
                    <TableHead className="text-center">{t('table.startTime')}</TableHead>
                    <TableHead className="text-center">{t('review.totalEntitlement')}</TableHead>
                    <TableHead className="text-center">{t('review.cashEntitlement')}</TableHead>
                    <TableHead className="text-center">{t('review.insuranceEntitlement')}</TableHead>
                    <TableHead className="text-center">{t('common:actions.openMenu')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map(ds => (
                    <TableRow key={ds.id}>
                      <TableCell className="text-center py-1.5">{ds.doctor_name}</TableCell>
                      <TableCell className="text-center py-1.5">{ds.id}</TableCell>
                      <TableCell className="text-center py-1.5">{ds.formatted_start_time}</TableCell>
                      <TableCell className="text-center py-1.5 font-semibold">{formatNumber(ds.total_doctor_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-1.5">{formatNumber(ds.cash_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-1.5">{formatNumber(ds.insurance_entitlement || 0)}</TableCell>
                      <TableCell className="text-center py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-6 px-1.5 py-0.5 text-[10px]"
                            onClick={() => handleDownloadShiftPdf(ds.id, ds.doctor_name)}
                            disabled={isDownloadingPdfId === ds.id}
                          >
                            {isDownloadingPdfId === ds.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                          </Button>
                          {/* reports/clinic-report-old/pdf */}
                          <a  size="xs" className="h-6 px-1.5 py-0.5 text-[10px]"  href={`${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${ds.id}`}>
                            {t('reports:clinicReportOldPdf')}
                          </a>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="xs" className="h-6 px-1.5 py-0.5 text-[10px]">
                                {t('review.proofingActions')} <MoreHorizontal className="h-3 w-3 ltr:ml-1 rtl:mr-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenAddEntitlementCostDialog(ds)}
                                disabled={proofingFlagsMutation.status === 'pending' || ds.is_cash_revenue_prooved}
                              >
                                {ds.is_cash_revenue_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5" /> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />}
                                {t('review.proveCashRevenue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_cash_reclaim_prooved', !!ds.is_cash_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                {ds.is_cash_reclaim_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5" /> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />}
                                {t('review.proveCashEntitlement')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_revenue_prooved', !!ds.is_company_revenue_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                {ds.is_company_revenue_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5" /> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />}
                                {t('review.proveInsuranceRevenue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_reclaim_prooved', !!ds.is_company_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                {ds.is_company_reclaim_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5" /> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />}
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
            <div className="px-6 pt-3 pb-2 border-t flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>{t('common:pagination.previous')}</Button>
              <span className="text-xs text-muted-foreground">{t('common:pagination.pageXOfY', { current: currentPage, total: meta.last_page })}</span>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>{t('common:pagination.next')}</Button>
            </div>
          )}

          <DialogFooter className="px-6 pb-6 pt-0 mt-auto">
            <DialogClose asChild><Button type="button" variant="outline">{t('common:close')}</Button></DialogClose>
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