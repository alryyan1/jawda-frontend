import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import { Search, FlaskConical, X } from 'lucide-react';
import { getAvailableLabTestsForVisit, addLabTestsToVisit } from '@/services/labRequestService';
import type { MainTestStripped } from '@/types/labTests';

interface AddLabTestsDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

const AddLabTestsDialog: React.FC<AddLabTestsDialogProps> = ({ open, onClose, visitId }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comment, setComment] = useState('');

  // Fetch available tests
  const { data: tests = [], isLoading } = useQuery<MainTestStripped[]>({
    queryKey: ['availableLabTests', visitId],
    queryFn: () => getAvailableLabTestsForVisit(visitId),
    enabled: open && !!visitId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return tests;
    const q = search.toLowerCase();
    return tests.filter(t => t.main_test_name.toLowerCase().includes(q));
  }, [tests, search]);

  const mutation = useMutation({
    mutationFn: () => addLabTestsToVisit({ visitId, main_test_ids: selectedIds, comment: comment || undefined }),
    onSuccess: (added) => {
      toast.success(`تم إضافة ${added.length} فحص بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['doctorVisit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['availableLabTests', visitId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الفحوصات'),
  });

  const handleClose = () => {
    setSearch('');
    setSelectedIds([]);
    setComment('');
    onClose();
  };

  const toggleTest = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <FlaskConical size={20} />
        إضافة فحوصات مختبرية
        <Box sx={{ flex: 1 }} />
        {selectedIds.length > 0 && (
          <Chip
            label={`${selectedIds.length} محدد`}
            color="primary"
            size="small"
            onDelete={() => setSelectedIds([])}
          />
        )}
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="بحث باسم الفحص..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><Search size={16} /></InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Tests grid */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
            <Typography>لا توجد فحوصات متاحة</Typography>
          </Box>
        ) : (
          <Grid container spacing={1} sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
            {filtered.map(test => (
              <Grid item xs={12} sm={6} md={4} key={test.id}>
                <Paper
                  onClick={() => toggleTest(test.id)}
                  elevation={0}
                  sx={{
                    p: 1.25,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderRadius: 1.5,
                    borderColor: isSelected(test.id) ? 'primary.main' : 'divider',
                    bgcolor: isSelected(test.id) ? 'primary.50' : 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.12s',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox
                    checked={isSelected(test.id)}
                    size="small"
                    sx={{ p: 0 }}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleTest(test.id)}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={isSelected(test.id) ? 600 : 400} noWrap sx={{ fontSize: '0.78rem' }}>
                      {test.main_test_name}
                    </Typography>
                    {test.price != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {test.price} ر.ي
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Comment field */}
        <TextField
          fullWidth
          size="small"
          label="ملاحظة (اختياري)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          sx={{ mt: 2 }}
          multiline
          rows={2}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} color="inherit">إلغاء</Button>
        <Button
          variant="contained"
          disabled={selectedIds.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          إضافة {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLabTestsDialog;
