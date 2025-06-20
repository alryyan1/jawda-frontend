// src/components/clinic/lab_requests/LabFinancialSummary.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Banknote, Coins, Percent } from 'lucide-react'; // Updated icons
import { formatNumber, cn } from '@/lib/utils';

import type { LabRequest } from '@/types/visits';
import type { Patient } from '@/types/patients';
import type { Shift } from '@/types/shifts'; // For currentClinicShift prop

interface LabFinancialSummaryProps {
  requestedTests: LabRequest[];
  currentPatient: Patient | null;
  currentClinicShift: Shift | null;
  onOpenBatchPaymentDialog: () => void;
  isCompanyPatient: boolean; // Pass this down for clarity
  className?: string;
}

const DetailRow: React.FC<{ label: string; value: string; icon?: React.ElementType; valueClass?: string }> = ({ label, value, icon: Icon, valueClass }) => (
  <div className="flex justify-between items-center py-1.5 text-sm">
    <span className="flex items-center text-muted-foreground">
      {Icon && <Icon className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5 text-gray-400" />}
      {label}:
    </span>
    <span className={`font-semibold ${valueClass || ''}`}>{value}</span>
  </div>
);

const LabFinancialSummary: React.FC<LabFinancialSummaryProps> = ({
  requestedTests,
  currentClinicShift,
  onOpenBatchPaymentDialog,
  isCompanyPatient,
  className,
}) => {
  const { t, i18n } = useTranslation(['payments', 'common', 'labTests']);
  console.log("requestedTests", requestedTests);
  const labSummary = useMemo(() => {
    if (!requestedTests) return { grossTotal:0, totalDiscount: 0, totalEndurance:0, totalNetPayableByPatient: 0, totalPaid: 0, totalBalanceDue: 0, totalNetPayableOverall: 0 };

    let grossTotal = 0;
    let totalDiscount = 0;
    let totalEndurance = 0;
    let totalNetPayableByPatient = 0;
    let totalPaid = 0;

    requestedTests.forEach(lr => {
      const price = Number(lr.price) || 0;
      const itemGross = price; // Lab tests typically have count 1
      grossTotal += itemGross;

      const itemDiscountAmount = (itemGross * (Number(lr.discount_per) || 0)) / 100;
      totalDiscount += itemDiscountAmount;
      
      const itemNetAfterDiscount = itemGross - itemDiscountAmount;

      let itemEnduranceAmount = 0;
      if (isCompanyPatient) {
        itemEnduranceAmount = Number(lr.endurance) || 0;
        totalEndurance += itemEnduranceAmount;
      }
      
      totalNetPayableByPatient += (itemNetAfterDiscount - itemEnduranceAmount);
      totalPaid += Number(lr.amount_paid) || 0;
    });

    const totalNetPayableOverall = grossTotal - totalDiscount - totalEndurance;
    const totalBalanceDue = totalNetPayableByPatient - totalPaid;

    return {
      grossTotal,
      totalDiscount,
      totalEndurance,
      totalNetPayableOverall,
      totalNetPayableByPatient: totalNetPayableByPatient < 0 ? 0 : totalNetPayableByPatient,
      totalPaid,
      totalBalanceDue: totalBalanceDue < 0 ? 0 : totalBalanceDue,
    };
  }, [requestedTests, isCompanyPatient]);

  // if (!requestedTests || requestedTests.length === 0) {
  //   return (
  //     <Card className={cn("shadow-sm", className)}>
  //       <CardHeader className="py-3">
  //         <CardTitle className="text-md font-semibold">{t('common:financialSummary_lab')}</CardTitle>
  //       </CardHeader>
  //       <CardContent className="text-sm text-center text-muted-foreground py-6">
  //         {t('labTests:request.noRequestsToSummarize')}
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <Card className={cn("shadow-sm", className)} style={{direction: i18n.dir()}}>
      <CardHeader className="py-3">
        <CardTitle className="text-md font-semibold">{t('common:financialSummary_lab')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3">
        <DetailRow label={t('payments:summaryLabels.grossTotal')} value={formatNumber(labSummary.grossTotal)} icon={Coins} />
        <DetailRow label={t('payments:summaryLabels.totalDiscount')} value={`-${formatNumber(labSummary.totalDiscount)}`} icon={Percent} valueClass="text-orange-600 dark:text-orange-400" />
        {isCompanyPatient && (
          <DetailRow label={t('payments:summaryLabels.companyEndurance')} value={`-${formatNumber(labSummary.totalEndurance)}`} icon={Banknote} valueClass="text-blue-600 dark:text-blue-400" />
        )}
        <Separator className="my-2" />
        <DetailRow label={t('payments:summaryLabels.netPayableByPatient')} value={formatNumber(labSummary.totalNetPayableByPatient)} icon={DollarSign} valueClass="font-bold text-lg" />
        <DetailRow label={t('payments:summaryLabels.totalPaidByPatient')} value={formatNumber(labSummary.totalPaid)} icon={DollarSign} valueClass="text-green-600 dark:text-green-500 font-semibold" />
        <Separator className="my-2" />
        <DetailRow
          label={t('payments:summaryLabels.balanceDueFromPatient')}
          value={formatNumber(labSummary.totalBalanceDue)}
          icon={DollarSign}
          valueClass={cn("font-bold text-xl", labSummary.totalBalanceDue > 0.09 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-500')}
        />
      </CardContent>
      {labSummary.totalBalanceDue > 0.09 && currentClinicShift?.id && (
        <CardFooter className="pt-2 pb-3 border-t">
          <Button
            variant="success"
            size="sm"
            className="w-full"
            onClick={onOpenBatchPaymentDialog}
            // disabled={isLoading} // Add appropriate disabled state if needed
          >
            <DollarSign className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" /> {t('payments:payAllDueLab')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default LabFinancialSummary;