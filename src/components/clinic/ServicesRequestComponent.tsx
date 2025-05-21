// src/components/clinic/ServicesRequestComponent.tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// ... other imports (toast, Loader2, types, services)

import ServiceSelectionGrid from './ServiceSelectionGrid';
import { Button } from '@/components/ui/button';
import { getRequestedServicesForVisit, addServicesToVisit } from '@/services/visitService';
import type { RequestedService, ServiceGroupWithServices } from '@/types/services'; // Or types/visits
import { getServiceGroupsWithServices } from '@/services/serviceGroupService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import i18n from '@/i18n';
import RequestedServicesTable from './RequestedServicesTable';


interface ServicesRequestComponentProps {
  patientId: number;
  visitId: number;
}

const ServicesRequestComponent: React.FC<ServicesRequestComponentProps> = ({ patientId, visitId }) => {
  const { t } = useTranslation(['clinic', 'services', 'common']);
  const queryClient = useQueryClient();

  const requestedServicesQueryKey = ['requestedServicesForVisit', visitId];
  const serviceCatalogQueryKey = ['serviceGroupsWithServices', visitId]; // visitId to potentially filter available

  const [showServiceSelectionGrid, setShowServiceSelectionGrid] = useState(false); // Control visibility

  const { 
    isFetching,
    data: requestedServices, 
    isLoading: isLoadingRequested, 
    error: requestedServicesError 
  } = useQuery<RequestedService[], Error>({
    queryKey: requestedServicesQueryKey,
    queryFn: () => getRequestedServicesForVisit(visitId),
    // onSuccess: (data) => {
    //     // Show grid only if no services are requested yet, or if user explicitly wants to add more from grid
    //     if (data && data.length === 0 && !showServiceSelectionGrid) {
    //         setShowServiceSelectionGrid(true);
    //     } else if (data && data.length > 0 && showServiceSelectionGrid) {
    //         // If services were added and grid was shown, hide grid to show table
    //         // This logic might need refinement based on UX preference
    //         // setShowServiceSelectionGrid(false); 
    //     }
    // }
  });

  // Fetch catalog for the selection grid (all groups and their services)
  // This is fetched regardless, but ServiceSelectionGrid will use it when visible
  const { 
    data: serviceCatalog, 
    isLoading: isLoadingCatalog,
    error: catalogError
  } = useQuery<ServiceGroupWithServices[], Error>({
    queryKey: serviceCatalogQueryKey,
    queryFn: () => getServiceGroupsWithServices(visitId), // Pass visitId if backend filters available services
  });

  const addMultipleServicesMutation = useMutation({
    mutationFn: (serviceIds: number[]) => addServicesToVisit({ visitId, service_ids: serviceIds }),
    onSuccess: () => {
      toast.success(t('clinic:services.multipleAddedSuccess', "Selected services added successfully!"));
      queryClient.invalidateQueries({ queryKey: requestedServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: serviceCatalogQueryKey }); // If available services change
      setShowServiceSelectionGrid(false); // Hide grid after adding
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.requestFailed'));
    }
  });

  const handleAddMultipleServices = (selectedServiceIds: number[]) => {
    if (selectedServiceIds.length > 0) {
      addMultipleServicesMutation.mutate(selectedServiceIds);
    }
  };
  
  // Calculate Summary
  const summary = useMemo(() => {
    if (!requestedServices) return { totalAmount: 0, totalPaid: 0, totalDiscount: 0, amountLeft: 0 };
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDiscount = 0;

    requestedServices.forEach(rs => {
        const pricePerItem = Number(rs.price) || 0;
        const count = Number(rs.count) || 1;
        const itemSubTotal = pricePerItem * count;
        
        totalAmount += itemSubTotal;
        totalPaid += Number(rs.amount_paid) || 0;
        
        // Calculate discount amount: can be from fixed or percentage
        let itemDiscountAmount = Number(rs.discount) || 0; // Fixed discount amount
        if (rs.discount_per && rs.discount_per > 0) { // Percentage discount
            itemDiscountAmount += (itemSubTotal * (Number(rs.discount_per) / 100));
        }
        totalDiscount += itemDiscountAmount;
    });
    const amountLeft = totalAmount - totalDiscount - totalPaid;
    return { totalAmount, totalPaid, totalDiscount, amountLeft };
  }, [requestedServices]);


  if (isLoadingRequested || isLoadingCatalog) {
    return <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (requestedServicesError || catalogError) {
    return <div className="p-4 text-center text-sm text-destructive">{t('common:error.loadFailed')}</div>;
  }

  return (
    <div style={{direction:i18n.dir()}} className="space-y-4">
      {/* Conditional rendering of Service Selection Grid or Requested Services Table */}
      {showServiceSelectionGrid && serviceCatalog ? (
        <ServiceSelectionGrid 
            serviceCatalog={serviceCatalog}
            onAddServices={handleAddMultipleServices}
            isLoading={addMultipleServicesMutation.isPending}
            onCancel={() => setShowServiceSelectionGrid(false)} // Button in grid to go back to table
        />
      ) : (
        <>
          <RequestedServicesTable 
            visitId={visitId}
            requestedServices={requestedServices || []} 
            isLoading={isLoadingRequested || isFetching} // isFetching from useQuery can be used
            currentClinicShiftId={1} // TODO: Get current actual clinic shift ID
            onAddMoreServices={() => setShowServiceSelectionGrid(true)} // Button to re-open grid
          />
          {/* Summary Section */}
          {requestedServices && requestedServices.length > 0 && (
            <Card style={{direction:i18n.dir(),maxWidth:'300px'}} className="mt-4">
              <CardHeader><CardTitle className="text-md">{t('common:summary')}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span>{t('common:totalAmount')}:</span> <span className="font-semibold">{summary.totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{t('common:totalDiscount')}:</span> <span className="font-semibold text-orange-600">-{summary.totalDiscount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{t('common:totalPaid')}:</span> <span className="font-semibold text-green-600">{summary.totalPaid.toFixed(2)}</span></div>
                <Separator className="my-1"/>
                <div className="flex justify-between font-bold text-md"><span>{t('common:amountLeft')}:</span> <span>{summary.amountLeft.toFixed(2)}</span></div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ServicesRequestComponent;