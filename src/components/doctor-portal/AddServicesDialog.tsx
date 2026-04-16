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
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { Search, Stethoscope, X } from 'lucide-react';
import { getAvailableServicesForVisit, addServicesToVisit } from '@/services/visitService';
import type { Service } from '@/types/services';

interface AddServicesDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

const AddServicesDialog: React.FC<AddServicesDialogProps> = ({ open, onClose, visitId }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('all');

  // Fetch available services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['availableServices', visitId],
    queryFn: () => getAvailableServicesForVisit(visitId),
    enabled: open && !!visitId,
  });

  // Build group list
  const groups = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach(s => {
      const id = String(s.service_group_id);
      const name = s.service_group?.name ?? s.service_group_name ?? id;
      map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [services]);

  const filtered = useMemo(() => {
    let list = services;
    if (activeGroup !== 'all') {
      list = list.filter(s => String(s.service_group_id) === activeGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [services, activeGroup, search]);

  const mutation = useMutation({
    mutationFn: () => addServicesToVisit({ visitId, service_ids: selectedIds }),
    onSuccess: (added) => {
      toast.success(`تم إضافة ${added.length} خدمة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['doctorVisit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['availableServices', visitId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الخدمات'),
  });

  const handleClose = () => {
    setSearch('');
    setSelectedIds([]);
    setActiveGroup('all');
    onClose();
  };

  const toggleService = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Stethoscope size={20} />
        إضافة خدمات طبية
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

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="بحث باسم الخدمة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ mb: 1.5 }}
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

        {/* Group tabs */}
        {groups.length > 0 && (
          <Tabs
            value={activeGroup}
            onChange={(_, v) => setActiveGroup(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0.5 },
            }}
          >
            <Tab value="all" label={`الكل (${services.length})`} />
            {groups.map(g => (
              <Tab
                key={g.id}
                value={g.id}
                label={`${g.name} (${services.filter(s => String(s.service_group_id) === g.id).length})`}
              />
            ))}
          </Tabs>
        )}

        {/* Services grid */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
            <Typography>لا توجد خدمات متاحة</Typography>
          </Box>
        ) : (
          <Grid container spacing={1} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
            {filtered.map(svc => (
              <Grid item xs={12} sm={6} md={4} key={svc.id}>
                <Paper
                  onClick={() => toggleService(svc.id)}
                  elevation={0}
                  sx={{
                    p: 1.25,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderRadius: 1.5,
                    borderColor: isSelected(svc.id) ? 'primary.main' : 'divider',
                    bgcolor: isSelected(svc.id) ? 'primary.50' : 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.12s',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox
                    checked={isSelected(svc.id)}
                    size="small"
                    sx={{ p: 0 }}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleService(svc.id)}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={isSelected(svc.id) ? 600 : 400} noWrap sx={{ fontSize: '0.78rem' }}>
                      {svc.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {svc.price != null && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {svc.price} ر.ي
                        </Typography>
                      )}
                      {(svc.service_group?.name ?? svc.service_group_name) && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                          · {svc.service_group?.name ?? svc.service_group_name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
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

export default AddServicesDialog;
