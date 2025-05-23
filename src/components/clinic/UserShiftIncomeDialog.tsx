// src/components/clinic/UserShiftIncomeDialog.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, Landmark, Coins } from 'lucide-react'; // Landmark for bank, Coins for cash
import type { UserShiftIncomeSummary } from '@/types/users'; // Adjust path
import { fetchCurrentUserShiftIncomeSummary } from '@/services/userService'; // Adjust path
import { useAuth } from '@/contexts/AuthContext'; // To get current user info for display

interface UserShiftIncomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentClinicShiftId: number | null; // ID of the currently active general clinic shift
}

const DetailRow: React.FC<{ label: string; value?: string | number | null; icon?: React.ElementType; unit?: string, valueClass?: string }> = 
({ label, value, icon: Icon, unit, valueClass }) => (
 <div className="flex justify-between items-center py-2 border-b last:border-b-0">
     <div className="flex items-center text-sm text-muted-foreground">
         {Icon && <Icon className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
         <span>{label}:</span>
     </div>
     <span className={`text-sm font-semibold ${valueClass || ''}`}>
         {value === null || value === undefined ? '-' : Number(value).toFixed(2)}
         {unit && <span className="text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">{unit}</span>}
     </span>
 </div>
);


const UserShiftIncomeDialog: React.FC<UserShiftIncomeDialogProps> = ({ isOpen, onOpenChange, currentClinicShiftId }) => {
  const { t } = useTranslation(['clinic', 'common', 'dashboard']); // dashboard for currencySymbol if used
  const { user } = useAuth();

  const queryKey = ['userShiftIncomeSummary', user?.id, currentClinicShiftId];

  const { data: summary, isLoading, error, isFetching } = useQuery<UserShiftIncomeSummary, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!currentClinicShiftId) throw new Error("Active clinic shift ID is required.");
      return fetchCurrentUserShiftIncomeSummary(currentClinicShiftId);
    },
    enabled: isOpen && !!user && !!currentClinicShiftId, // Fetch only when dialog is open and IDs are available
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('clinic:userShiftIncomeDialog.title', { userName: user?.name || '...' })}
          </DialogTitle>
          <DialogDescription>
            {t('clinic:userShiftIncomeDialog.description', { shiftId: currentClinicShiftId || 'N/A' })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
         {(isLoading || isFetching) && (
            <div className="flex-grow flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ltr:ml-2 rtl:mr-2 text-muted-foreground">{t('clinic:userShiftIncomeDialog.loading')}</p>
            </div>
          )}
          {error && (
            <div className="flex-grow text-center text-destructive p-4">
              <p>{t('common:error.fetchFailed', { entity: "Summary" })}: {error.message}</p>
            </div>
          )}
          {summary && !isLoading && !isFetching && (
            <Card>
              <CardContent className="pt-6 space-y-1">
                 <DetailRow 
                     label={t('clinic:userShiftIncomeDialog.totalCash')} 
                     value={summary.total_cash}
                     icon={Coins}
                     unit={t('dashboard:currencySymbol')}
                     valueClass="text-blue-600 dark:text-blue-400"
                 />
                 <DetailRow 
                     label={t('clinic:userShiftIncomeDialog.totalBank')} 
                     value={summary.total_bank}
                     icon={Landmark}
                     unit={t('dashboard:currencySymbol')}
                     valueClass="text-purple-600 dark:text-purple-400"
                 />
                 <DetailRow 
                     label={t('clinic:userShiftIncomeDialog.totalIncome')} 
                     value={summary.total_income}
                     icon={DollarSign}
                     unit={t('dashboard:currencySymbol')}
                     valueClass="text-xl text-green-600 dark:text-green-500"
                 />
              </CardContent>
            </Card>
          )}
          {!summary && !isLoading && !isFetching && !error && (
             <p className="text-center text-muted-foreground py-6">{t('clinic:userShiftIncomeDialog.noData')}</p>
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

export default UserShiftIncomeDialog;