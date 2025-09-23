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
import RequestedServicesSummary from './RequestedServicesSummary';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceById } from '@/services/serviceService';

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
  const [selectedIdsInGrid, setSelectedIdsInGrid] = useState<number[]>([]);
  // Stable callback declared unconditionally to keep hooks order fixed
  const handleSelectedIdsChange = useCallback((ids: number[]) => {
    setSelectedIdsInGrid(ids);
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


  // Fetch all service groups with their services (standard catalog)
  const { 
    data: baseServiceCatalog, 
    isLoading: isLoadingCatalog,
    error: catalogError
  } = useQuery<ServiceGroupWithServices[], Error>({
    queryKey: ['baseServiceCatalogForAll'], // General catalog
    queryFn: () => getServiceGroupsWithServices(undefined), // Fetch all, no visitId filter here
    staleTime: 1000 * 60 * 10, // Cache for 10 mins
  });
  
  // Fetch company-specific contracted services if it's a company patient
  const { data: companyContracts, isLoading: isLoadingCompanyContracts } = useQuery<CompanyServiceContract[], Error>({
    queryKey: ['companyContractedServicesForSelection', patient?.company_id],
    queryFn: () => getCompanyContractedServices(patient!.company_id!, 0, { search: '' }).then(res => res.data),
    enabled: isCompanyPatient && !!patient?.company_id && showServiceSelectionGrid,
  });

  const serviceCatalogForGrid = useMemo(() => {
    if (!baseServiceCatalog) return [];
    if (isCompanyPatient && companyContracts) {
      const contractMap = new Map<number, CompanyServiceContract>();
      companyContracts.forEach(contract => {
        contractMap.set(contract.company_id, contract);
      });

      return baseServiceCatalog.map(group => ({
        ...group,
        services: group.services.map(service => {
          const contractDetails = contractMap.get(service.id);
          if (contractDetails) {
            return {
              ...service,
              contract_price: parseFloat(contractDetails.price),
              contract_requires_approval: contractDetails.approval,
            };
          }
          return service;
        }),
      })).filter(group => group.services.length > 0);
    }
    return baseServiceCatalog;
  }, [baseServiceCatalog, isCompanyPatient, companyContracts]);


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
      setSelectedIdsInGrid([]);
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'فشل في تنفيذ الطلب');
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
    } catch (error: any) {
      toast.error('فشل في جلب الخدمة', {
        description: error.response?.data?.message || error.message,
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

  // If parent requests to add selected
  // Avoid re-triggering on same command value
  const lastAddCmdRef = React.useRef(0);
  React.useEffect(() => {
    if (
      addSelectedCommand > 0 &&
      addSelectedCommand !== lastAddCmdRef.current &&
      showServiceSelectionGrid &&
      selectedIdsInGrid.length > 0
    ) {
      lastAddCmdRef.current = addSelectedCommand;
      addMultipleServicesMutation.mutate(selectedIdsInGrid);
    }
  }, [addSelectedCommand, showServiceSelectionGrid, selectedIdsInGrid]);
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
            isCompanyPatient={isCompanyPatient} // Pass this down
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