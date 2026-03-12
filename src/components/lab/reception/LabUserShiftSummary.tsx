import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, Coins, Landmark, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCurrentUserLabIncomeSummary, type LabUserShiftIncomeSummary } from '@/services/userService';
import { formatNumber } from '@/lib/utils';

interface LabUserShiftSummaryProps {
  /** When true, renders only the numbers block without the header/card container */
  compact?: boolean;
}

const LabUserShiftSummary: React.FC<LabUserShiftSummaryProps> = ({ compact = false }) => {
  const { user, currentClinicShift } = useAuth();

  const { data: labShiftSummary, isLoading } = useQuery<LabUserShiftIncomeSummary>({
    queryKey: ['labUserShiftIncomeSummary', user?.id, currentClinicShift?.id],
    queryFn: () => fetchCurrentUserLabIncomeSummary(currentClinicShift!.id),
    enabled: !!currentClinicShift && !!user,
  });

  const Numbers = (
    <>
      {labShiftSummary ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-green-600" />
              <span className="text-2xl text-gray-600">كاش</span>
            </div>
            <span className="text-2xl font-medium text-green-700">
              {formatNumber(labShiftSummary.total_cash)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Landmark className="h-3 w-3 text-purple-600" />
              <span className="text-2xl text-gray-600">بنكك</span>
            </div>
            <span className="text-2xl font-medium text-purple-700">
              {formatNumber(labShiftSummary.total_bank)}
            </span>
          </div>

          {(Number(labShiftSummary.total_cash_refund) > 0 || Number(labShiftSummary.total_bank_refund) > 0) && (
            <>
              <div className="border-t border-orange-200 pt-2 mt-2">
                <span className="text-sm font-medium text-orange-700">الاستردادات</span>
              </div>
              {Number(labShiftSummary.total_cash_refund) > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-orange-600" />
                    <span className="text-lg text-gray-600">استرداد كاش</span>
                  </div>
                  <span className="text-lg font-medium text-orange-700">
                    {formatNumber(labShiftSummary.total_cash_refund)}
                  </span>
                </div>
              )}
              {Number(labShiftSummary.total_bank_refund) > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Landmark className="h-3 w-3 text-orange-600" />
                    <span className="text-lg text-gray-600">استرداد بنك</span>
                  </div>
                  <span className="text-lg font-medium text-orange-700">
                    {formatNumber(labShiftSummary.total_bank_refund)}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="border-t border-blue-200 pt-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-blue-600" />
                <span className="text-2xl font-semibold text-blue-800">الإجمالي</span>
              </div>
              <span className="text-2xl font-bold text-blue-800">
                {formatNumber(labShiftSummary.total_lab_income)}
              </span>
            </div>
            {(() => {
              const cashRefund = Number(labShiftSummary.total_cash_refund) || 0;
              const bankRefund = Number(labShiftSummary.total_bank_refund) || 0;
              const totalRefund = cashRefund + bankRefund;
              const netTotal = labShiftSummary.total_lab_income - totalRefund;
              return (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-100">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <span className="text-xl font-semibold text-emerald-800">الصافي</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-800">
                    {formatNumber(netTotal)}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      ) : !isLoading ? (
        <div className="text-center py-2">
          <span className="text-2xl text-gray-500">لا توجد بيانات</span>
        </div>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <div className="w-60 mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-2">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800"> حسابات المستخدم</span>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </div>
          {Numbers}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-lg border border-gray-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-base font-semibold text-blue-800">ملخص دخل المختبر</span>
          </div>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        </div>
        {Numbers}
      </div>
    </div>
  );
};

export default LabUserShiftSummary;


