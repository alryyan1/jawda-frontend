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
import { updateDoctorVisitStatus } from '@/services/visitService';

const VISIT_STATUSES_FOR_DROPDOWN = ['waiting', 'with_doctor', 'lab_pending', 'imaging_pending', 'payment_pending', 'completed', 'cancelled', 'no_show'] as const;
type VisitStatus = typeof VISIT_STATUSES_FOR_DROPDOWN[number];

interface ActivePatientVisit {
  id: number;
  status: VisitStatus;
  patient: Patient;
  doctor?: {
    name: string;
  };
  queue_number?: number;
  number?: number;
}

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

const getStatusColor = (status: VisitStatus): string => {
  switch (status) {
    case 'waiting':
      return 'bg-amber-500';
    case 'with_doctor':
      return 'bg-blue-500';
    case 'lab_pending':
    case 'imaging_pending':
      return 'bg-purple-500';
    case 'payment_pending':
      return 'bg-orange-500';
    case 'completed':
      return 'bg-green-500';
    case 'cancelled':
    case 'no_show':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
  }
};

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
        
        // Update all active patients queries that might contain this visit
        queryClient.setQueriesData(
            { queryKey: ['activePatients'] },
            (oldData: PaginatedActivePatientVisitsResponse | undefined) => {
                if (!oldData?.data) return oldData;
                return {
                    ...oldData,
                    data: oldData.data.map((v: ActivePatientVisit) => 
                        v.id === variables.visitId 
                            ? { ...v, status: variables.status } 
                            : v
                    ),
                };
            }
        );

        // Invalidate all active patients queries to ensure data consistency
        queryClient.invalidateQueries({ 
            queryKey: ['activePatients']
        });

        // If this visit is selected in workspace, update its data too
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

  const queueNumberOrVisitId = visit.number 

  return (
    <Card 
      className={cn(
          "hover:shadow-lg transition-shadow cursor-pointer flex flex-row items-center px-2.5 py-1.5 min-h-[48px]",
          isSelected ? "ring-2 ring-primary shadow-lg bg-primary/10 dark:bg-primary/20" : "bg-card ring-1 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-700"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
      aria-selected={isSelected}
      aria-label={`${t('common:select')} ${visit.patient.name}, ${t('common:queueNumberShort')}${queueNumberOrVisitId}`}
    >
      {/* Part 1: Profile Icon/Button */}
      <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full flex-shrink-0 ltr:mr-2 rtl:ml-2 p-0"
          onClick={handleProfileButtonClick}
          title={t('common:viewProfile')}
          aria-label={t('common:viewProfileFor', { name: visit.patient.name })}
      >
        <UserCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
      </Button>

      {/* Part 2: Queue Number Square */}
      <div 
        className={cn(
            "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-white text-xs sm:text-sm font-bold ltr:mr-2 rtl:ml-2 shadow",
            getStatusColor(visit.status)
        )}
        title={`${t('common:queueNumber')}: ${queueNumberOrVisitId}`}
      >
        {queueNumberOrVisitId}
      </div>

      {/* Part 3: Patient Name (takes available space) */}
      <div className="flex-grow min-w-0 ltr:mr-2 rtl:ml-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight" title={visit.patient.name}>
          {visit.patient.name}
        </p>
        <div className="flex-shrink-0 w-[120px] sm:w-[130px] relative">
          <Select
            value={visit.status}
            onValueChange={handleStatusChange}
            dir={i18n.dir()}
            disabled={statusUpdateMutation.isPending && statusUpdateMutation.variables?.visitId === visit.id}
          >
            <SelectTrigger 
              className={cn(
                  "h-7 text-xs px-1.5 sm:px-2 py-0 focus:ring-0 focus:ring-offset-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0 shadow-none bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted",
                  visit.status === 'waiting' && 'text-amber-700 dark:text-amber-500',
                  visit.status === 'with_doctor' && 'text-blue-700 dark:text-blue-500',
                  visit.status === 'completed' && 'text-green-700 dark:text-green-500',
                  (visit.status === 'cancelled' || visit.status === 'no_show') && 'text-red-700 dark:text-red-500',
              )}
              aria-label={t('clinic:workspace.changeStatusFor', { name: visit.patient.name })}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
              {VISIT_STATUSES_FOR_DROPDOWN.map(statusKey => (
                <SelectItem key={statusKey} value={statusKey} className="text-xs">
                  {t(`clinic:workspace.status.${statusKey}`, statusKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusUpdateMutation.isPending && statusUpdateMutation.variables?.visitId === visit.id && 
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary"/>
              </div>
          }
        </div>
      </div>
    </Card>
  );
};

export default ActivePatientCard;