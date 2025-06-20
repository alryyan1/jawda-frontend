// src/components/clinic/lab_requests/LabTestSelectionTabs.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// MUI Imports
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions'; // Optional for service card
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button'; // MUI Button
import Checkbox from '@mui/material/Checkbox'; // MUI Checkbox
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress'; // MUI Loader
import IconButton from '@mui/material/IconButton'; // For icon buttons

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import StyleIcon from '@mui/icons-material/Style'; // MUI equivalent for Tag icon

import { cn } from '@/lib/utils'; // Keep cn for other conditional classes if needed
import type { Package, MainTestStripped } from '@/types/labTests';
import { getPackagesList } from '@/services/packageService';
import { getMainTestsListForSelection, findMainTestByIdentifier } from '@/services/mainTestService';
import { toast } from 'sonner';

interface LabTestSelectionTabsProps {
  visitId: number;
  selectedTestIds: Set<number>;
  onTestSelectionChange: (testId: number, isSelected: boolean) => void;
  onAddById: (test: MainTestStripped) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: string; // or number, depends on how you manage tab values
  value: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`labtest-tabpanel-${index}`}
      aria-labelledby={`labtest-tab-${index}`}
      style={{ height: '100%', overflowY: 'auto' }} // Ensure panel can scroll
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0.5, height: '100%' }}> {/* Minimal padding for content */}
          {children}
        </Box>
      )}
    </div>
  );
}

const LabTestSelectionTabs: React.FC<LabTestSelectionTabsProps> = ({
  visitId, selectedTestIds, onTestSelectionChange, onAddById
}) => {
  const { t, i18n } = useTranslation(['labTests', 'common']);
  const [activePackageTab, setActivePackageTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [testIdInput, setTestIdInput] = useState('');
  const [isFindingTestById, setIsFindingTestById] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[], Error>({
    queryKey: ['packagesListForLabRequest'],
    queryFn: getPackagesList,
  });

  const { data: testsForTab, isLoading: isLoadingTests } = useQuery<MainTestStripped[], Error>({
    queryKey: ['availableMainTestsForSelection', activePackageTab, visitId, debouncedSearchTerm],
    queryFn: () => getMainTestsListForSelection({
      pack_id: activePackageTab === 'all' ? 'all' : (activePackageTab === 'none' ? 'none' : Number(activePackageTab)),
      visit_id_to_exclude_requests: visitId,
      search: debouncedSearchTerm,
    }),
    enabled: !!visitId,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActivePackageTab(newValue);
  };

  const handleFindTestById = async () => {
    if (!testIdInput.trim()) return;
    setIsFindingTestById(true);
    try {
      const foundTest = await findMainTestByIdentifier(testIdInput.trim(), visitId);
      if (foundTest) {
        onAddById(foundTest);
        setTestIdInput('');
      }
    } catch (error) {
      console.error("Error finding test by ID", error);
    } finally {
      setIsFindingTestById(false);
    }
  };

  const ServiceCard: React.FC<{ test: MainTestStripped }> = React.memo(({ test }) => {
    const isSelected = selectedTestIds.has(test.id);
    return (
      <Card
        onClick={() => onTestSelectionChange(test.id, !isSelected)}
        sx={{
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          position: 'relative',
          height: { xs: '70px', sm: '80px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 1, // Padding directly on card
          border: isSelected ? '2px solid' : '1px solid',
          borderColor: isSelected ? 'primary.main' : 'divider',
          backgroundColor: isSelected ? 'primary.lightOpacity' : 'background.paper', // Example for MUI theme
          '&:hover': { boxShadow: 3 }, // MUI shadow preset
          maxWidth: { xs: '140px', sm: '160px' }, // Max width control
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={test.main_test_name}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="body2" fontWeight="medium" sx={{ lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {test.main_test_name}
          </Typography>
          <Checkbox
            checked={isSelected}
            size="small"
            sx={{ p: 0, ml: 0.5 }} // Minimal padding for checkbox
          />
        </Box>
        <Box sx={{ mt: 'auto' }}> {/* Push price to bottom */}
          <Typography variant="caption" fontWeight="semibold">
            {Number(test.price).toFixed(1)}
          </Typography>
        </Box>
      </Card>
    );
  });
  ServiceCard.displayName = 'ServiceCard';


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1, alignItems: 'flex-end' }}>
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          placeholder={t('labTests:request.searchTestsPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon fontSize="small" sx={{ color: 'action.active', mr: 1 }} />
            ),
          }}
        />
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder={t('labTests:request.addByTestIdPlaceholder')}
            value={testIdInput}
            onChange={(e) => setTestIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFindTestById();}}}
          />
          <IconButton
            color="primary"
            onClick={handleFindTestById}
            disabled={isFindingTestById || !testIdInput.trim()}
            size="small"
            sx={{p: '7px'}} // Adjust padding to match TextField height
          >
            {isFindingTestById ? <CircularProgress size={20} /> : <AddCircleOutlineIcon fontSize="small"/>}
          </IconButton>
        </Box>
      </Box>

      {isLoadingPackages ? <CircularProgress size={24} sx={{display: 'block', margin: '8px auto'}} /> : (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
          <Tabs
            value={activePackageTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Lab Test Packages"
            sx={{ 
              minHeight: '36px', // Ensure tabs list has some height
              '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
              '& .MuiTab-root': { 
                textTransform: 'none', 
                fontSize: '0.75rem', 
                minHeight: '36px',
                padding: '6px 12px',
                '&.Mui-selected': { color: 'primary.main', fontWeight: 'bold' }
              }
            }}
          >
            {/* <Tab label={t('common:all')} value="all" /> */}
            <Tab label={t('labTests:request.unpackaged')} value="none" icon={<StyleIcon fontSize="inherit" sx={{mr: 0.5}}/>} iconPosition="start" />
            {packages?.map((pkg) => (
              <Tab 
                key={pkg.id} 
                label={pkg.name} 
                value={String(pkg.id)} 
                icon={<StyleIcon fontSize="inherit" sx={{mr: 0.5}}/>} 
                iconPosition="start" 
              />
            ))}
          </Tabs>
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1, overflow: 'hidden', mt: 0.5 }}> {/* Container for tab content */}
        {isLoadingTests ? (
          <Box sx={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : !testsForTab || testsForTab.length === 0 ? (
          <Box sx={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {debouncedSearchTerm ? t('common:noResultsFound') : t('labTests:request.noTestsInPackage')}
            </Typography>
          </Box>
        ) : (
          <TabPanel value={activePackageTab} index={activePackageTab}> {/* Single TabPanel, content changes based on query */}
             <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', // Responsive grid
                gap: 0.75, // Gap between cards
              }}>
                {testsForTab.map((test) => <ServiceCard key={test.id} test={test} />)}
            </Box>
          </TabPanel>
        )}
      </Box>
    </Box>
  );
};
export default LabTestSelectionTabs;