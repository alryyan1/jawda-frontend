// src/components/clinic/ServicesRequestComponent.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Service, RequestedService } from '@/types/services'; // Your types
import { 
    getAvailableServicesForVisit, 
    addServicesToVisit,
    getRequestedServicesForVisit, // To display already added services
    removeRequestedServiceFromVisit
} from '@/services/visitService'; 
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Label } from '../ui/label';

interface ServicesRequestComponentProps {
  patientId: number; // May not be directly needed if visitId is primary key for actions
  visitId: number;   // This is the DoctorVisit ID
}

const ServicesRequestComponent: React.FC<ServicesRequestComponentProps> = ({ patientId, visitId }) => {
  const { t, i18n } = useTranslation(['clinic', 'services', 'common']);
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();

  const availableServicesQueryKey = ['availableServicesForVisit', visitId];
  const requestedServicesQueryKey = ['requestedServicesForVisit', visitId];

  const { data: availableServices, isLoading: isLoadingServices, error: availableServicesError } = useQuery<Service[], Error>({
    queryKey: availableServicesQueryKey,
    queryFn: () => getAvailableServicesForVisit(visitId),
  });

  const { data: requestedServices, isLoading: isLoadingRequested, error: requestedServicesError } = useQuery<RequestedService[], Error>({
    queryKey: requestedServicesQueryKey,
    queryFn: () => getRequestedServicesForVisit(visitId),
  });

  const addServiceMutation = useMutation({
    mutationFn: (serviceIdToAdd: number) => addServicesToVisit({ visitId, service_ids: [serviceIdToAdd] }),
    onSuccess: () => {
      toast.success(t('clinic:services.addedSuccess'));
      setSelectedServiceId(undefined); // Clear selection
      queryClient.invalidateQueries({ queryKey: requestedServicesQueryKey });
      queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.requestFailed'));
    }
  });

  const removeServiceMutation = useMutation({
    mutationFn: (requestedServiceId: number) => removeRequestedServiceFromVisit(visitId, requestedServiceId),
    onSuccess: () => {
        toast.success(t('clinic:services.removedSuccess'));
        queryClient.invalidateQueries({ queryKey: requestedServicesQueryKey });
        queryClient.invalidateQueries({ queryKey: availableServicesQueryKey });
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.message || t('common:error.requestFailed'));
    }
  });

  const handleAddService = () => {
    if (selectedServiceId) {
      addServiceMutation.mutate(parseInt(selectedServiceId));
    }
  };

  const handleRemoveService = (requestedServiceId: number) => {
    // Add confirmation dialog if needed
    removeServiceMutation.mutate(requestedServiceId);
  };

  return (
    <div className="space-y-4">
      {/* Add Service Section */}
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="service-select" className="text-xs font-medium">{t('services:selectService')}</Label>
          <Select 
            value={selectedServiceId} 
            onValueChange={setSelectedServiceId} 
            disabled={isLoadingServices || addServiceMutation.isPending}
            dir={i18n.dir()}
          >
            <SelectTrigger id="service-select">
              <SelectValue placeholder={t('services:selectServicePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingServices && <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
              {availableServicesError && <div className="p-2 text-center text-xs text-destructive">{t('common:error.loadFailed')}</div>}
              {availableServices?.map(service => (
                <SelectItem key={service.id} value={String(service.id)}>
                  {service.name} ({t('common:price')}: {Number(service.price).toFixed(2)})
                  {service.service_group?.name && <span className="text-xs text-muted-foreground ltr:ml-2 rtl:mr-2">({service.service_group.name})</span>}
                </SelectItem>
              ))}
              {(!availableServices || availableServices.length === 0) && !isLoadingServices && !availableServicesError &&
                <div className="p-2 text-center text-sm text-muted-foreground">{t('services:noAvailableServices')}</div>}
            </SelectContent>
          </Select>
        </div>
        <Button 
            onClick={handleAddService} 
            disabled={!selectedServiceId || addServiceMutation.isPending || isLoadingServices} 
            size="icon"
            aria-label={t('common:add')}
        >
          {addServiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      {/* Requested Services List Section */}
      <div className="mt-4 pt-3">
        <h4 className="text-sm font-semibold mb-2">{t('services:requestedServicesTitle')}</h4>
        {isLoadingRequested && <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {requestedServicesError && <div className="p-2 text-center text-xs text-destructive">{t('common:error.loadFailed')}</div>}
        
        {!isLoadingRequested && !requestedServicesError && (!requestedServices || requestedServices.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">{t('services:noServicesRequestedYet')}</p>
        )}

        {requestedServices && requestedServices.length > 0 && (
          <ScrollArea className="h-auto max-h-[250px] border rounded-md"> {/* Max height for scroll */}
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('services:table.serviceName')}</TableHead>
                  <TableHead className="text-center">{t('services:table.price')}</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">{t('services:table.statusShort')}</TableHead>
                  <TableHead className="text-right">{/* Actions */}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedServices.map(rs => (
                  <TableRow key={rs.id}>
                    <TableCell>
                        {rs.service?.name || t('common:unknownService')}
                        {rs.service?.service_group?.name && <span className="block text-muted-foreground text-[10px]">({rs.service.service_group.name})</span>}
                    </TableCell>
                    <TableCell className="text-center">{Number(rs.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant={rs.done ? "success" : (rs.is_paid ? "default" : "outline")}>
                            {rs.done ? t('services:status.done') : (rs.is_paid ? t('services:status.paid') : t('services:status.pending'))}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!rs.is_paid && !rs.done && ( // Only allow removal if not paid and not done
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveService(rs.id)}
                            disabled={removeServiceMutation.isPending && removeServiceMutation.variables === rs.id}
                            aria-label={t('common:remove')}
                        >
                          {removeServiceMutation.isPending && removeServiceMutation.variables === rs.id 
                            ? <Loader2 className="h-3 w-3 animate-spin"/> 
                            : <Trash2 className="h-3 w-3" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
export default ServicesRequestComponent;