// src/components/clinic/ServicesRequestComponent.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ServiceSelectionGrid from './ServiceSelectionGrid';
import { getRequestedServicesForVisit, addServicesToVisit } from '@/services/visitService';
import type { RequestedService, ServiceGroupWithServices } from '@/types/services';
import type { Patient } from '@/types/patients';
import type { CompanyServiceContract } from '@/types/companies';
import type { DoctorVisit } from '@/types/visits';
import { getServiceGroupsWithServices } from '@/services/serviceGroupService';
import { getPatientById } from '@/services/patientService';
import { getCompanyContractedServices } from '@/services/companyService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import RequestedServicesTable from './RequestedServicesTable';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceById } from '@/services/serviceService';
import { getFavoriteServiceGroups } from '@/lib/favoriteServiceGroups';

interface ServicesRequestComponentProps {
  visitId: number;
  patientId: number;
  visit: DoctorVisit; // Make this required since child components need it
  handlePrintReceipt: () => void;
  // When this counter increments, open the selection grid (triggered by parent)
  openSelectionGridCommand?: number;
  // When this counter increments, trigger adding currently selected in grid
  addSelectedCommand?: number;
  // Notify parent when selection count changes in the grid
  onSelectionCountChange?: (count: number) => void;
}

const ServicesRequestComponent: React.FC<ServicesRequestComponentProps> = ({ visitId, patientId, visit, handlePrintReceipt, openSelectionGridCommand = 0, addSelectedCommand = 0, onSelectionCountChange }) => {
  // Using Arabic directly
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  const [showServiceSelectionGrid, setShowServiceSelectionGrid] = useState(visit?.requested_services?.length === 0);
  // We don't persist selected IDs here; only notify parent about count
  // Stable callback declared unconditionally to keep hooks order fixed
  const handleSelectedIdsChange = useCallback((ids: number[]) => {
    onSelectionCountChange?.(ids.length);
  }, [onSelectionCountChange]);
  const requestedServicesQueryKey = ['requestedServicesForVisit', visitId] as const;
  const patientDetailsQueryKey = ['patientDetailsForServiceSelection', patientId] as const;
  
  const { 
    data: requestedServices = [], 
    isLoading: isLoadingRequested, 
    isFetching: isFetchingRequested,
    error: requestedServicesError 
  } = useQuery<RequestedService[], Error>({
    queryKey: requestedServicesQueryKey,
    queryFn: () => getRequestedServicesForVisit(visitId),
  });

  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
    queryKey: patientDetailsQueryKey,
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId,
  });

  const isCompanyPatient = !!patient?.company_id;

  // Remove the automatic showing of grid when no services
  // Let it be controlled only by user action and successful additions


  // Get favorite service groups from localStorage and listen for changes
  const [favoriteGroupIds, setFavoriteGroupIds] = React.useState<number[]>(() => getFavoriteServiceGroups());
  
  React.useEffect(() => {
    const handleFavoriteChange = () => {
      setFavoriteGroupIds(getFavoriteServiceGroups());
    };
    
    window.addEventListener('favoriteServiceGroupsChanged', handleFavoriteChange);
    return () => {
      window.removeEventListener('favoriteServiceGroupsChanged', handleFavoriteChange);
    };
  }, []);

  // Fetch all service groups with their services (standard catalog)
  const { 
    data: baseServiceCatalog, 
    isLoading: isLoadingCatalog,
    error: catalogError
  } = useQuery<ServiceGroupWithServices[], Error>({
    queryKey: ['baseServiceCatalogForAll'],
    queryFn: async () => {
      const res = await getServiceGroupsWithServices(undefined);
      return res as unknown as ServiceGroupWithServices[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Filter baseServiceCatalog based on favorite groups if any are selected
  const filteredBaseServiceCatalog = React.useMemo<ServiceGroupWithServices[] | undefined>(() => {
    if (!baseServiceCatalog) return undefined;
    
    // If no favorites are selected, return all groups
    if (favoriteGroupIds.length === 0) {
      return baseServiceCatalog;
    }
    
    // Filter to only include favorite groups
    return baseServiceCatalog.filter((group) => favoriteGroupIds.includes(group.id));
  }, [baseServiceCatalog, favoriteGroupIds]);
  
  console.log('baseServiceCatalog', baseServiceCatalog);
  console.log('filteredBaseServiceCatalog', filteredBaseServiceCatalog);
  
  // Fetch company-specific contracted services if it's a company patient
  const { data: companyContracts, isLoading: isLoadingCompanyContracts } = useQuery<CompanyServiceContract[], Error>({
    queryKey: ['companyContractedServicesForSelection', patient?.company_id],
    queryFn: () => getCompanyContractedServices(patient!.company_id!, 0, { search: '' }).then(res => res.data),
    enabled: isCompanyPatient && !!patient?.company_id && showServiceSelectionGrid,
  });

  const serviceCatalogForGrid = useMemo<ServiceGroupWithServices[] | undefined>(() => {
    // Use filtered catalog if favorites are set, otherwise use base catalog
    const catalogToUse = filteredBaseServiceCatalog ?? baseServiceCatalog;
    if (!catalogToUse) return [];
    if (isCompanyPatient && companyContracts) {
      const contractMap = new Map<number, CompanyServiceContract>();
      companyContracts.forEach(contract => {
        contractMap.set((contract as CompanyServiceContract).service_id, contract);
      });

      return (catalogToUse as ServiceGroupWithServices[]).map((group: ServiceGroupWithServices) => ({
        ...group,
        services: group.services.map((service) => {
          const contractDetails = contractMap.get((service as unknown as { id: number }).id);
          if (contractDetails) {
            return {
              ...service,
              contract_price: parseFloat(String(contractDetails.price)),
              contract_requires_approval: Boolean(contractDetails.approval),
            };
          }
          return service;
        }),
      })).filter(group => group.services.length > 0);
    }
    return catalogToUse;
  }, [filteredBaseServiceCatalog, baseServiceCatalog, isCompanyPatient, companyContracts]);


  const addMultipleServicesMutation = useMutation({
    mutationFn: (serviceIds: number[]) => addServicesToVisit({ visitId, service_ids: serviceIds }),
    onSuccess: (_, serviceIds) => {
      toast.success(`تمت إضافة ${serviceIds.length} خدمة بنجاح!`);
      // After successful addition, invalidate queries and hide the grid
      queryClient.invalidateQueries({ 
        queryKey: requestedServicesQueryKey,
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['baseServiceCatalogForAll'],
        exact: true 
      });
      setShowServiceSelectionGrid(false);
      // selection is managed within the grid; no local state to clear
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      // toast.error(apiError.response?.data?.message || 'فشل في تنفيذ الطلب');
    }
  });

  const handleAddMultipleServices = (selectedServiceIds: number[]) => {
    if (selectedServiceIds.length > 0) {
      addMultipleServicesMutation.mutate(selectedServiceIds);
    }
  };
   // NEW: Handler for adding a single service by ID from the input field
  const handleAddSingleServiceById = async (serviceId: number): Promise<boolean> => {
    if (!serviceId) return false;

    // Check if service is already requested for this visit
    if (requestedServices.some(rs => rs.service_id === serviceId)) {
        toast.info(`الخدمة ${requestedServices.find(rs=>rs.service_id === serviceId)?.service?.name || `ID ${serviceId}`} مطلوبة بالفعل`);
        return false; // Indicate not added because it's a duplicate
    }
    
    try {
      // 1. Verify the service exists (optional, backend will also do this)
      //    The getServiceById might not be strictly necessary if addServicesToVisit handles non-existent IDs gracefully,
      //    but it's good for immediate feedback.
      const serviceDetails = await getServiceById(serviceId).then(res => res.data);
      if (!serviceDetails) {
        toast.error(`لم يتم العثور على الخدمة بالمعرف ${serviceId}`);
        return false;
      }
      // 2. Add the single service using the existing mutation
      // addMultipleServicesMutation expects an array
      addMultipleServicesMutation.mutate([serviceId]); 
      // The mutation's onSuccess will handle toast, invalidation, and hiding the grid
      return true; // Indicate success
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('فشل في جلب الخدمة', {
        description: err.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error'),
      });
      return false;
    }
  };
  
  // Open the selection grid when parent triggers a new command value
  React.useEffect(() => {
    if (openSelectionGridCommand > 0) {
      setShowServiceSelectionGrid(true);
    }
  }, [openSelectionGridCommand]);

  // Add-selected is handled inside ServiceSelectionGrid to avoid double triggering here
  if (isLoadingRequested || isLoadingCatalog || (patientId && isLoadingPatient) || (isCompanyPatient && showServiceSelectionGrid && isLoadingCompanyContracts)) {
    return <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const errorToShow = requestedServicesError || catalogError || (patientId && !patient && !isLoadingPatient ? new Error('فشل تحميل بيانات المريض') : null);
  if (errorToShow) {
    return <div className="p-4 text-center text-sm text-destructive">فشل في التحميل: {errorToShow.message}</div>;
  }
 
  return (
    <div className="space-y-4">
      {showServiceSelectionGrid && serviceCatalogForGrid ? (
        <ServiceSelectionGrid 
            onAddSingleServiceById={handleAddSingleServiceById}
            serviceCatalog={serviceCatalogForGrid}
            onAddServices={handleAddMultipleServices}
            isLoading={addMultipleServicesMutation.isPending}
            onCancel={() => setShowServiceSelectionGrid(false)}
            onSelectedIdsChange={handleSelectedIdsChange}
            externalAddSelectedCommand={addSelectedCommand}
        />
      ) : (
        <div className=" gap-1 ">
          <RequestedServicesTable 
            visitId={visitId}
            handlePrintReceipt={handlePrintReceipt}
            visit={visit}
            requestedServices={requestedServices || []} 
            isLoading={isLoadingRequested || isFetchingRequested}
            currentClinicShiftId={currentClinicShift?.id ?? null}
            onAddMoreServices={() => setShowServiceSelectionGrid(true)}
          />
          {/* <RequestedServicesSummary
            requestedServices={requestedServices || []}
            visit={visit}
            className="max-w-sm ml-auto mr-auto sm:mr-0 sm:ml-auto"
          /> */}
        </div>
      )}
    </div>
  );
};

export default ServicesRequestComponent;