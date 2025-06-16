// src/components/lab/workstation/OrganismPanel.tsx (New or converted from .jsx)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Tabs, Box, CircularProgress, Typography } from '@mui/material'; // MUI components
import { AddCircleOutline as AddIcon, Save as SaveIcon, Delete as DeleteIcon } from '@mui/icons-material'; // MUI Icons
import { toast } from 'sonner';

import type { LabRequest, RequestedOrganism } from '@/types/Patient'; // Assuming these types are now in a central place
// import CodeEditor from '../doctor/CodeMirror'; // Your CodeEditor component
import { TextField } from '@mui/material'; // Fallback for simple text input

// --- Backend Service Stubs (You'll need to implement these) ---
// In a real app, these would be in a service file.
const fetchOrganismsForLabRequest = async (labRequestId: number): Promise<RequestedOrganism[]> => {
    // const response = await axiosClient.get(`/labrequests/${labRequestId}/organisms`);
    // return response.data.data;
    // MOCKUP:
    const existingOrganisms = (labRequestDataFromParent as LabRequest).requested_organisms || [];
    return Promise.resolve(existingOrganisms);
};
const createOrganism = async (payload: { lab_request_id: number; organism: string; sensitive?: string; resistant?: string }): Promise<RequestedOrganism> => {
    // const response = await axiosClient.post(`/labrequests/${payload.lab_request_id}/organisms`, payload);
    // return response.data.data;
    // MOCKUP:
    return Promise.resolve({ id: Date.now(), lab_request_id: payload.lab_request_id, organism: payload.organism, sensitive: payload.sensitive || '', resistant: payload.resistant || '' });
};
const updateOrganism = async (organismId: number, payload: Partial<RequestedOrganism>): Promise<RequestedOrganism> => {
    // const response = await axiosClient.patch(`/requested-organisms/${organismId}`, payload);
    // return response.data.data;
     // MOCKUP:
    const existing = labRequestDataFromParent.requested_organisms?.find(o => o.id === organismId);
    return Promise.resolve({ ...existing, ...payload, id: organismId } as RequestedOrganism);
};
const deleteOrganism = async (organismId: number): Promise<void> => {
    // await axiosClient.delete(`/requested-organisms/${organismId}`);
    // MOCKUP:
    return Promise.resolve();
};
let labRequestDataFromParent: LabRequest; // To store data for mockup

// --- OrganismChildPanel ---
interface OrganismChildPanelProps {
    organism: RequestedOrganism;
    onUpdate: (id: number, data: Partial<RequestedOrganism>) => void;
    onDelete: (id: number) => void;
    isSaving: boolean;
    // bioticsOptions: any[]; // For CodeEditor suggestions if applicable
}

const OrganismChildPanel: React.FC<OrganismChildPanelProps> = ({ organism, onUpdate, onDelete, isSaving /*, bioticsOptions */ }) => {
    const { t } = useTranslation(['labResults']);
    const [name, setName] = useState(organism.organism);
    const [sensitive, setSensitive] = useState(organism.sensitive || '');
    const [resistant, setResistant] = useState(organism.resistant || '');

    useEffect(() => { // Sync with prop changes if organism object identity changes
        setName(organism.organism);
        setSensitive(organism.sensitive || '');
        setResistant(organism.resistant || '');
    }, [organism]);

    const handleSave = () => {
        onUpdate(organism.id, { organism: name, sensitive, resistant });
    };

    return (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <TextField
                label={t('labResults:organismPanel.organismName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                disabled={isSaving}
            />
            <TextField
                label={t('labResults:organismPanel.sensitiveTo')}
                value={sensitive}
                onChange={(e) => setSensitive(e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
                sx={{ mb: 1 }}
                disabled={isSaving}
                // Replace with CodeEditor if using
                // <CodeEditor value={sensitive} onChange={setSensitive} options={bioticsOptions} />
            />
            <TextField
                label={t('labResults:organismPanel.resistantTo')}
                value={resistant}
                onChange={(e) => setResistant(e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
                sx={{ mb: 1 }}
                disabled={isSaving}
                // Replace with CodeEditor if using
                // <CodeEditor value={resistant} onChange={setResistant} options={bioticsOptions} />
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt:1 }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onDelete(organism.id)}
                    color="error"
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={16} /> : <DeleteIcon />}
                >
                    {t('common:delete')}
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    onClick={handleSave}
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                    {t('common:saveChanges')}
                </Button>
            </Box>
        </Box>
    );
};

// --- OrganismPanel ---
interface OrganismPanelProps {
  selectedTest: LabRequest; // This is the initialLabRequest from ResultEntryPanel
  // bioticsOptions: any[]; // Options for sensitive/resistant fields
  onDataChanged?: () => void; // To notify parent if data changed
}

const OrganismPanel: React.FC<OrganismPanelProps> = ({ selectedTest, /* bioticsOptions, */ onDataChanged }) => {
  const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient();
  const [activeOrganismTab, setActiveOrganismTab] = useState(0);
  
  // MOCKUP: Store selectedTest prop in a variable accessible by mockup service functions
  labRequestDataFromParent = selectedTest;

  const organismsQueryKey = ['organismsForLabRequest', selectedTest.id];

  const { data: organisms = [], isLoading, refetch } = useQuery<RequestedOrganism[], Error>({
    queryKey: organismsQueryKey,
    queryFn: () => fetchOrganismsForLabRequest(selectedTest.id),
    enabled: !!selectedTest.id,
  });

  const addOrganismMutation = useMutation({
    mutationFn: (newOrganismName: string) => createOrganism({ lab_request_id: selectedTest.id, organism: newOrganismName }),
    onSuccess: () => {
      toast.success(t('labResults:organismPanel.organismAdded'));
      queryClient.invalidateQueries({ queryKey: organismsQueryKey });
      if (onDataChanged) onDataChanged();
      // Optionally switch to the new organism's tab
      // setActiveOrganismTab(organisms.length); // This would be organisms.length before refetch
    },
    onError: () => toast.error(t('labResults:organismPanel.addOrganismError')),
  });

  const updateOrganismMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<RequestedOrganism> }) => updateOrganism(id, data),
    onSuccess: () => {
      toast.success(t('labResults:organismPanel.organismUpdated'));
      queryClient.invalidateQueries({ queryKey: organismsQueryKey });
       if (onDataChanged) onDataChanged();
    },
    onError: () => toast.error(t('labResults:organismPanel.updateOrganismError')),
  });

  const deleteOrganismMutation = useMutation({
    mutationFn: (id: number) => deleteOrganism(id),
    onSuccess: () => {
      toast.success(t('labResults:organismPanel.organismDeleted'));
      queryClient.invalidateQueries({ queryKey: organismsQueryKey });
       if (onDataChanged) onDataChanged();
      setActiveOrganismTab(0); // Reset to first tab
    },
    onError: () => toast.error(t('labResults:organismPanel.deleteOrganismError')),
  });

  const handleAddOrganism = () => {
    const newName = window.prompt(t('labResults:organismPanel.enterOrganismName'));
    if (newName && newName.trim()) {
      addOrganismMutation.mutate(newName.trim());
    }
  };

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddOrganism}
          disabled={addOrganismMutation.isPending}
        >
          {t('labResults:organismPanel.addOrganism')}
        </Button>
      </Box>
      {organisms.length === 0 ? (
        <Typography sx={{p:2, textAlign:'center', color: 'text.secondary'}}>
            {t('labResults:organismPanel.noOrganismsAdded')}
        </Typography>
      ) : (
        <>
          <Tabs
            value={activeOrganismTab}
            onChange={(_, newValue) => setActiveOrganismTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Organism tabs"
            sx={{ borderBottom: 1, borderColor: 'divider', minHeight: '40px' }}
          >
            {organisms.map((org, index) => (
              <StyledTab key={org.id} label={org.organism} id={`organism-tab-${index}`} aria-controls={`organism-tabpanel-${index}`} />
            ))}
          </Tabs>
          {organisms.map((org, index) => (
            <CustomTabPanel key={org.id} value={activeOrganismTab} index={index}>
              <OrganismChildPanel
                organism={org}
                onUpdate={updateOrganismMutation.mutate}
                onDelete={deleteOrganismMutation.mutate}
                isSaving={updateOrganismMutation.isPending || deleteOrganismMutation.isPending}
                // bioticsOptions={bioticsOptions}
              />
            </CustomTabPanel>
          ))}
        </>
      )}
    </Box>
  );
};

export default OrganismPanel;