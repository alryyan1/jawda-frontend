import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import type {
  AdmissionRequestedLabTestFormData,
} from '@/types/admissions';
import {
  addAdmissionLabTests,
} from '@/services/admissionLabTestService';
import { getMainTestsListForSelection } from '@/services/mainTestService';
import type { MainTestStripped } from '@/types/labTests';

interface AddAdmissionLabTestDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
}

export default function AddAdmissionLabTestDialog({
  open,
  onClose,
  admissionId,
}: AddAdmissionLabTestDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<MainTestStripped | null>(null);

  const { data: labTestsData, isLoading: isLoadingTests } = useQuery({
    queryKey: ['mainTestsList', 'forSelection'],
    queryFn: () => getMainTestsListForSelection({}),
  });
  const labTests = labTestsData || [];

  useEffect(() => {
    if (open) {
      setSelectedTest(null);
    }
  }, [open]);

  const addMutation = useMutation({
    mutationFn: (data: AdmissionRequestedLabTestFormData) =>
      addAdmissionLabTests(admissionId, data),
    onSuccess: () => {
      toast.success('تم إضافة الفحص بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionLabTests', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      setSelectedTest(null);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الفحص');
    },
  });

  const handleAdd = React.useCallback(() => {
    if (!selectedTest) {
      toast.error('يرجى اختيار فحص');
      return;
    }

    const formData: AdmissionRequestedLabTestFormData = {
      main_test_ids: [selectedTest.id],
      doctor_id: null,
    };
    addMutation.mutate(formData);
  }, [selectedTest, addMutation]);

  // Keyboard shortcut: Enter key to submit
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && open && selectedTest && !addMutation.isPending) {
        // Don't trigger if user is typing in an input field (except the autocomplete)
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' && target.getAttribute('role') !== 'combobox') {
          return;
        }
        event.preventDefault();
        handleAdd();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [open, selectedTest, addMutation.isPending, handleAdd]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إضافة فحص مختبر</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Autocomplete
            options={labTests || []}
            getOptionLabel={(option) => option.main_test_name || ''}
            value={selectedTest}
            onChange={(_, newValue) => {
              setSelectedTest(newValue);
            }}
            loading={isLoadingTests}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="اختر الفحص" 
                placeholder="ابحث عن فحص مختبر..." 
              />
            )}
            disabled={addMutation.isPending}
            noOptionsText="لا يوجد فحوصات"
          />
          {selectedTest && (
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  السعر:
                </Box>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {selectedTest.price ? `${selectedTest.price.toLocaleString()} د.أ` : '-'}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={addMutation.isPending}>
          إلغاء
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={addMutation.isPending || !selectedTest}
        >
          {addMutation.isPending ? (
            <CircularProgress size={20} />
          ) : (
            'إضافة'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

