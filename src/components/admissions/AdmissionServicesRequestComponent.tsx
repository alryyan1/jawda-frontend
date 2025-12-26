// src/components/admissions/AdmissionServicesRequestComponent.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ServiceSelectionGrid from '@/components/clinic/ServiceSelectionGrid';
import { addAdmissionServices, getAdmissionServices } from '@/services/admissionServiceService';
import type { AdmissionRequestedService } from '@/types/admissions';
import type { ServiceGroupWithServices } from '@/types/services';
import type { Patient } from '@/types/patients';
import type { CompanyServiceContract } from '@/types/companies';
import { getServiceGroupsWithServices } from '@/services/serviceGroupService';
import { getPatientById } from '@/services/patientService';
import { getCompanyContractedServices } from '@/services/companyService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AdmissionServicesTable from './AdmissionServicesTable';
import { getServiceById } from '@/services/serviceService';
import { getFavoriteServiceGroups } from '@/lib/favoriteServiceGroups';
import type { Admission } from '@/types/admissions';
import { getAdmissionById } from '@/services/admissionService';

interface AdmissionServicesRequestComponentProps {
  admissionId: number;
  // When this counter increments, open the selection grid (triggered by parent)
  openSelectionGridCommand?: number;
  // When this counter increments, trigger adding currently selected in grid
  addSelectedCommand?: number;
  // Notify parent when selection count changes in the grid
  onSelectionCountChange?: (count: number) => void;
}

const AdmissionServicesRequestComponent: React.FC<AdmissionServicesRequestComponentProps> = ({ 
  admissionId, 
  openSelectionGridCommand = 0, 
  addSelectedCommand = 0, 
  onSelectionCountChange 
}) => {
  const queryClient = useQueryClient();
  const [showServiceSelectionGrid, setShowServiceSelectionGrid] = useState(false);
  
  // Stable callback declared unconditionally to keep hooks order fixed
  const handleSelectedIdsChange = useCallback((ids: number[]) => {
    onSelectionCountChange?.(ids.length);
  }, [onSelectionCountChange]);
  
  const requestedServicesQueryKey = ['admissionServices', admissionId] as const;
  
  // Fetch admission to get patient ID
  const { data: admission, isLoading: isLoadingAdmission } = useQuery<Admission>({
    queryKey: ['admission', admissionId],
    queryFn: () => getAdmissionById(admissionId),
    enabled: !!admissionId,
  });

  const patientId = admission?.patient_id;
  const patientDetailsQueryKey = ['patientDetailsForServiceSelection', patientId] as const;
  
  const { 
    data: requestedServices = [], 
    isLoading: isLoadingRequested, 
    isFetching: isFetchingRequested,
    error: requestedServicesError 
  } = useQuery<AdmissionRequestedService[], Error>({
    queryKey: requestedServicesQueryKey,
    queryFn: () => getAdmissionServices(admissionId),
    enabled: !!admissionId,
  });

  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
    queryKey: patientDetailsQueryKey,
    queryFn: () => getPatientById(patientId!),
    enabled: !!patientId,
  });

  const isCompanyPatient = !!patient?.company_id;

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
    mutationFn: (data: { service_ids: number[]; quantities?: { [key: number]: number } }) => 
      addAdmissionServices(admissionId, {
        service_ids: data.service_ids,
        quantities: data.quantities,
        doctor_id: null,
      }),
    onSuccess: (_, variables) => {
      toast.success(`تمت إضافة ${variables.service_ids.length} خدمة بنجاح!`);
      // After successful addition, invalidate queries and hide the grid
      queryClient.invalidateQueries({ 
        queryKey: requestedServicesQueryKey,
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['baseServiceCatalogForAll'],
        exact: true 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['admission', admissionId],
        exact: true 
      });
      setShowServiceSelectionGrid(false);
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'فشل في تنفيذ الطلب');
    }
  });

  const handleAddMultipleServices = (selectedServiceIds: number[]) => {
    if (selectedServiceIds.length > 0) {
      addMultipleServicesMutation.mutate({ service_ids: selectedServiceIds });
    }
  };

  // Handler for adding a single service by ID from the input field
  const handleAddSingleServiceById = async (serviceId: number): Promise<boolean> => {
    if (!serviceId) return false;

    // Check if service is already requested for this admission
    if (requestedServices.some(rs => rs.service_id === serviceId)) {
        toast.info(`الخدمة ${requestedServices.find(rs=>rs.service_id === serviceId)?.service?.name || `ID ${serviceId}`} مطلوبة بالفعل`);
        return false; // Indicate not added because it's a duplicate
    }
    
    try {
      // 1. Verify the service exists
      const serviceDetails = await getServiceById(serviceId).then(res => res.data);
      if (!serviceDetails) {
        toast.error(`لم يتم العثور على الخدمة بالمعرف ${serviceId}`);
        return false;
      }
      // 2. Add the single service using the existing mutation
      addMultipleServicesMutation.mutate({ service_ids: [serviceId] }); 
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
  if (isLoadingRequested || isLoadingCatalog || isLoadingAdmission || (patientId && isLoadingPatient) || (isCompanyPatient && showServiceSelectionGrid && isLoadingCompanyContracts)) {
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
        <div className="gap-1">
          <AdmissionServicesTable 
            admissionId={admissionId}
            requestedServices={requestedServices || []} 
            isLoading={isLoadingRequested || isFetchingRequested}
            onAddMoreServices={() => setShowServiceSelectionGrid(true)}
          />
        </div>
      )}
    </div>
  );
};

export default AdmissionServicesRequestComponent;

