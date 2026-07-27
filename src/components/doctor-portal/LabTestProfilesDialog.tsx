import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { Layers, Save, Trash2 } from 'lucide-react';

import {
  getMyLabTestProfiles,
  createLabTestProfile,
  deleteLabTestProfile,
} from '@/services/doctorLabTestProfileService';
import type { MainTestStripped } from '@/types/labTests';
import type { DoctorLabTestProfile } from '@/types/doctorLabProfiles';

interface LabTestProfilesDialogProps {
  open: boolean;
  onClose: () => void;
  /** The parent's current test selection — used both to save it as a new profile and to highlight already-selected profiles. */
  selectedTests: MainTestStripped[];
  /** Merges a clicked profile's tests into the parent's selection (dialog stays open so multiple profiles can be combined). */
  onApplyProfile: (tests: MainTestStripped[]) => void;
}

const LabTestProfilesDialog: React.FC<LabTestProfilesDialogProps> = ({ open, onClose, selectedTests, onApplyProfile }) => {
  const queryClient = useQueryClient();
  const [newProfileName, setNewProfileName] = useState('');

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<DoctorLabTestProfile[]>({
    queryKey: ['doctorLabTestProfiles'],
    queryFn: getMyLabTestProfiles,
    enabled: open,
  });

  const selectedIds = useMemo(() => new Set(selectedTests.map(t => t.id)), [selectedTests]);

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      createLabTestProfile({
        name: newProfileName.trim(),
        main_test_ids: selectedTests.map(t => t.id),
      }),
    onSuccess: () => {
      toast.success('تم حفظ المجموعة بنجاح');
      setNewProfileName('');
      queryClient.invalidateQueries({ queryKey: ['doctorLabTestProfiles'] });
    },
    onError: () => toast.error('فشل حفظ المجموعة'),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: number) => deleteLabTestProfile(profileId),
    onSuccess: () => {
      toast.success('تم حذف المجموعة');
      queryClient.invalidateQueries({ queryKey: ['doctorLabTestProfiles'] });
    },
    onError: () => toast.error('فشل حذف المجموعة'),
  });

  const handleApply = (profile: DoctorLabTestProfile) => {
    onApplyProfile(profile.main_tests);
    toast.success(`تمت إضافة فحوصات "${profile.name}" إلى التحديد`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Layers size={18} />
        المجموعات المحفوظة
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {selectedTests.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              placeholder="احفظ التحديد الحالي كمجموعة جديدة..."
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={saveProfileMutation.isPending ? <CircularProgress size={14} /> : <Save size={14} />}
              disabled={!newProfileName.trim() || saveProfileMutation.isPending}
              onClick={() => saveProfileMutation.mutate()}
              sx={{ whiteSpace: 'nowrap' }}
            >
              حفظ
            </Button>
          </Box>
        )}

        {isLoadingProfiles ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : profiles.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
            <Typography>لا توجد مجموعات محفوظة بعد — حدد بعض الفحوصات ثم احفظها كمجموعة.</Typography>
          </Box>
        ) : (
          <Grid container spacing={1} sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.5 }}>
            {profiles.map(profile => {
              const allSelected = profile.main_tests.every(t => selectedIds.has(t.id));
              return (
                <Grid item xs={12} sm={6} key={profile.id}>
                  <Paper
                    onClick={() => handleApply(profile)}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderRadius: 1.5,
                      borderColor: allSelected ? 'primary.main' : 'divider',
                      bgcolor: allSelected ? 'primary.50' : 'background.paper',
                      transition: 'all 0.12s',
                      '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                        {profile.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          deleteProfileMutation.mutate(profile.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {profile.main_tests.slice(0, 4).map(t => (
                        <Chip key={t.id} label={t.main_test_name} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                      ))}
                      {profile.main_tests.length > 4 && (
                        <Chip
                          label={`+${profile.main_tests.length - 4}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.62rem' }}
                        />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>تم</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabTestProfilesDialog;
