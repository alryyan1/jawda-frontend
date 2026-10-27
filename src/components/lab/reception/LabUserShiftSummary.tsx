import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, Coins, Landmark, DollarSign, Wallet, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCurrentUserLabIncomeSummary, type LabUserShiftIncomeSummary } from '@/services/userService';
import { formatNumber } from '@/lib/utils';

interface LabUserShiftSummaryProps {
  /** When true, renders only the numbers block without the header/card container */
  compact?: boolean;
}

const METHOD_STYLES: Record<string, { icon: React.ElementType; textClass: string; iconClass: string }> = {
  cash: { icon: Coins, textClass: 'text-green-700', iconClass: 'text-green-600' },
  bank: { icon: Landmark, textClass: 'text-purple-700', iconClass: 'text-purple-600' },
  fawry: { icon: Smartphone, textClass: 'text-orange-700', iconClass: 'text-orange-600' },
  ocash: { icon: Smartphone, textClass: 'text-amber-700', iconClass: 'text-amber-600' },
};
const DEFAULT_METHOD_STYLE = { icon: Wallet, textClass: 'text-gray-700', iconClass: 'text-gray-600' };

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
          {labShiftSummary.payment_methods.map((method) => {
            const style = METHOD_STYLES[method.code] ?? DEFAULT_METHOD_STYLE;
            const Icon = style.icon;
            return (
              <div key={method.id} className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${style.iconClass}`} />
                  <span className="text-2xl text-gray-600">{method.name}</span>
                </div>
                <span className={`text-2xl font-medium ${style.textClass}`}>
                  {formatNumber(method.total)}
                </span>
              </div>
            );
          })}

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
