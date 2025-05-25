// src/components/clinic/ActivePatientCard.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Patient } from '@/types/patients';
import type { ActivePatientVisit } from '@/types/patients';
import { updateDoctorVisitStatus } from '@/services/visitService';

const VISIT_STATUSES_FOR_DROPDOWN = ['waiting', 'with_doctor', 'lab_pending', 'imaging_pending', 'payment_pending', 'completed', 'cancelled', 'no_show'] as const;
type VisitStatus = typeof VISIT_STATUSES_FOR_DROPDOWN[number];

interface PaginatedActivePatientVisitsResponse {
  data: ActivePatientVisit[];
  total: number;
  page: number;
  limit: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface ActivePatientCardProps {
  visit: ActivePatientVisit & {
    doctor_shift_id?: number;
  };
  isSelected: boolean;
  onSelect: (patient: Patient, visitId: number) => void;
  onProfileClick: (patientId: number) => void;
  selectedPatientVisitIdInWorkspace: number | null;
}

const ActivePatientCard: React.FC<ActivePatientCardProps> = ({ 
    visit, 
    isSelected, 
    onSelect, 
    onProfileClick,
    selectedPatientVisitIdInWorkspace
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const queryClient = useQueryClient();

  const statusUpdateMutation = useMutation({
    mutationFn: (params: { visitId: number; status: VisitStatus }) => 
        updateDoctorVisitStatus(params.visitId, params.status),
    onSuccess: (updatedVisitData, variables) => {
        toast.success(t('clinic:visit.statusUpdateSuccess'));
        
        queryClient.setQueryData(
            ['activePatients', visit.doctor_shift_id],
            (oldData: PaginatedActivePatientVisitsResponse | undefined) => {
                if (!oldData?.data) return oldData;
                return {
                    ...oldData,
                    data: oldData.data.map((v: ActivePatientVisit) => 
                        v.id === variables.visitId ? { ...v, ...updatedVisitData } : v
                    ),
                };
            }
        );

        if (selectedPatientVisitIdInWorkspace === variables.visitId) {
            queryClient.invalidateQueries({ queryKey: ['doctorVisit', variables.visitId] });
        }
    },
    onError: (error: ApiError) => {
        toast.error(error.response?.data?.message || t('clinic:visit.statusUpdateFailed'));
    }
  });

  const handleStatusChange = (newStatus: VisitStatus) => {
    if (visit.status !== newStatus) {
        statusUpdateMutation.mutate({ visitId: visit.id, status: newStatus });
    }
  };

  const handleCardClick = () => {
    onSelect(visit.patient, visit.id);
  };

  const handleProfileButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onProfileClick(visit.patient.id);
  };
  
  const handleSelectInteraction = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <Card 
      className={cn(
          "hover:shadow-md transition-shadow cursor-pointer flex flex-row items-center px-2 py-0.5 h-[44px] min-h-[44px]",
          isSelected ? "ring-2 ring-primary shadow-md bg-primary/5 dark:bg-primary/10" : "bg-card ring-1 ring-transparent"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
    >
      <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full flex-shrink-0 ltr:mr-2 rtl:ml-2 p-0"
          onClick={handleProfileButtonClick}
          title={t('common:viewProfile')}
          aria-label={t('common:viewProfileFor', { name: visit.patient.name })}
      >
        <UserCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </Button>

      <div style={{flexBasis:'250px'}} className="flex-grow  min-w-0 ltr:mr-2 rtl:ml-2">
        <p className="text-sm font-medium  border" title={visit.patient.name}>
          {visit.patient.name}
        </p>
   
      </div>

      <div className="flex-shrink-0 w-[130px] relative">
        <Select
          value={visit.status}
          onValueChange={handleStatusChange}
          dir={i18n.dir()}
          disabled={statusUpdateMutation.isPending && statusUpdateMutation.variables?.visitId === visit.id}
        >
          <SelectTrigger 
            className="h-7 text-xs px-2 py-0 focus:ring-0 focus:ring-offset-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0 shadow-none bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted"
            aria-label={t('clinic:workspace.changeStatusFor', { name: visit.patient.name })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent onClick={handleSelectInteraction}>
            {VISIT_STATUSES_FOR_DROPDOWN.map(statusKey => (
              <SelectItem key={statusKey} value={statusKey} className="text-xs">
                {t(`clinic:workspace.status.${statusKey}`, statusKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusUpdateMutation.isPending && statusUpdateMutation.variables?.visitId === visit.id && 
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary opacity-50"/>
        }
      </div>
    </Card>
  );
};

export default ActivePatientCard;