// src/components/clinic/ServiceSelectionGrid.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type {  ServiceGroupWithServices } from '@/types/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search ,List, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


interface ServiceSelectionGridProps {
  serviceCatalog: ServiceGroupWithServices[];
  onAddServices: (selectedServiceIds: number[]) => void;
  isLoading: boolean; // Loading state from parent for add mutation
  onCancel: () => void; // To hide this grid and show the table
}

const ServiceSelectionGrid: React.FC<ServiceSelectionGridProps> = ({ serviceCatalog, onAddServices, isLoading, onCancel }) => {
  const { t, i18n } = useTranslation(['services', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string | undefined>(serviceCatalog?.[0]?.id.toString());


  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return serviceCatalog;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return serviceCatalog.map(group => ({
      ...group,
      services: group.services.filter(service => 
        service.name.toLowerCase().includes(lowerSearchTerm)
      ),
    })).filter(group => group.services.length > 0); // Only include groups that still have services after filtering
  }, [serviceCatalog, searchTerm]);

  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleAddClick = () => {
    onAddServices(Array.from(selectedServiceIds));
    setSelectedServiceIds(new Set()); // Clear selection after adding
  };
  // Ensure activeTab is valid after filtering
  useEffect(() => {
    if (filteredCatalog.length > 0 && !filteredCatalog.find(g => g.id.toString() === activeTab)) {
        setActiveTab(filteredCatalog[0].id.toString());
    } else if (filteredCatalog.length === 0) {
        setActiveTab(undefined);
    }
  }, [filteredCatalog, activeTab]);

  if (!serviceCatalog || serviceCatalog.length === 0) {
      return <div className="text-center p-4 text-muted-foreground">{t('services:noServicesAvailableForSelection')}</div>;
  }
  


  return (
    <div className="space-y-3 w-full"> 
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-grow w-full sm:w-auto">
          <Input
          type="search"
          placeholder={t('common:searchPlaceholder', "Search services...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ps-10 rtl:pr-10"
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={onCancel} variant="outline" size="sm" className="w-full sm:w-auto">
          <List className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('common:viewRequested')}
        </Button>
      </div>

      {/* <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={serviceCatalog[0]?.id.toString()} dir={i18n.dir()} className="w-full">
      <ScrollArea className="w-full whitespace-nowrap border-b">
        <TabsList className="inline-flex h-auto p-1">
        {filteredCatalog.map((group) => (
          <TabsTrigger key={group.id} value={group.id.toString()} className="text-xs px-3 py-1.5">
          {group.name}
          </TabsTrigger>
        ))}
        </TabsList>
      </ScrollArea>
     
      </Tabs> */}
      
      
      {filteredCatalog.length === 0 && searchTerm ? (
       <div className="text-center py-10 text-muted-foreground">{t('common:noResultsFound')}</div>
      ) : filteredCatalog.length === 0 && !searchTerm ? (
       <div className="text-center py-10 text-muted-foreground">{t('services:noServicesAvailableForSelection')}</div>
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={filteredCatalog[0]?.id.toString()} dir={i18n.dir()} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap border-b">
        <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
          {filteredCatalog.map((group) => (
          <TabsTrigger key={group.id} value={group.id.toString()} className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            {group.name}
          </TabsTrigger>
          ))}
        </TabsList>
        </ScrollArea>
        {filteredCatalog.map((group) => (
        <TabsContent key={group.id} value={group.id.toString()} className="mt-0 pt-3">
          {group.services.length === 0 && searchTerm ? (
            <div className="text-center py-10 text-muted-foreground">{t('common:noResultsFoundInGroup')}</div>
          ) : (
          <ScrollArea className="h-[calc(50vh-200px)] min-h-[150px]"> {/* Adjust height */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 p-1"> {/* Adjust columns for card size */}
            {group.services.map((service) => (
               <Card
            key={service.id}
            onClick={() => toggleServiceSelection(service.id)}
            className={cn(
              "cursor-pointer hover:shadow-md transition-all text-xs p-2 flex flex-col justify-between h-[100px] relative",
              selectedServiceIds.has(service.id) ? "ring-2 ring-primary shadow-lg bg-primary/10" : "bg-card"
            )}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium leading-tight line-clamp-2" title={service.name}>{service.name}</p>
                {selectedServiceIds.has(service.id) && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0"/>}
              </div>
              <div className="mt-auto">
                <p className="text-muted-foreground text-[10px] truncate">{group.name}</p>
                <p className="font-semibold">{Number(service.price).toFixed(2)} {t('common:currency')}</p>
              </div>
            </Card>
            ))}
            </div>
          </ScrollArea>
          )}
        </TabsContent>
        ))}
      </Tabs>
      )}
      {selectedServiceIds.size > 0 && (
      <div className="mt-3 flex justify-end">
        <Button onClick={handleAddClick} disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
        {t('common:addSelected', { count: selectedServiceIds.size })} 
        </Button>
      </div>
      )}
    </div>
  );
};
export default ServiceSelectionGrid;