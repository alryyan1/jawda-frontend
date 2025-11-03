// src/components/clinic/patients/LabRequestsDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogTitle, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getDoctorVisitById } from '@/services/visitService';
import LabRequestsColumn from '@/components/lab/reception/LabRequestsColumn';
import type { DoctorVisit } from '@/types/visits';
import { CircularProgress } from '@mui/material';

interface LabRequestsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: number;
}

const LabRequestsDialog: React.FC<LabRequestsDialogProps> = ({
  isOpen,
  onOpenChange,
  visitId,
}) => {
  const { data: visit, isLoading } = useQuery<DoctorVisit>({
    queryKey: ['doctorVisit', visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: isOpen && !!visitId,
  });

  const handlePrintReceipt = () => {
    // Print receipt functionality - implement as needed
    console.log('Print receipt');
  };

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
      <DialogTitle>طلبات المختبر - زيارة #{visitId}</DialogTitle>
      <DialogContent sx={{ p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : visit ? (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <LabRequestsColumn
              activeVisitId={visitId}
              visit={visit}
              isLoading={isLoading}
              onPrintReceipt={handlePrintReceipt}
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

export default LabRequestsDialog;

