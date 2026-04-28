// src/components/clinic/ServiceSelectionGrid.tsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ServiceGroupWithServices, Service } from '@/types/services';
import { Search, List, AlertCircle, Loader2, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
// import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Box,
  Button,
  Card,
  CardContent,
  // Chip,
  InputAdornment,
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

  // Memoized calculation for the initial active tab
  const initialActiveTab = useMemo(() => findInitialActiveTab(serviceCatalog || []), [serviceCatalog]);
  const [activeTab, setActiveTab] = useState<string | undefined>(initialActiveTab);
  const [serviceIdInput, setServiceIdInput] = useState(''); // 
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Effect to set initial active tab when catalog loads or changes
  useEffect(() => {
    if (serviceCatalog && serviceCatalog.length > 0 && !activeTab) {
      setActiveTab(findInitialActiveTab(serviceCatalog));
    }
  }, [serviceCatalog, activeTab]);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  }, []);

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  // Check scroll state on mount and when tabs change
  useEffect(() => {
    checkScrollState();
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState);
      return () => container.removeEventListener('scroll', checkScrollState);
    }
  }, [checkScrollState]);

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

  // Check scroll state when filteredCatalog changes
  useEffect(() => {
    checkScrollState();
  }, [checkScrollState, filteredCatalog]);

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



  // Sub-component for rendering each service card for better readability and organization
  const ServiceCard: React.FC<{ service: DisplayService }> = React.memo(({ service }) => {
    return (
      <Card 
        onClick={() => onAddServices([service.id])} 
        role="button"
        aria-label={service.name}
        className="transition-colors cursor-pointer hover:ring-2 hover:ring-primary active:scale-95"
        sx={{ height: '100%' }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '40px' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={service.name}>
            {service.name}
          </Typography>
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
        {/* Removed local add-selected button as requested; moved to SelectedPatientWorkspace */}
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
          {/* Custom Scrollable Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left scroll button */}
              {canScrollLeft && (
                <Button
                  onClick={scrollLeft}
                  size="small"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    zIndex: 1,
                    minWidth: 'auto',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              {/* Right scroll button */}
              {canScrollRight && (
                <Button
                  onClick={scrollRight}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 0,
                    zIndex: 1,
                    minWidth: 'auto',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'background.paper',
                    boxShadow: 2,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {/* Tabs container */}
              <Box
                ref={tabsContainerRef}
                sx={{
                  display: 'flex',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  paddingLeft: canScrollLeft ? '50px' : 0,
                  paddingRight: canScrollRight ? '50px' : 0,
                }}
              >
                {filteredCatalog.map((group) => {
                  const isActive = activeTab === group.id.toString();
                  return (
                    <Button
                      key={group.id}
                      onClick={() => setActiveTab(group.id.toString())}
                      variant={isActive ? 'contained' : 'text'}
                      sx={{
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                        px: 2,
                        py: 1,
                        mx: 0.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: isActive ? 600 : 400,
                        backgroundColor: isActive ? 'primary.main' : 'transparent',
                        color: isActive ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                        },
                        borderBottom: isActive ? '2px solid' : '2px solid transparent',
                        borderBottomColor: isActive ? 'primary.main' : 'transparent',
                      }}
                    >
                      {`${group.name} (${group.services.length})`}
                    </Button>
                  );
                })}
              </Box>
            </Box>
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
                  <Box className='grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2'>
                    {currentGroup.services.map((service) => (
                      <ServiceCard key={service.id} service={service as DisplayService} />
                    ))}
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </Box>
      )}

      {/* Bottom add button removed; controlled from top bar */}
    </Box>
  );
};

export default ServiceSelectionGrid;