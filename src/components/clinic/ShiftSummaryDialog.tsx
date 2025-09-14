// src/components/clinic/ShiftSummaryDialog.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale'; // Import Arabic locale
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
  // Using Arabic directly
  const dateLocale = arSA;

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
          <p className="text-sm text-muted-foreground">جار تحميل البيانات...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="min-h-[400px] p-4 text-destructive text-center flex flex-col items-center justify-center">
          <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
          <p className="font-semibold">فشل في جلب البيانات</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      );
    }
    if (summary) {
      return (
        <div className="space-y-3 sm:space-y-4 text-sm">
          <FinancialSection title="الإيرادات" icon={TrendingUp}>
            <DetailRowDisplay
              label="إجمالي صافي الإيراد"
              value={formatNumber(summary.total_net_income)}
              unit="ج.س"
              valueClassName="font-bold text-green-600 "
            />
            <DetailRowDisplay
              label="إجمالي الخصومات"
              value={formatNumber(summary.total_discount_applied)}
              unit="ج.س"
              icon={BadgePercent}
              valueClassName="text-orange-600 "
            />
          </FinancialSection>

          <FinancialSection title="المحصلات" icon={Receipt}>
            <DetailRowDisplay
              label="إجمالي المحصل نقداً"
              value={formatNumber(summary.total_cash_collected)}
              unit="ج.س"
              icon={DollarSign}
            />
            <DetailRowDisplay
              label="إجمالي المحصل بنك/شبكة"
              value={formatNumber(summary.total_bank_collected)}
              unit="ج.س"
              icon={Landmark}
            />
            <Separator className="my-1.5" />
            <DetailRowDisplay
              label="إجمالي المحصلات"
              value={formatNumber(summary.total_collected)}
              unit="ج.س"
              valueClassName="font-semibold"
            />
          </FinancialSection>

          <FinancialSection title="المصروفات والصافي" icon={Banknote}>
            <DetailRowDisplay
              label="المصروفات المسجلة"
              value={formatNumber(summary.recorded_expenses)}
              unit="ج.س"
              icon={TrendingDown}
              valueClassName="text-red-600 "
            />
             <Separator className="my-1.5" />
            <DetailRowDisplay
              label="النقدية المتوقعة بالدرج"
              value={formatNumber(summary.expected_cash_in_drawer)}
              unit="ج.س"
              valueClassName="font-bold text-lg"
            />
          </FinancialSection>

          {summary.is_closed && (
            <FinancialSection title="قيم الإغلاق (اليدوية)" icon={FileText}>
              <DetailRowDisplay
                label="الإجمالي"
                value={formatNumber(summary.shift_total_recorded || 0)}
                unit="ج.س"
              />
              <DetailRowDisplay
                label="البنك"
                value={formatNumber(summary.shift_bank_recorded || 0)}
                unit="ج.س"
              />
              {/* You could add a discrepancy calculation here if needed */}
            </FinancialSection>
          )}
        </div>
      );
    }
    return <div className="min-h-[400px] py-10 text-center text-muted-foreground">لا توجد بيانات متاحة</div>; // Fallback if no summary and no error/loading
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            الملخص المالي للوردية #{shift.id}
          </DialogTitle>
          <DialogDescription>
            {shift.is_closed
              ? `أُغلقت في: ${shift.closed_at
                    ? format(shift.closed_at, 'Pp', { locale: dateLocale })
                    : "غير متوفر"}`
              : `هذه الوردية مفتوحة حالياً.`}
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
              إغلاق
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ShiftSummaryDialog;