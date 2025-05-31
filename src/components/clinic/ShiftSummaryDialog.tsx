// src/components/clinic/ShiftSummaryDialog.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale'; // Import locales
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as UICardTitle } from "@/components/ui/card"; // Renamed to avoid conflict
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertTriangle,
  DollarSign,
  Landmark,
  FileText,
  TrendingUp,
  TrendingDown,
  Receipt,
  Banknote,
  BadgePercent, // For discounts
} from "lucide-react";
import type { Shift, ShiftFinancialSummary } from "@/types/shifts";
import { getShiftFinancialSummary } from "@/services/shiftService";
import DetailRowDisplay from "@/components/ui/DetailRowDisplay"; // Assuming this is moved to ui or common
import { formatNumber } from '@/lib/utils';

interface ShiftSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
}

// Helper for financial sections
interface FinancialSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}
const FinancialSection: React.FC<FinancialSectionProps> = ({ title, icon: Icon, children }) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2 pt-3">
      <UICardTitle className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </UICardTitle>
    </CardHeader>
    <CardContent className="text-xs space-y-1">
      {children}
    </CardContent>
  </Card>
);

const ShiftSummaryDialog: React.FC<ShiftSummaryDialogProps> = ({
  isOpen,
  onOpenChange,
  shift,
}) => {
  const { t, i18n } = useTranslation([
    "clinic",
    "common",
    "dashboard",
    "finances",
  ]);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const {
    data: summary,
    isLoading,
    error,
    isFetching, // Added isFetching for better loading indication
  } = useQuery<ShiftFinancialSummary, Error>({
    queryKey: ["shiftFinancialSummary", shift?.id],
    queryFn: () => {
      if (!shift?.id) throw new Error("Shift ID is required for summary.");
      return getShiftFinancialSummary(shift.id);
    },
    enabled: !!shift && isOpen,
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  if (!shift) return null; // Should not happen if isOpen is true and shift is passed

  const renderContent = () => {
    if (isLoading || (isFetching && !summary)) {
      return (
        <div className="min-h-[400px] py-10 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">{t('common:loadingData')}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="min-h-[400px] p-4 text-destructive text-center flex flex-col items-center justify-center">
          <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
          <p className="font-semibold">{t("common:error.fetchFailed")}</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      );
    }
    if (summary) {
      return (
        <div className="space-y-3 sm:space-y-4 text-sm">
          <FinancialSection title={t("clinic:shiftSummary.incomeTitle")} icon={TrendingUp}>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalNetIncome")}
              value={formatNumber(summary.total_net_income)}
              unit={t("common:currencySymbolShort")}
              valueClassName="font-bold text-green-600 dark:text-green-400"
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalDiscount")}
              value={formatNumber(summary.total_discount_applied)}
              unit={t("common:currencySymbolShort")}
              icon={BadgePercent}
              valueClassName="text-orange-600 dark:text-orange-400"
            />
          </FinancialSection>

          <FinancialSection title={t("clinic:shiftSummary.collectionsTitle")} icon={Receipt}>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalCashCollected")}
              value={formatNumber(summary.total_cash_collected)}
              unit={t("common:currencySymbolShort")}
              icon={DollarSign}
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalBankCollected")}
              value={formatNumber(summary.total_bank_collected)}
              unit={t("common:currencySymbolShort")}
              icon={Landmark}
            />
            <Separator className="my-1.5" />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalCollected")}
              value={formatNumber(summary.total_collected)}
              unit={t("common:currencySymbolShort")}
              valueClassName="font-semibold"
            />
          </FinancialSection>

          <FinancialSection title={t("clinic:shiftSummary.expensesAndNet")} icon={Banknote}>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.recordedExpenses")}
              value={formatNumber(summary.recorded_expenses)}
              unit={t("common:currencySymbolShort")}
              icon={TrendingDown}
              valueClassName="text-red-600 dark:text-red-400"
            />
             <Separator className="my-1.5" />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.expectedCash")}
              value={formatNumber(summary.expected_cash_in_drawer)}
              unit={t("common:currencySymbolShort")}
              valueClassName="font-bold text-lg"
            />
          </FinancialSection>

          {summary.is_closed && (
            <FinancialSection title={t("clinic:shiftSummary.closureValues")} icon={FileText}>
              <DetailRowDisplay
                label={t("dashboard:closeShiftDialog.totalLabel")}
                value={formatNumber(summary.shift_total_recorded || 0)}
                unit={t("common:currencySymbolShort")}
              />
              <DetailRowDisplay
                label={t("dashboard:closeShiftDialog.bankLabel")}
                value={formatNumber(summary.shift_bank_recorded || 0)}
                unit={t("common:currencySymbolShort")}
              />
              {/* You could add a discrepancy calculation here if needed */}
            </FinancialSection>
          )}
        </div>
      );
    }
    return <div className="min-h-[400px] py-10 text-center text-muted-foreground">{t('common:noDataAvailable')}</div>; // Fallback if no summary and no error/loading
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {t("clinic:shiftSummary.dialogTitle")} #{shift.id}
          </DialogTitle>
          <DialogDescription>
            {shift.is_closed
              ? t("clinic:shiftSummary.closedOn", {
                  date: shift.closed_at
                    ? format(parseISO(shift.closed_at), 'Pp', { locale: dateLocale })
                    : "N/A",
                })
              : t("clinic:shiftSummary.currentlyOpen", {
                  openedAt: shift.created_at 
                    ? format(parseISO(shift.created_at), 'Pp', { locale: dateLocale }) 
                    : 'N/A'
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 py-4">
          <ScrollArea className="h-[400px]">
            {renderContent()}
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("common:close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ShiftSummaryDialog;