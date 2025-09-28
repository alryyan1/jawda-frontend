import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUserShiftIncomeSummary } from '@/services/userService';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  // Coins, 
  // Landmark, 
  // DollarSign, 
  TrendingUp, 
  Loader2,
  // Calculator,
  Receipt,
  // CreditCard,
  // Banknote
} from 'lucide-react';
// import { cn } from '@/lib/utils';

interface ClinicFinancialSummaryProps {
  currentClinicShiftId: number | null;
}

const ClinicFinancialSummary: React.FC<ClinicFinancialSummaryProps> = ({ 
  currentClinicShiftId 
}) => {
  const { user } = useAuth();

  // Fetch services income summary
  const { 
    data: servicesShiftSummary, 
    isLoading: isLoadingServicesSummary 
  } = useQuery({
    queryKey: ['userShiftIncomeSummary', currentClinicShiftId, user?.id],
    queryFn: () => fetchCurrentUserShiftIncomeSummary(currentClinicShiftId!, user?.id!),
    enabled: !!currentClinicShiftId && !!user?.id,
  });

  // Fetch lab income summary (if available)
  const { 
    data: labShiftSummary, 
    isLoading: isLoadingLabSummary 
  } = useQuery({
    queryKey: ['labShiftIncomeSummary', currentClinicShiftId, user?.id],
    queryFn: () => fetchCurrentUserShiftIncomeSummary(currentClinicShiftId!, user?.id!),
    enabled: !!currentClinicShiftId && !!user?.id,
  });

  const totalServicesIncome = servicesShiftSummary?.service_income?.total || 0;
  const totalLabIncome = labShiftSummary?.lab_income?.total || 0;
  const totalIncome = totalServicesIncome + totalLabIncome;

  const totalCash = (servicesShiftSummary?.service_income?.cash || 0) + (labShiftSummary?.lab_income?.cash || 0);
  const totalBank = (servicesShiftSummary?.service_income?.bank || 0) + (labShiftSummary?.lab_income?.bank || 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
  

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Income */}
        <div className=" rounded-xl border text-center  p-6">
            <span className="text-sm font-medium ">إجمالي الإيرادات</span>
          <div className="text-2xl font-bold ">
            {formatNumber(totalIncome)}
          </div>
          <div className="text-xs  mt-1"> </div>
        </div>

        {/* Cash Payments */}
        <div className="rounded-xl border text-center  p-6">
            <span className="text-sm font-medium ">المدفوعات النقدية</span>
          <div className="text-2xl font-bold ">
            {formatNumber(totalCash)}
          </div>
          <div className="text-xs  mt-1"> </div>
        </div>

        {/* Bank Payments */}
        <div className="rounded-xl border text-center  p-6">
           
            <span className="text-sm font-medium ">المدفوعات بنكك</span>
          <div className="text-2xl font-bold ">
            {formatNumber(totalBank)}
          </div>
          <div className="text-xs  mt-1"> </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Income */}
        <div className="bg-white rounded-xl border text-center  p-6">
          <div className="text-center">
            <div className="p-2 rounded-lg">
              {/* <Receipt className="h-5 w-5 " /> */}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">إيرادات الخدمات</h3>
            {isLoadingServicesSummary && (
              <Loader2 className="h-4 w-4 animate-spin " />
            )}
          </div>

          {servicesShiftSummary ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b ">
                <div className="flex items-center gap-2">
                  {/* <Coins className="h-4 w-4 text-green-600" /> */}
                  <span className="text-sm ">نقدي</span>
                </div>
                <span className="text-lg font-semibold ">
                  {formatNumber(servicesShiftSummary.service_income.cash)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b ">
                <div className="flex items-center gap-2">
                  {/* <Landmark className="h-4 w-4 text-purple-600" /> */}
                  <span className="text-sm ">بنكك</span>
                </div>
                <span className="text-lg font-semibold ">
                  {formatNumber(servicesShiftSummary.service_income.bank)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3  rounded-lg px-3">
                <div className="flex items-center gap-2">
                  {/* <DollarSign className="h-4 w-4 " /> */}
                  <span className="text-sm font-semibold ">المجموع</span>
                </div>
                <span className="text-xl font-bold ">
                  {formatNumber(servicesShiftSummary.service_income.total)}
                </span>
              </div>
            </div>
          ) : !isLoadingServicesSummary ? (
            <div className="text-center py-8">
              <span className="text-sm ">لا توجد بيانات للخدمات</span>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin  mx-auto" />
              <span className="text-sm  mt-2 block">جاري التحميل...</span>
            </div>
          )}
        </div>

        {/* Lab Income */}
        <div className="bg-white rounded-xl border  p-6">
          <div className="text-center ">
            <div className="p-2  rounded-lg">
              {/* <Receipt className="h-5 w-5 " /> */}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">إيرادات المختبر</h3>
            {isLoadingLabSummary && (
              <Loader2 className="h-4 w-4 animate-spin " />
            )}
          </div>

          {labShiftSummary ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b ">
                <div className="flex items-center gap-2">
                  {/* <Coins className="h-4 w-4 text-green-600" /> */}
                  <span className="text-sm ">نقدي</span>
                </div>
                <span className="text-lg font-semibold ">
                  {formatNumber(labShiftSummary.lab_income.cash)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b ">
                <div className="flex items-center gap-2">
                  {/* <Landmark className="h-4 w-4 text-purple-600" /> */}
                  <span className="text-sm ">بنكك</span>
                </div>
                <span className="text-lg font-semibold ">
                  {formatNumber(labShiftSummary.lab_income.bank)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3  rounded-lg px-3">
                <div className="flex items-center gap-2">
                  {/* <DollarSign className="h-4 w-4 " /> */}
                  <span className="text-sm font-semibold ">المجموع</span>
                </div>
                <span className="text-xl font-bold ">
                  {formatNumber(labShiftSummary.lab_income.total)}
                </span>
              </div>
            </div>
          ) : !isLoadingLabSummary ? (
            <div className="text-center py-8">
              <span className="text-sm ">لا توجد بيانات للمختبر</span>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin  mx-auto" />
              <span className="text-sm  mt-2 block">جاري التحميل...</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border  p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2  rounded-lg">
              {/* <Calculator className="h-5 w-5 " /> */}
            </div>
            <div>
              <h4 className="text-lg font-semibold ">إجمالي الوردية</h4>
              <p className="text-sm ">جميع الإيرادات والمدفوعات</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold ">
              {formatNumber(totalIncome)}
            </div>
            <div className="text-sm "> </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicFinancialSummary;
