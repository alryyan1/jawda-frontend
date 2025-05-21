// src/components/clinic/RequestedServicesTable.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RequestedService } from '@/types/services';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, DollarSign, PlusCircle, Edit, XCircle, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { removeRequestedServiceFromVisit, updateRequestedServiceDetails } from '@/services/visitService';
import { Card } from '../ui/card';
import ServicePaymentDialog from './ServicePaymentDialog';
// import { updateRequestedServiceDetails, removeRequestedServiceFromVisit } from '@/services/visitService'; // You'll need update endpoint

interface RequestedServicesTableProps {
  visitId: number;
  requestedServices: RequestedService[];
  isLoading: boolean;
  currentClinicShiftId: number | null; // Needed for payments
  onAddMoreServices: () => void; // To show the ServiceSelectionGrid again
}

// Mock update function - replace with actual service
const updateRequestedService = async (params: {visitId: number, rsId: number, data: Partial<Pick<RequestedService, 'count' | 'discount_per'>>}) => {
    console.log("Updating RS:", params);
    updateRequestedServiceDetails(params.visitId, params.rsId, params.data);
    await new Promise(r => setTimeout(r, 500));
    // Return the updated RequestedService from backend
    return { ...params.data, id: params.rsId, price: 50, amount_paid:0, is_paid:false } as RequestedService;
};


const RequestedServicesTable: React.FC<RequestedServicesTableProps> = ({ 
    visitId, requestedServices, isLoading, currentClinicShiftId, onAddMoreServices 
}) => {
  const { t, i18n } = useTranslation(['services', 'common']);
  const queryClient = useQueryClient();
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ count?: number; discount_per?: number }>({});
  const [payingService, setPayingService] = useState<RequestedService | null>(null);
  // For inline editing of a single row's data (count, discount_per)
  const [currentEditData, setCurrentEditData] = useState<{ count: number; discount_per: number }>({ count: 1, discount_per: 0 });

  const updateMutation = useMutation({
    mutationFn: (data: {rsId: number, payload: Partial<Pick<RequestedService, 'count' | 'discount_per'>>}) => 
        updateRequestedService({visitId, rsId: data.rsId, data: data.payload}), // Replace with actual service
    onSuccess: () => {
        toast.success(t('common:updatedSuccess'));
        queryClient.invalidateQueries({ queryKey: ['requestedServicesForVisit', visitId] });
        setEditingRowId(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.updateFailed'))
  });

  // removeServiceMutation (from previous version of SelectedPatientWorkspace, can be reused here)
 const removeMutation = useMutation({
    mutationFn: (requestedServiceId: number) => removeRequestedServiceFromVisit(visitId, requestedServiceId),
    onSuccess: () => {
        toast.success(t('services:removedSuccess'));
        queryClient.invalidateQueries({ queryKey: ['requestedServicesForVisit', visitId] });
        queryClient.invalidateQueries({ queryKey: ['availableServicesForVisit', visitId] }); // Make service available again
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.requestFailed'))
  });
 const handleCancelEdit = () => setEditingRowId(null);
  const handleEdit = (rs: RequestedService) => {
    setEditingRowId(rs.id);
    setCurrentEditData({ count: rs.count || 1, discount_per: rs.discount_per || 0 });
  };

  const handleSaveEdit = (rsId: number) => {
    if (currentEditData.count < 1) {
        toast.error(t('services:validation.countMinOne'));
        return;
    }
    // Here, you decide if 'discount' (fixed amount) or 'discount_per' is primary.
    // If discount_per is primary, clear fixed discount if percentage is > 0, or vice-versa.
    // For simplicity, let's assume they can coexist or only one is typically used.
    // The backend should handle the final calculation.
    updateMutation.mutate({ rsId, payload: currentEditData });
  };
  
  const handleRemoveService = (rsId: number) => {
      if (window.confirm(t('common:confirmDeleteMessage', { item: t('services:serviceEntityName', "Service") }))) {
        removeMutation.mutate(rsId);
      }
  };


  const discountOptions = Array.from({ length: 11 }, (_, i) => i * 10); // 0% to 100%

  return (
    <div className="space-y-3">
        <div className="flex justify-end">
            <Button onClick={onAddMoreServices} variant="outline" size="sm">
                <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> {t('services:addMoreServices')}
            </Button>
        </div>
        {isLoading && <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {!isLoading && requestedServices.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('services:noServicesRequestedYet')}</p>
        )}
        {requestedServices.length > 0 && (
       <Card>
          <Table style={{direction:i18n.dir()}} className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>{t('services:table.serviceName')}</TableHead>
                <TableHead className="text-center w-[70px]">{t('services:table.price')}</TableHead>
                <TableHead className="text-center w-[90px]">{t('services:table.count')}</TableHead>
                <TableHead className="text-center w-[130px]">{t('services:table.discountPercentage')}</TableHead>
                <TableHead className="text-center w-[90px]">{t('services:table.totalItemPrice')}</TableHead>
                <TableHead className="text-center w-[90px]">{t('services:table.amountPaid')}</TableHead>
                <TableHead className="text-center w-[90px]">{t('services:table.balance')}</TableHead>
                <TableHead className="text-right w-[100px]">{t('common:actions.openMenu')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestedServices.map(rs => {
                const isEditingThisRow = editingRowId === rs.id;
                
                // Calculations for display (ensure these are robust)
                const price = Number(rs.price) || 0;
                const count = isEditingThisRow ? currentEditData.count : (Number(rs.count) || 1);
                const discountPer = isEditingThisRow ? currentEditData.discount_per : (Number(rs.discount_per) || 0);
                // Assuming rs.discount is the fixed discount amount from backend.
                // For simplicity in inline edit, we're only editing discount_per.
                // A more complex inline edit could handle fixed discount too.
                
                const subTotal = price * count;
                const discountAmountFromPercentage = (subTotal * discountPer) / 100;
                const totalDiscountAmount = discountAmountFromPercentage + (Number(rs.discount) || 0); // Sum if both exist
                const netPrice = subTotal - totalDiscountAmount;
                const amountPaid = Number(rs.amount_paid) || 0;
                const balance = netPrice - amountPaid;

                return (
                  <TableRow key={rs.id} className={isEditingThisRow ? "bg-muted/30 dark:bg-muted/20" : ""}>
                    <TableCell className="py-2 font-medium">
                      {rs.service?.name || t('common:unknownService')}
                      {rs.service?.service_group?.name && <span className="block text-muted-foreground text-[10px]">({rs.service.service_group.name})</span>}
                    </TableCell>
                    <TableCell className="text-center py-2">{price.toFixed(2)}</TableCell>
                    <TableCell className="text-center py-2">
                      {isEditingThisRow ? (
                        <Input type="number" min="1" value={currentEditData.count} 
                               onChange={e => setCurrentEditData(d => ({...d, count: parseInt(e.target.value) || 1}))} 
                               className="h-7 w-16 mx-auto text-xs px-1"/>
                      ) : count }
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {isEditingThisRow ? (
                        <Select value={String(currentEditData.discount_per)} onValueChange={val => setCurrentEditData(d => ({...d, discount_per: parseInt(val)}))} dir={i18n.dir()}>
                          <SelectTrigger className="h-7 w-24 mx-auto text-xs px-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {discountOptions.map(opt => <SelectItem key={opt} value={String(opt)}>{opt}%</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : `${discountPer}%` }
                    </TableCell>
                    <TableCell className="text-center py-2 font-semibold">{netPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center py-2 text-green-600 dark:text-green-500">{amountPaid.toFixed(2)}</TableCell>
                    <TableCell className={`text-center py-2 font-semibold ${balance > 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                        {balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {isEditingThisRow ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(rs.id)} disabled={updateMutation.isPending && updateMutation.variables?.rsId === rs.id} className="h-7 w-7">
                            {updateMutation.isPending && updateMutation.variables?.rsId === rs.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4 text-green-600"/>}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7"><XCircle className="h-4 w-4 text-slate-500"/></Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          {balance > 0 && !rs.done && ( // Only show pay if balance > 0 and not done
                            <Button size="lg" variant="outline" onClick={() => setPayingService(rs)} className="h-7 px-1.5 text-green-600 border-green-500 hover:bg-green-500/10">
                              <DollarSign className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1"/>{t('common:pay')}
                            </Button>
                          )}
                          {!rs.is_paid && !rs.done && ( // Can edit/delete if not paid and not done
                            <>
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(rs)} className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                              <Button size="icon" variant="ghost" onClick={() => handleRemoveService(rs.id)} disabled={removeMutation.isPending && removeMutation.variables === rs.id} className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        )}
        {payingService && currentClinicShiftId && (
            <ServicePaymentDialog
                isOpen={!!payingService}
                onOpenChange={(open) => !open && setPayingService(null)}
                requestedService={payingService}
                visitId={visitId}
                currentClinicShiftId={currentClinicShiftId}
                onPaymentSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['requestedServicesForVisit', visitId] });
                    setPayingService(null);
                }}
            />
        )}
    </div>
  );
};
export default RequestedServicesTable;