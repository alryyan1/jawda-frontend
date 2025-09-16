// src/components/clinic/RequestedServicesSummary.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatNumber } from '@/lib/utils';
import type { RequestedService } from '@/types/services';
import type { Patient } from '@/types/patients'; // To determine if patient is insured
import type { DoctorVisit } from '@/types/visits';

interface RequestedServicesSummaryProps {
  requestedServices: RequestedService[];
  className?: string;
  visit:DoctorVisit;
}

const RequestedServicesSummary: React.FC<RequestedServicesSummaryProps> = ({
  requestedServices,
  visit,
  className,
}) => {
  const isCompanyPatient = !!visit.patient?.company_id;

  const summary = useMemo(() => {
    if (!requestedServices || requestedServices.length === 0) {
      return {
        grossTotal: 0, // Total before any deductions
        totalDiscountApplied: 0,
        totalEnduranceApplied: 0, // Specifically for company patients
        netPayableByPatient: 0,
        totalActuallyPaidByPatient: 0,
        patientBalanceDue: 0,
        netTotalAfterDiscountsAndEndurance: 0,
      };
    }

    let grossTotal = 0;
    let totalDiscountApplied = 0;
    let totalEnduranceApplied = 0;
    let totalActuallyPaidByPatient = 0;

    requestedServices.forEach(rs => {
      const pricePerItem = Number(rs.price) || 0;
      const count = Number(rs.count) || 1;
      const itemSubTotal = pricePerItem * count;
      grossTotal += itemSubTotal;

      // Calculate total discount for this item (percentage + fixed)
      const discountFromPercentage = (itemSubTotal * (Number(rs.discount_per) || 0)) / 100;
      const fixedDiscount = Number(rs.discount) || 0;
      const itemTotalDiscount = discountFromPercentage + fixedDiscount;
      totalDiscountApplied += itemTotalDiscount;

      const amountAfterDiscount = itemSubTotal - itemTotalDiscount;
      
      let itemEnduranceAmount = 0;
      if (isCompanyPatient) {
        // Endurance applies per item. Assuming rs.endurance is per-item endurance value from contract.
        itemEnduranceAmount = (Number(rs.endurance) || 0) * count; 
        totalEnduranceApplied += itemEnduranceAmount;
      }

      // What the patient is responsible for after discount and company endurance
      // const itemNetPayableByPatient = amountAfterDiscount - itemEnduranceAmount;
      
      totalActuallyPaidByPatient += Number(rs.amount_paid) || 0;
    });

    // Net total after all discounts and company endurance (what ideally should be collected from patient + company)
    const netTotalAfterDiscountsAndEndurance = grossTotal - totalDiscountApplied - totalEnduranceApplied;
    
    // What the patient is specifically responsible for paying
    
    const netPayableByPatient = isCompanyPatient ? totalEnduranceApplied : grossTotal - totalDiscountApplied - totalEnduranceApplied;
    

    const patientBalanceDue = netPayableByPatient - totalActuallyPaidByPatient;

    return {
      netTotalAfterDiscountsAndEndurance,
      grossTotal,
      totalDiscountApplied,
      totalEnduranceApplied,
      netPayableByPatient: netPayableByPatient < 0 ? 0 : netPayableByPatient, // Don't show negative
      totalActuallyPaidByPatient,
      patientBalanceDue: patientBalanceDue < 0 ? 0 : patientBalanceDue, // Don't show negative
    };
  }, [requestedServices, isCompanyPatient]);

  if (!requestedServices || requestedServices.length === 0) {
    return null; // Don't render if no services
  }

  return (
    <Card dir="rtl" style={{ direction: true }} className={`mt-4 shadow-sm ${className}`}>
      <CardHeader className="py-3">
        <CardTitle className="text-md">الملخص المالي</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1.5 pb-4">
        <div className="flex justify-between">
          <span>إجمالي الخدمات:</span>
          <span className="font-semibold">{formatNumber(summary.grossTotal)}</span>
        </div>
        {!isCompanyPatient &&  <div className="flex justify-between">
          <span>إجمالي الخصم:</span>
          <span className="font-semibold text-orange-600 ">
            -{formatNumber(summary.totalDiscountApplied)}
          </span>
        </div>}
        {isCompanyPatient && summary.totalEnduranceApplied > 0 && (
          <div className="flex justify-between">
            <span>إجمالي تعاون الشركة:</span>
            <span className="font-semibold text-blue-600 ">
              -{formatNumber(summary.netTotalAfterDiscountsAndEndurance)}
            </span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between font-medium">
          <span>صافي المبلغ المستحق على المريض:</span>
          <span className="font-semibold">{formatNumber(summary.totalEnduranceApplied)}</span>
        </div>
        <div className="flex justify-between">
          <span>إجمالي المبلغ المدفوع من المريض:</span>
          <span className="font-semibold text-green-600 ">
            {formatNumber(summary.totalActuallyPaidByPatient)}
          </span>
        </div>
        <Separator className="my-2" />
        <div className={`flex justify-between font-bold text-md ${summary.totalEnduranceApplied > 0.009 ? 'text-red-600 ' : 'text-green-600 '}`}>
          <span>رصيد المريض المستحق:</span>
          <span>{formatNumber(summary.patientBalanceDue)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestedServicesSummary;