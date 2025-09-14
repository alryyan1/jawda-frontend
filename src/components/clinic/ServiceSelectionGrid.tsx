// src/components/clinic/ServiceSelectionGrid.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react'; // Added useCallback
import type { ServiceGroupWithServices, Service } from '@/types/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, List, CheckCircle2, AlertCircle, Loader2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber } from '@/lib/utils'; // Assuming formatNumber is also from utils
import { toast } from 'sonner';

// Define a more specific type for the service if contract_price and contract_requires_approval are always present
// or ensure your base Service type includes them as optional.
interface DisplayService extends Service {
  contract_price?: number | null; // Assuming it can be null if not applicable
  contract_requires_approval?: boolean | null;
}

interface ServiceSelectionGridProps {
  serviceCatalog: ServiceGroupWithServices[];
  onAddServices: (selectedServiceIds: number[]) => void;
  isLoading: boolean;
  onCancel: () => void;
  onAddSingleServiceById: (serviceId: number) => Promise<boolean>; // NEW: For adding single by ID, returns promise indicating success

  isCompanyPatient: boolean;
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
  isCompanyPatient,
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


  // Sub-component for rendering each service card for better readability and organization
  const ServiceCard: React.FC<{ service: DisplayService }> = React.memo(({ service }) => {
    const priceToShow = isCompanyPatient && service.contract_price != null // Check for null or undefined
      ? service.contract_price
      : service.price;
    
    // Backend `contract_requires_approval` field: true means needs approval
    const needsApproval = isCompanyPatient && service.contract_requires_approval === true;
    const isSelected = selectedServiceIds.has(service.id);

    return (
      <Card
        onClick={() => toggleServiceSelection(service.id)}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && toggleServiceSelection(service.id)} // Accessibility
        tabIndex={0} // Make it focusable
        role="button" // ARIA role
        aria-pressed={isSelected} // ARIA state
        aria-label={service.name}
        className={cn(
          "cursor-pointer hover:shadow-lg transition-all text-xs p-2 flex flex-col justify-between h-[110px] sm:h-[120px] relative focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isSelected
            ? "ring-2 ring-primary shadow-lg bg-primary/10"
            : "bg-card hover:bg-muted/50"
        )}
      >
        <div className="flex items-start justify-between mb-1">
          <p className="font-medium leading-tight line-clamp-2 text-xs sm:text-sm" title={service.name}>
            {service.name}
          </p>
          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />}
        </div>

        {/* Price and Badges Section */}
        <div className="mt-auto space-y-1">
           <div className="flex justify-between items-end">
            <p className="text-muted-foreground text-[10px] truncate" title={service.service_group?.name}>
              {service.service_group?.name || "غير متوفر"}
            </p>
            <p className="font-semibold text-sm">
              {priceToShow != null ? `${formatNumber(Number(priceToShow))} ر.س` : "السعر غير متوفر"}
            </p>
           </div>
          {(isCompanyPatient || needsApproval) && (
            <div className="flex flex-wrap gap-1">
              {isCompanyPatient && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 leading-tight border-blue-500 text-blue-600">
                  سعر الشركة
                </Badge>
              )}
              {needsApproval && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight">
                  يتطلب موافقة
                </Badge>
              )}
            </div>
          )}
        </div>
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
        <Button onClick={onCancel} variant="outline" size="sm" className="mt-4">
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full flex flex-col h-full"> {/* Allow flex column for height control */}
      <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0"> {/* Search and button bar */}
        <div className="relative flex-grow w-full sm:w-auto">
          <Input
            type="search"
            aria-label="البحث في الخدمات"
            placeholder="البحث في الخدمات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 rtl:pr-10 h-9"
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
         {/* NEW: Input for adding service by ID */}
         <div className="flex items-center gap-1 w-full sm:w-auto md:max-w-xs">
            <Input
                type="number"
                placeholder="أدخل رقم الخدمة..."
                value={serviceIdInput}
                onChange={(e) => setServiceIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddServiceByIdInput();}}}
                className="h-9 flex-grow"
                disabled={isLoading || isFindingServiceById}
            />
            <Button onClick={handleAddServiceByIdInput} size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || isFindingServiceById || !serviceIdInput.trim()}>
                {isFindingServiceById ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}
            </Button>
        </div>
     
         {/* Add Selected Button - Positioned at the bottom */}
         {selectedServiceIds.size > 0 && (
        <div className="mt-auto flex justify-end flex-shrink-0 border-t"> {/* Ensure it's at the bottom */}
          <Button onClick={handleAddClick} disabled={isLoading || selectedServiceIds.size === 0} size="sm">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" aria-hidden="true" />}
            إضافة المحدد ({selectedServiceIds.size})
          </Button>
        </div>
      )}
      
        <Button onClick={onCancel} variant="outline" size="sm" className="w-full sm:w-auto h-9 flex-shrink-0">
          <List className="h-4 w-4 ltr:mr-2 rtl:ml-2" aria-hidden="true" /> عرض المطلوب
        </Button>
      </div>

      {/* Conditional rendering for no results after search */}
      {filteredCatalog.length === 0 && searchTerm ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 text-gray-400" />
            <p className="text-lg font-semibold">لم يتم العثور على نتائج</p>
            <p className="text-sm">جرب كلمات مختلفة</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={activeTab || filteredCatalog[0]?.id.toString()} dir={true} className="w-full flex flex-col flex-grow">
          <ScrollArea type='scroll' className="w-full whitespace-nowrap border-b flex-shrink-0">
            <TabsList  className="flex flex-wrap h-auto p-1 bg-muted rounded-lg" aria-label="تنقل مجموعات الخدمات">
              {filteredCatalog.map((group) => (
                <TabsTrigger
                  key={group.id}
                  value={group.id.toString()}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {group.name} ({group.services.length})
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          <div className="flex-grow mt-0 pt-3 relative"> {/* Added relative for absolute positioning of ScrollArea */}
            {filteredCatalog.map((group) => (
              <TabsContent key={group.id} value={group.id.toString()} className="h-full mt-0"> {/* Ensure TabsContent fills height */}
                {group.services.length === 0 && searchTerm ? (
                  <div className="text-center py-10 text-muted-foreground">لم يتم العثور على نتائج في هذه المجموعة</div>
                ) : group.services.length === 0 && !searchTerm ? (
                  <div className="text-center py-10 text-muted-foreground">لا توجد خدمات في هذه المجموعة</div>
                ): (
                  // Take up remaining height
                  <ScrollArea className="absolute inset-0 pr-1"> {/* Use absolute to fill parent */}
                    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-0.5">
                      {group.services.map((service) => (
                        <ServiceCard key={service.id} service={service as DisplayService} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}

   
    </div>
  );
};

export default ServiceSelectionGrid;