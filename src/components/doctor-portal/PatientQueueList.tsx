import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { Search, Users } from 'lucide-react';
import type { ActivePatientVisit } from '@/types/patients';
import PatientQueueCard from './PatientQueueCard';

interface PatientQueueListProps {
  patients: ActivePatientVisit[];
  isLoading: boolean;
  selectedVisitId: number | null;
  onSelectPatient: (visit: ActivePatientVisit) => void;
}

type FilterTab = 'all' | 'waiting' | 'with_doctor' | 'completed';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',         label: 'الكل' },
  { value: 'waiting',     label: 'انتظار' },
  { value: 'with_doctor', label: 'مع الطبيب' },
  { value: 'completed',   label: 'مكتملة' },
];

const PatientQueueList: React.FC<PatientQueueListProps> = ({
  patients,
  isLoading,
  selectedVisitId,
  onSelectPatient,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = patients;
    if (activeTab !== 'all') {
      list = list.filter(p => p.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.patient.name.toLowerCase().includes(q) ||
        (p.patient.phone ?? '').includes(q)
      );
    }
    return list;
  }, [patients, activeTab, search]);

  const countFor = (tab: FilterTab) =>
    tab === 'all' ? patients.length : patients.filter(p => p.status === tab).length;

  return (
    <Box
      sx={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Search */}
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={14} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
        />
      </Box>

      {/* Status tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as FilterTab)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', py: 0.5, px: 1 },
        }}
      >
        {TABS.map(t => (
          <Tab
            key={t.value}
            value={t.value}
            label={`${t.label} (${countFor(t.value)})`}
          />
        ))}
      </Tabs>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 6,
              gap: 1,
              color: 'text.disabled',
            }}
          >
            <Users size={36} />
            <Typography variant="body2" color="text.disabled" textAlign="center">
              {search ? 'لا توجد نتائج' : 'لا يوجد مرضى'}
            </Typography>
          </Box>
        ) : (
          filtered.map(visit => (
            <PatientQueueCard
              key={visit.id}
              visit={visit}
              isSelected={selectedVisitId === visit.id}
              onSelect={onSelectPatient}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default PatientQueueList;
