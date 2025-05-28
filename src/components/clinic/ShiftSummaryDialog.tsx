// src/components/clinic/ShiftSummaryDialog.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  AlertTriangle,
  DollarSign,
  Landmark,
  FileText,
} from "lucide-react";
import type { Shift } from "@/types/shifts";
import type { ShiftFinancialSummary } from "@/types/shifts"; // Or reports.ts
import { getShiftFinancialSummary } from "@/services/shiftService";
import DetailRowDisplay from "../ui/DetailRowDisplay";
interface ShiftSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null; // The general clinic shift
}

const ShiftSummaryDialog: React.FC<ShiftSummaryDialogProps> = ({
  isOpen,
  onOpenChange,
  shift,
}) => {
  const { t } = useTranslation([
    "clinic",
    "common",
    "dashboard",
    "finances",
  ]);

  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<ShiftFinancialSummary, Error>({
    queryKey: ["shiftFinancialSummary", shift?.id],
    queryFn: () => {
      if (!shift?.id) throw new Error("Shift ID is required.");
      return getShiftFinancialSummary(shift.id);
    },
    enabled: !!shift && isOpen,
  });

  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("clinic:shiftSummary.dialogTitle")} #{shift.id}
          </DialogTitle>
          <DialogDescription>
            {shift.is_closed
              ? t("clinic:shiftSummary.closedOn", {
                  date: shift.closed_at
                    ? new Date(shift.closed_at).toLocaleString()
                    : "N/A",
                })
              : t("clinic:shiftSummary.currentlyOpen")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="p-4 text-destructive text-center">
            <AlertTriangle className="mx-auto h-6 w-6 mb-1" />
            {t("common:error.fetchFailed")}
            <p className="text-xs">{error.message}</p>
          </div>
        )}

        {summary && !isLoading && !error && (
          <div className="py-4 space-y-3 text-sm">
            <h4 className="font-semibold text-md">
              {t("clinic:shiftSummary.incomeTitle")}
            </h4>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalNetIncome")}
              value={summary.total_net_income.toFixed(1)}
              unit={t("common:currency")}
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalDiscount")}
              value={summary.total_discount_applied.toFixed(1)}
              unit={t("common:currency")}
              valueClassName="text-orange-600"
            />

            <Separator className="my-2" />
            <h4 className="font-semibold text-md">
              {t("clinic:shiftSummary.collectionsTitle")}
            </h4>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalCashCollected")}
              value={summary.total_cash_collected.toFixed(1)}
              unit={t("common:currency")}
              icon={DollarSign}
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalBankCollected")}
              value={summary.total_bank_collected.toFixed(1)}
              unit={t("common:currency")}
              icon={Landmark}
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.totalCollected")}
              value={summary.total_collected.toFixed(1)}
              unit={t("common:currency")}
              valueClassName="font-bold text-green-600"
            />

            <Separator className="my-2" />
            <h4 className="font-semibold text-md">
              {t("clinic:shiftSummary.expensesAndNet")}
            </h4>
            <DetailRowDisplay
              label={t("clinic:shiftSummary.recordedExpenses")}
              value={summary.recorded_expenses.toFixed(1)}
              unit={t("common:currency")}
              valueClassName="text-red-600"
            />
            <DetailRowDisplay
              label={t("clinic:shiftSummary.expectedCash")}
              value={summary.expected_cash_in_drawer.toFixed(1)}
              unit={t("common:currency")}
              valueClassName="font-bold"
            />

            {summary.is_closed && (
              <>
                <Separator className="my-2" />
                <h4 className="font-semibold text-md">
                  {t("clinic:shiftSummary.closureValues")}
                </h4>
                <DetailRowDisplay
                  label={t("dashboard:closeShiftDialog.totalLabel")}
                  value={summary.shift_total_recorded?.toFixed(1)}
                  unit={t("common:currency")}
                />
                <DetailRowDisplay
                  label={t("dashboard:closeShiftDialog.bankLabel")}
                  value={summary.shift_bank_recorded?.toFixed(1)}
                  unit={t("common:currency")}
                />
              </>
            )}
          </div>
        )}

        <DialogFooter className="mt-2">
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
