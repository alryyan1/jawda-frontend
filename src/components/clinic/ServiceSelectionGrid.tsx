// src/components/clinic/ServiceSelectionGrid.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ServiceGroupWithServices, Service } from '@/types/services';
import { Search, List, CheckCircle2, AlertCircle, Loader2, PlusCircle } from 'lucide-react';
// import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Box,
  Button,
  Card,
  CardContent,
  // Chip,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
// Use standard Grid
// Using CSS grid via Box instead of MUI Grid to avoid type issues

// Define a more specific type for the service if contract_price and contract_requires_approval are always present
// or ensure your base Service type includes them as optional.
interface DisplayService extends Service {
  contract_price?: number | null; // Assuming it can be null if not applicable
  contract_requires_approval?: boolean;
}

interface ServiceSelectionGridProps {
  serviceCatalog: ServiceGroupWithServices[];
  onAddServices: (selectedServiceIds: number[]) => void;
  isLoading: boolean;
  onCancel: () => void;
  onAddSingleServiceById: (serviceId: number) => Promise<boolean>; // NEW: For adding single by ID, returns promise indicating success
  onSelectedIdsChange?: (ids: number[]) => void; // NEW: bubble selection up
  externalAddSelectedCommand?: number; // NEW: when increments, trigger add selected
}

// Helper function to find the first group with services
const findInitialActiveTab = (catalog: ServiceGroupWithServices[]): string | undefined => {
  return catalog?.find(group => group.services && group.services.length > 0)?.id.toString();
};

const ServiceSelectionGrid: React.FC<ServiceSelectionGridProps> = ({
  serviceCatalog,
  onAddServices,
  isLoading,
  onCancel,
  onAddSingleServiceById,
  onSelectedIdsChange,
  externalAddSelectedCommand = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());

  // Memoized calculation for the initial active tab
  const initialActiveTab = useMemo(() => findInitialActiveTab(serviceCatalog || []), [serviceCatalog]);
  const [activeTab, setActiveTab] = useState<string | undefined>(initialActiveTab);
  const [serviceIdInput, setServiceIdInput] = useState(''); // 
  // Effect to set initial active tab when catalog loads or changes
  useEffect(() => {
    if (serviceCatalog && serviceCatalog.length > 0 && !activeTab) {
      setActiveTab(findInitialActiveTab(serviceCatalog));
    }
  }, [serviceCatalog, activeTab]);
  const [isFindingServiceById, setIsFindingServiceById] = useState(false); // NEW: 
  // NEW: Handler for adding service by ID input
  const handleAddServiceByIdInput = async () => {
    const id = parseInt(serviceIdInput);
    if (isNaN(id) || id <= 0) {
      toast.error("رقم الخدمة غير صحيح");
      return;
    }
    setIsFindingServiceById(true);
    try {
      // The onAddSingleServiceById should handle fetching and then adding
      // It needs to be an async function that returns a boolean (or throws)
      const addedSuccessfully = await onAddSingleServiceById(id);
      if (addedSuccessfully) {
        setServiceIdInput(''); // Clear input on success
      }
      // Toast messages (success/failure) should be handled by the parent's mutation logic
    } catch (error) {
      // Error already toasted by parent's mutation or service call
      console.error("Error in handleAddServiceByIdInput (already handled by parent)", error);
    } finally {
      setIsFindingServiceById(false);
    }
  };
  
  // Memoized calculation for the filtered catalog
  const filteredCatalog = useMemo(() => {
    if (!serviceCatalog) return [];
    const lowerSearchTerm = searchTerm.toLowerCase().trim(); // Trim search term

    if (!lowerSearchTerm) return serviceCatalog; // Return original if search is empty

    return serviceCatalog
      .map(group => ({
        ...group,
        services: group.services.filter(service =>
          service.name.toLowerCase().includes(lowerSearchTerm)
        ),
      }))
      .filter(group => group.services.length > 0);
  }, [serviceCatalog, searchTerm]);

  // Effect to update activeTab if it becomes invalid after filtering
  useEffect(() => {
    if (filteredCatalog.length > 0) {
      const currentTabExists = filteredCatalog.some(g => g.id.toString() === activeTab);
      if (!currentTabExists) {
        setActiveTab(filteredCatalog[0].id.toString());
      }
    } else {
      setActiveTab(undefined); // No groups left, no active tab
    }
  }, [filteredCatalog, activeTab]);

  // useCallback for stable function references if passed as props or in dependencies
  const toggleServiceSelection = useCallback((serviceId: number) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  }, []); // Empty dependency array as it doesn't depend on external state directly

  const handleAddClick = useCallback(() => {
    if (selectedServiceIds.size > 0) {
      onAddServices(Array.from(selectedServiceIds));
      setSelectedServiceIds(new Set()); // Reset selection
    }
  }, [onAddServices, selectedServiceIds]);

  // Bubble selection up
  useEffect(() => {
    if (onSelectedIdsChange) {
      onSelectedIdsChange(Array.from(selectedServiceIds));
    }
  }, [selectedServiceIds, onSelectedIdsChange]);

  // Respond to external add selected command
  useEffect(() => {
    if (externalAddSelectedCommand > 0) {
      handleAddClick();
    }
  }, [externalAddSelectedCommand, handleAddClick]);


  // Sub-component for rendering each service card for better readability and organization
  const ServiceCard: React.FC<{ service: DisplayService }> = React.memo(({ service }) => {
    const isSelected = selectedServiceIds.has(service.id);

    return (
      <Card sx={{width:'200px'}} onClick={() => toggleServiceSelection(service.id)} role="button" aria-pressed={isSelected} aria-label={service.name}>
        <CardContent sx={{  display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="start" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap title={service.name}>{service.name}</Typography>
            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />}
          </Box>
          {/* Removed price and category name section as requested */}
        </CardContent>
      </Card>
    );
  });
  ServiceCard.displayName = 'ServiceCard'; // For better debugging

  // Loading state or if catalog is genuinely empty before any search
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">جاري تحميل البيانات...</p>
      </div>
    );
  }
  
  if (!serviceCatalog || serviceCatalog.length === 0 && !searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] min-h-[200px] text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">لا توجد خدمات متاحة</p>
        <p className="text-sm text-muted-foreground">لا توجد خدمات متاحة للاختيار</p>
        <Button onClick={onCancel} variant="outlined" size="small" className="mt-4">
          العودة
        </Button>
      </div>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={1.5} height="100%">
      {/* Search and actions */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          type="search"
          placeholder="البحث في الخدمات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="h-4 w-4" />
              </InputAdornment>
            ),
          }}
        />
        <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }}>
          <TextField
            size="small"
            type="number"
            placeholder="أدخل رقم الخدمة..."
            value={serviceIdInput}
            onChange={(e) => setServiceIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddServiceByIdInput(); }}}
            disabled={isLoading || isFindingServiceById}
          />
          <Button onClick={handleAddServiceByIdInput} variant="contained" size="small" disabled={isLoading || isFindingServiceById || !serviceIdInput.trim()}>
            {isFindingServiceById ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}
          </Button>
          <Button onClick={onCancel} variant="outlined" size="small">
            <List className="h-4 w-4" />
          </Button>
        </Box>
      </Box>

      {/* No results after search */}
      {filteredCatalog.length === 0 && searchTerm ? (
        <Box flex={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={4} color="text.secondary">
          <Search className="h-12 w-12 mb-2" />
          <Typography fontWeight={600}>لم يتم العثور على نتائج</Typography>
          <Typography variant="body2">جرب كلمات مختلفة</Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" flex={1} minHeight={0}>
          {/* Tabs header */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab ?? filteredCatalog[0]?.id.toString()}
              onChange={(_e, val) => setActiveTab(String(val))}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {filteredCatalog.map((group) => (
                <Tab key={group.id} value={group.id.toString()} label={`${group.name} (${group.services.length})`} />
              ))}
            </Tabs>
          </Box>
          {/* Tabs content */}
          <Box flex={1} minHeight={0} position="relative" pt={1}>
            {(() => {
              const currentId = activeTab ?? filteredCatalog[0]?.id.toString();
              const currentGroup = filteredCatalog.find(g => g.id.toString() === currentId);
              if (!currentGroup) return null;
              if (currentGroup.services.length === 0 && searchTerm) {
                return <Typography align="center" color="text.secondary" py={4}>لم يتم العثور على نتائج في هذه المجموعة</Typography>;
              }
              if (currentGroup.services.length === 0 && !searchTerm) {
                return <Typography align="center" color="text.secondary" py={4}>لا توجد خدمات في هذه المجموعة</Typography>;
              }
              return (
                <Box>
                  <Box className='flex flex-wrap gap-2'>
                    {currentGroup.services.map((service) => (
                      <Box key={service.id} className='w-[200px]'>
                        <ServiceCard service={service as DisplayService} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </Box>
      )}

      {/* Add Selected Button */}
      {selectedServiceIds.size > 0 && (
        <Box display="flex" justifyContent="flex-end" borderTop={1} borderColor="divider" pt={1}>
          <Button onClick={handleAddClick} variant="contained" size="small" disabled={isLoading || selectedServiceIds.size === 0}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            &nbsp;إضافة المحدد ({selectedServiceIds.size})
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ServiceSelectionGrid;