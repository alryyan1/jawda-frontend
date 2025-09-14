// src/components/clinic/UserShiftIncomeDialog.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle as UICardTitle } from '@/components/ui/card'; // Renamed CardTitle
import { Loader2, DollarSign, Landmark, Coins, TrendingDown, WalletCards, FlaskConical, Handshake, ArrowLeftRight } from 'lucide-react'; // Added icons
import { fetchCurrentUserShiftIncomeSummary } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
// lab
// : 
// {total: 35000, bank: 0, cash: 35000}
// bank
// : 
// 0
// cash
// : 
// 35000
// total
// : 
// 35000
// net_bank
// : 
// 0
// net_cash
// : 
// 40000
// shift_id
// : 
// 463
// total_bank
// : 
// 0
// total_cash
// : 
// 40000
// total_income
// : 
// 40000
// user_id
// : 
// 16
// user_name
// : 
// "Super Administrator"
// Updated Type to match new backend response structure
interface UserShiftIncomeDetails {
  user_id: number;
  user_name: string;
  shift_id: number;
  lab_income: { total: number; cash: number; bank: number; };
  service_income: { total: number; cash: number; bank: number; };
  expenses: { total_cash_expenses: number; total_bank_expenses: number; };
  total: number;
  total_cash: number;
  total_bank: number;
  net_cash: number;
  net_bank: number;
  net_overall: number;
}

interface UserShiftIncomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentClinicShiftId: number | null;
}

const DetailRow: React.FC<{ label: string; value?: string | number | null; icon?: React.ElementType; unit?: string, valueClass?: string, labelClass?: string }> =
({ label, value, icon: Icon, unit, valueClass, labelClass }) => (
 <div className="flex justify-between items-center py-1.5">
     <div className={cn("flex items-center text-xs text-muted-foreground", labelClass)}>
         {Icon && <Icon className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5 opacity-80" />}
         <span>{label}:</span>
     </div>
     <span className={cn("text-xs font-semibold", valueClass)}>
         {value === null || value === undefined ? '-' : value}
         {unit && <span className="text-[10px] text-muted-foreground ltr:ml-0.5 rtl:mr-0.5">{unit}</span>}
     </span>
 </div>
);

const IncomeSectionCard: React.FC<{ title: string; icon: React.ElementType; data: { total: number; cash: number; bank: number; }; currencySymbol: string }> = 
({ title, icon: Icon, data, currencySymbol }) => {
    // Using Arabic directly
    return (
        <Card className="flex-1 min-w-[200px] bg-slate-50  shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3">
                <UICardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary ">
                    <Icon className="h-4 w-4" /> {title}
                </UICardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-1">
                <DetailRow label="إجمالي الدخل" value={formatNumber(data?.total)} unit={currencySymbol} valueClass="text-green-600 "/>
                <DetailRow label="نقداً" value={formatNumber(data.cash)} unit={currencySymbol} icon={Coins} />
                <DetailRow label="بنك" value={formatNumber(data.bank)} unit={currencySymbol} icon={Landmark} />
            </CardContent>
        </Card>
    );
};


const UserShiftIncomeDialog: React.FC<UserShiftIncomeDialogProps> = ({ isOpen, onOpenChange, currentClinicShiftId }) => {
  // Using Arabic directly
  const { user } = useAuth();
  const currencySymbol = "ج.س";

  const queryKey = ['userShiftIncomeSummary', user?.id, currentClinicShiftId];

  const { data: summary, isLoading, error, isFetching } = useQuery<UserShiftIncomeDetails, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!currentClinicShiftId) throw new Error("Active clinic shift ID is required.");
      // Assuming fetchCurrentUserShiftIncomeSummary service now returns { data: UserShiftIncomeDetails }
      return fetchCurrentUserShiftIncomeSummary(currentClinicShiftId).then(res => res as unknown as UserShiftIncomeDetails);
    },
    enabled: isOpen && !!user && !!currentClinicShiftId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl"> {/* Wider dialog */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletCards className="h-6 w-6 text-primary"/>
            ملخص الدخل للمستخدم: {user?.name || '...'}
          </DialogTitle>
          <DialogDescription>
            تفاصيل الإيرادات الخاصة بالدوام #{currentClinicShiftId || 'غير محدد'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="py-4 space-y-4">
           {(isLoading || (isFetching && !summary)) && (
              <div className="flex-grow flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ltr:ml-2 rtl:mr-2 text-muted-foreground">جارٍ تحميل الملخص...</p>
              </div>
            )}
            {error && (
              <div className="flex-grow flex items-center justify-center py-10">
                <p className="ltr:ml-2 rtl:mr-2 text-muted-foreground">حدث خطأ في تحميل البيانات</p>
              </div>
            )}
            
            {summary && !isLoading && (
              <>
                {/* Lab and Services Income Sections */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <IncomeSectionCard 
                      title="إيرادات المختبر" 
                      icon={FlaskConical} 
                      data={summary?.lab_income}
                      currencySymbol={currencySymbol}
                  />
                  <IncomeSectionCard 
                      title="إيرادات الخدمات" 
                      icon={Handshake} // Or BriefcaseMedical
                      data={summary?.service_income}
                      currencySymbol={currencySymbol}
                  />
                </div>
                
                {/* Expenses Section (if applicable) */}
                {(summary?.expenses.total_cash_expenses > 0 || summary?.expenses.total_bank_expenses > 0) && (
                   <Card className="bg-red-50  border-red-200 ">
                      <CardHeader className="pb-2 pt-3">
                          <UICardTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-700 ">
                              <TrendingDown className="h-4 w-4"/> المصروفات
                          </UICardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 pt-1">
                          <DetailRow label="المصروفات النقدية" value={formatNumber(summary?.expenses.total_cash_expenses)} unit={currencySymbol} icon={Coins}/>
                          <DetailRow label="المصروفات البنكية" value={formatNumber(summary?.expenses.total_bank_expenses)} unit={currencySymbol} icon={Landmark}/>
                      </CardContent>
                   </Card>
                )}

                {/* Grand Totals Section */}
                <Card className="mt-3 bg-green-50  border-green-200 ">
                  <CardHeader className="pb-2 pt-3">
                      <UICardTitle className="text-sm font-semibold flex items-center gap-1.5 text-green-700 ">
                         <DollarSign className="h-4 w-4"/> إجمالي الإيرادات
                      </UICardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-1">
                      <DetailRow label="إجمالي الدخل" value={formatNumber(summary?.total)} unit={currencySymbol} valueClass="font-bold"/>
                      <DetailRow label="إجمالي النقد المحصل" value={formatNumber(summary?.total_cash)} unit={currencySymbol} icon={Coins}/>
                      <DetailRow label="إجمالي التحصيل البنكي" value={formatNumber(summary?.total_bank)} unit={currencySymbol} icon={Landmark}/>
                    
                      <Separator className="my-2 bg-green-200 "/>
                      <DetailRow label="صافي التدفق النقدي" value={formatNumber(summary?.net_cash)} unit={currencySymbol} valueClass="font-bold text-lg" icon={ArrowLeftRight}/>
                      <DetailRow label="صافي التدفق البنكي" value={formatNumber(summary?.net_bank)} unit={currencySymbol} valueClass="font-bold text-lg" icon={ArrowLeftRight}/>
                      <Separator className="my-2 bg-green-200 "/>
                      <DetailRow label="إجمالي التدفق الكلي" value={formatNumber(summary?.net_cash + summary?.net_bank)} unit={currencySymbol} valueClass="font-extrabold text-xl text-green-600 "/>
                  </CardContent>
                </Card>
              </>
            )}
            {!summary && !isLoading && !isFetching && !error && ( /* No data message */ <div className="flex-grow flex items-center justify-center py-10">
                <p className="ltr:ml-2 rtl:mr-2 text-muted-foreground">لا توجد بيانات دخل لهذه الوردية حتى الآن.</p>
              </div>)}
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">إغلاق</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserShiftIncomeDialog;