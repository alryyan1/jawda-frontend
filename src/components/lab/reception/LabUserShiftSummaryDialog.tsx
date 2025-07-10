import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, DollarSign, Landmark, Coins } from 'lucide-react';
import type { LabUserShiftIncomeSummary } from '@/types/attendance';
import { fetchCurrentUserLabIncomeSummary } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Reusable Detail Row sub-component for consistent styling
interface DetailRowProps {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
  unit?: string;
  valueClass?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon: Icon, unit, valueClass }) => (
  <div className="flex justify-between items-center py-2 border-b last:border-b-0 dark:border-slate-700">
    <div className="flex items-center text-sm text-muted-foreground">
      {Icon && <Icon className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-slate-500" />}
      <span>{label}:</span>
    </div>
    <span className={cn("text-sm font-semibold", valueClass)}>
      {value === null || value === undefined ? '-' : value}
      {unit && <span className="text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">{unit}</span>}
    </span>
  </div>
);

interface LabUserShiftSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentClinicShiftId: number | null;
}

const LabUserShiftSummaryDialog: React.FC<LabUserShiftSummaryDialogProps> = ({ isOpen, onOpenChange, currentClinicShiftId }) => {
  const { t } = useTranslation(['labReception', 'common', 'payments']);
  const { user } = useAuth();

  const queryKey = ['labUserShiftIncomeSummary', user?.id, currentClinicShiftId] as const;

  const { data: summary, isLoading, error, isFetching } = useQuery<LabUserShiftIncomeSummary, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!currentClinicShiftId) {
        // This should not happen if the dialog is opened correctly, but it's a good safeguard
        throw new Error("Active shift ID is required to fetch summary.");
      }
      return fetchCurrentUserLabIncomeSummary(currentClinicShiftId);
    },
    enabled: isOpen && !!user && !!currentClinicShiftId, // Fetch only when dialog is open and all IDs are available
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[300px] !min-w-0 w-full">
        <DialogHeader>
          <DialogTitle>{t('summaryDialog.title', { userName: user?.name || t('common:user') })}</DialogTitle>
          <DialogDescription>
            {t('summaryDialog.labDescription', { shiftId: currentClinicShiftId || 'N/A' })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {(isLoading || (isFetching && !summary)) && (
            <div className="flex-grow flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ltr:ml-3 rtl:mr-3 text-muted-foreground">{t('summaryDialog.loading')}</p>
            </div>
          )}
          {error && (
            <div className="flex-grow text-center text-destructive bg-destructive/10 p-4 rounded-md">
              <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
              <p className="font-semibold">{t('common:error.fetchFailed', { entity: t('common:summary') })}</p>
              <p className="text-xs mt-1">{error.message}</p>
            </div>
          )}
          {summary && !isLoading && (
            <Card>
              <CardContent className="pt-6 space-y-1">
                <h4 className="font-semibold text-md mb-3 text-center">{t('summaryDialog.labIncomeTitle')}</h4>
                <DetailRow
                  label={t('summaryDialog.totalCash')}
                  value={formatNumber(summary.total_cash)}
                  icon={Coins}
                  unit={t('common:currencySymbolShort')}
                  valueClass="text-blue-600 dark:text-blue-400"
                />
                <DetailRow
                  label={t('summaryDialog.totalBank')}
                  value={formatNumber(summary.total_bank)}
                  icon={Landmark}
                  unit={t('common:currencySymbolShort')}
                  valueClass="text-purple-600 dark:text-purple-400"
                />
                <DetailRow
                  label={t('summaryDialog.totalIncome')}
                  value={formatNumber(summary.total_lab_income)}
                  icon={DollarSign}
                  unit={t('common:currencySymbolShort')}
                  valueClass="text-xl text-green-600 dark:text-green-500"
                />
              </CardContent>
            </Card>
          )}
          {!summary && !isLoading && !isFetching && !error && (
             <p className="text-center text-muted-foreground py-6">{t('common:noDataAvailable')}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common:close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default LabUserShiftSummaryDialog;