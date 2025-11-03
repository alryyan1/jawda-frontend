// src/components/clinic/patients/ServicesDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogTitle, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getDoctorVisitById } from '@/services/visitService';
import SelectedPatientWorkspace from '@/components/clinic/SelectedPatientWorkspace';
import type { DoctorVisit } from '@/types/visits';
import type { Patient } from '@/types/patients';
import { CircularProgress } from '@mui/material';

interface ServicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: number;
}

const ServicesDialog: React.FC<ServicesDialogProps> = ({
  isOpen,
  onOpenChange,
  visitId,
}) => {
  const { data: visit, isLoading: isLoadingVisit } = useQuery<DoctorVisit>({
    queryKey: ['doctorVisit', visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: isOpen && !!visitId,
  });

  return (
    <Dialog
      open={isOpen}
      onClose={() => onOpenChange(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>تفاصيل الزيارة #{visitId}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
        {(isLoadingVisit) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : visit ? (
          <Box sx={{ height: '100%', display: 'flex' }}>
            <SelectedPatientWorkspace
              selectedPatientVisit={visit}
              initialPatient={visit.patient as Patient}
              visitId={visitId}
              onClose={() => onOpenChange(false)}
              onActiveTabChange={() => {}}
            />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            لا توجد بيانات
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServicesDialog;

