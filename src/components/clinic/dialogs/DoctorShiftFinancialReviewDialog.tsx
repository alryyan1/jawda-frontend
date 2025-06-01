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
import { Loader2, MoreHorizontal, FileText, CheckCircle, ShieldQuestion } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // For user filter

import type { DoctorShift } from '@/types/doctors'; // Update DoctorShift to include financial summary fields or make a new combined type
import type { UserStripped } from '@/types/auth';
import type { PaginatedResponse } from '@/types/common';
import { getDoctorShiftsReport, getDoctorShiftFinancialSummary, } from '@/services/reportService'; // Assuming doctorShiftService or reportService
import { getUsers } from '@/services/userService'; // To fetch users for filter
import { useAuth } from '@/contexts/AuthContext';
import AddDoctorEntitlementCostDialog from './AddDoctorEntitlementCostDialog'; // Import the new sub-dialog
import { formatNumber } from '@/lib/utils';
import type { DoctorShiftReportItem } from '@/types/reports';
import { updateDoctorShiftProofingFlags } from '@/services/doctorShiftService';
import { Label } from '@/components/ui/label';


// Extend DoctorShiftReportItem to include proofing flags
interface DoctorShiftReportItemWithFlags extends DoctorShiftReportItem {
    is_cash_revenue_prooved: boolean;
    is_cash_reclaim_prooved: boolean;
    is_company_revenue_prooved: boolean;
    is_company_reclaim_prooved: boolean;
}

// Combine DoctorShiftReportItem with its full financial summary
interface DoctorShiftWithFinancials extends DoctorShiftReportItemWithFlags {
    total_doctor_entitlement?: number;
    cash_entitlement?: number;
    insurance_entitlement?: number;
}

interface DoctorShiftFinancialReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // TriggerButton is usually outside for dialogs that list items
}

interface Filters {
  userId: string;
  dateFrom: string;
  dateTo: string;
  searchDoctor: string;
}

// Define the type for proofing flags
type ProofingFlags = {
  is_cash_revenue_prooved?: boolean;
  is_cash_reclaim_prooved?: boolean;
  is_company_revenue_prooved?: boolean;
  is_company_reclaim_prooved?: boolean;
};

const DoctorShiftFinancialReviewDialog: React.FC<DoctorShiftFinancialReviewDialogProps> = ({
  isOpen, onOpenChange
}) => {
  const { t } = useTranslation(['clinic', 'common', 'reports', 'finances'], {
    keyPrefix: 'reports:doctorShiftsReport'
  });
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    userId: currentUser?.id?.toString() || 'all',
    dateFrom: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    searchDoctor: '',
  });
  const [debouncedSearchDoctor, setDebouncedSearchDoctor] = useState('');

  // State for the sub-dialog (AddDoctorEntitlementCostDialog)
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [selectedShiftForCost, setSelectedShiftForCost] = useState<DoctorShiftWithFinancials | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchDoctor(filters.searchDoctor), 300);
    return () => clearTimeout(handler);
  }, [filters.searchDoctor]);

  const { data: usersForFilter } = useQuery<PaginatedResponse<UserStripped>, Error>({
    queryKey: ['usersListForShiftFilter'],
    queryFn: () => getUsers(1, {per_page: 200}), // Fetch users for filter
    enabled: isOpen,
  });

  const shiftsQueryKey = ['doctorShiftsForReview', currentPage, filters.userId, filters.dateFrom, filters.dateTo, debouncedSearchDoctor];
  const { data: paginatedShifts, isLoading, isFetching } = useQuery<PaginatedResponse<DoctorShiftWithFinancials>, Error>({
    queryKey: shiftsQueryKey,
    queryFn: async () => {
        const reportFilters = {
            page: currentPage,
            date_from: filters.dateFrom,
            date_to: filters.dateTo,
            doctor_name_search: debouncedSearchDoctor,
        };
        
        const reportResult = await getDoctorShiftsReport(reportFilters);
        
        const shiftsWithFinancials = await Promise.all(
            reportResult.data.map(async (ds) => {
                const financialSummary = await getDoctorShiftFinancialSummary(ds.id);
                const shiftWithFlags = ds as DoctorShiftReportItemWithFlags;
                return {
                    ...shiftWithFlags,
                    is_cash_revenue_prooved: shiftWithFlags.is_cash_revenue_prooved || false,
                    is_cash_reclaim_prooved: shiftWithFlags.is_cash_reclaim_prooved || false,
                    is_company_revenue_prooved: shiftWithFlags.is_company_revenue_prooved || false,
                    is_company_reclaim_prooved: shiftWithFlags.is_company_reclaim_prooved || false,
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
    onError: (error) => toast.error(error.message || t('common:error.updateFailed')),
  });

  const handleProofingAction = (shiftId: number, flagField: keyof ProofingFlags, currentValue: boolean) => {
    const flagsToUpdate: Partial<ProofingFlags> = {
      [flagField]: !currentValue
    };
    proofingFlagsMutation.mutate({ shiftId, flags: flagsToUpdate });
  };
  
  const handleOpenAddEntitlementCostDialog = (shift: DoctorShiftWithFinancials) => {
    setSelectedShiftForCost(shift);
    setIsAddCostDialogOpen(true);
  };

  const handleCostAddedAndProved = () => {
    // After cost is added, also mark the 'cash revenue' as proved for the selected shift
    if (selectedShiftForCost) {
      proofingFlagsMutation.mutate({ 
        shiftId: selectedShiftForCost.id, 
        flags: { is_cash_revenue_prooved: true } // Assuming this is the correct flag
      });
    }
    setIsAddCostDialogOpen(false);
    setSelectedShiftForCost(null);
    // queryClient.invalidateQueries({ queryKey: shiftsQueryKey }); // Already done by proofingFlagsMutation
  };


  const shifts = paginatedShifts?.data || [];
  const meta = paginatedShifts?.meta;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t('clinic:doctorShiftReview.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('clinic:doctorShiftReview.dialogDescription')}</DialogDescription>
        </DialogHeader>

        {/* Filters Section */}
        <div className="px-6 py-3 border-b grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
                <Label htmlFor="dsr-user-filter" className="text-xs">{t('common:user')}</Label>
                <Select value={filters.userId} onValueChange={(val) => setFilters(f => ({...f, userId: val, currentPage: 1}))} dir="ltr">
                    <SelectTrigger id="dsr-user-filter" className="h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('common:allUsers')}</SelectItem>
                        {usersForFilter?.data.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="dsr-date-from" className="text-xs">{t('common:dateFrom')}</Label>
                <Input id="dsr-date-from" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value, currentPage: 1}))} className="h-9"/>
            </div>
            <div>
                <Label htmlFor="dsr-date-to" className="text-xs">{t('common:dateTo')}</Label>
                <Input id="dsr-date-to" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value, currentPage: 1}))} className="h-9"/>
            </div>
            <div>
                <Label htmlFor="dsr-search-doc" className="text-xs">{t('common:searchDoctor')}</Label>
                <Input id="dsr-search-doc" type="search" placeholder={t('common:searchPlaceholderName')} value={filters.searchDoctor} onChange={e => setFilters(f => ({...f, searchDoctor: e.target.value, currentPage: 1}))} className="h-9"/>
            </div>
        </div>

        <ScrollArea className="flex-grow px-2 sm:px-4 py-2">
          {isLoading && !isFetching && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}
          {isFetching && <div className="text-xs text-center py-1 text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin"/> {t('common:loadingData')}</div>}
          {!isLoading && (!shifts || shifts.length === 0) && <p className="text-center py-10 text-muted-foreground">{t('common:noDataAvailable')}</p>}
          
          {shifts && shifts.length > 0 && (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[120px]">{t('table.doctorName')}</TableHead>
                  <TableHead className="text-center w-[100px]">{t('table.id')}</TableHead>
                  <TableHead className="text-center w-[130px]">{t('table.startTime')}</TableHead>
                  <TableHead className="text-center w-[100px]">{t('clinic:doctorShiftReview.totalEntitlement')}</TableHead>
                  <TableHead className="text-center w-[100px]">{t('clinic:doctorShiftReview.cashEntitlement')}</TableHead>
                  <TableHead className="text-center w-[100px]">{t('clinic:doctorShiftReview.insuranceEntitlement')}</TableHead>
                  <TableHead className="text-center w-[120px]">{t('common:actions.openMenu')}</TableHead>
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
                            <Button variant="outline" size="xs" className="h-6 px-1.5 py-0.5 text-[10px]" onClick={() => toast.info("PDF Report for this shift")}>
                                <FileText className="h-3 w-3"/>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="xs" className="h-6 px-1.5 py-0.5 text-[10px]">
                                        {t('clinic:doctorShiftReview.proofingActions')} <MoreHorizontal className="h-3 w-3 ltr:ml-1 rtl:mr-1"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                        onClick={() => handleOpenAddEntitlementCostDialog(ds)}
                                        disabled={proofingFlagsMutation.status === 'pending' || ds.is_cash_revenue_prooved}
                                    >
                                        {ds.is_cash_revenue_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5"/> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5"/>}
                                        {t('clinic:doctorShiftReview.proveCashRevenue')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_cash_reclaim_prooved', !!ds.is_cash_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                        {ds.is_cash_reclaim_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5"/> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5"/>}
                                        {t('clinic:doctorShiftReview.proveCashEntitlement')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_revenue_prooved', !!ds.is_company_revenue_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                        {ds.is_company_revenue_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5"/> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5"/>}
                                        {t('clinic:doctorShiftReview.proveInsuranceRevenue')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleProofingAction(ds.id, 'is_company_reclaim_prooved', !!ds.is_company_reclaim_prooved)} disabled={proofingFlagsMutation.status === 'pending'}>
                                        {ds.is_company_reclaim_prooved ? <CheckCircle className="h-3.5 w-3.5 text-green-500 ltr:mr-1.5 rtl:ml-1.5"/> : <ShieldQuestion className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5"/>}
                                        {t('clinic:doctorShiftReview.proveInsuranceEntitlement')}
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
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>{t('common:previous')}</Button>
                <span className="text-xs text-muted-foreground">{t('common:pageXOfY', { current: currentPage, total: meta.last_page })}</span>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching}>{t('common:next')}</Button>
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