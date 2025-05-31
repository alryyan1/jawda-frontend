// src/components/clinic/ServiceSelectionGrid.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServiceGroupWithServices, Service } from '@/types/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, List, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface ServiceSelectionGridProps {
  serviceCatalog: ServiceGroupWithServices[];
  onAddServices: (selectedServiceIds: number[]) => void;
  isLoading: boolean;
  onCancel: () => void;
  isCompanyPatient: boolean; // NEW PROP
}

const ServiceSelectionGrid: React.FC<ServiceSelectionGridProps> = ({ 
    serviceCatalog, 
    onAddServices, 
    isLoading, 
    onCancel,
    isCompanyPatient // NEW PROP
}) => {
  const { t, i18n } = useTranslation(['services', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
  
  // Find the first group that has services after filtering to set as default active tab
  const firstGroupWithServices = useMemo(() => 
    serviceCatalog?.find(group => group.services.length > 0)?.id.toString()
  , [serviceCatalog]);
  const [activeTab, setActiveTab] = useState<string | undefined>(firstGroupWithServices);

  useEffect(() => {
    if (firstGroupWithServices && !activeTab) {
        setActiveTab(firstGroupWithServices);
    }
  }, [firstGroupWithServices, activeTab]);


  const filteredCatalog = useMemo(() => {
    if (!serviceCatalog) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return serviceCatalog.map(group => ({
      ...group,
      services: group.services.filter(service => 
        service.name.toLowerCase().includes(lowerSearchTerm)
      ),
    })).filter(group => group.services.length > 0);
  }, [serviceCatalog, searchTerm]);

  useEffect(() => { // Update activeTab if it becomes invalid after filtering
    if (filteredCatalog.length > 0 && !filteredCatalog.find(g => g.id.toString() === activeTab)) {
        setActiveTab(filteredCatalog[0].id.toString());
    } else if (filteredCatalog.length === 0) {
        setActiveTab(undefined);
    }
  }, [filteredCatalog, activeTab]);


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
    setSelectedServiceIds(new Set());
  };
  
  if (!serviceCatalog) { // Guard against undefined serviceCatalog
      return <div className="text-center p-4 text-muted-foreground">{t('common:loading')}</div>;
  }


  console.log(serviceCatalog,'serviceCatalog');

  console.log(isCompanyPatient,'isCompanyPatient');
  const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
    // Determine which price to show
    const priceToShow = isCompanyPatient && service.contract_price !== null && service.contract_price !== undefined 
                        ? service.contract_price 
                        : service.price;
    console.log(service,'service');
    // Backend `approval` field: true means needs approval, false means auto-approved by contract.
    // So, if `contract_requires_approval` is true, we show the badge.
    const needsApproval = isCompanyPatient && service.contract_requires_approval === false;

    return (
      <Card
        key={service.id}
        onClick={() => toggleServiceSelection(service.id)}
        className={cn(
          "cursor-pointer hover:shadow-md transition-all text-xs p-2 flex flex-col justify-between h-[110px] sm:h-[120px] relative", // Increased height
          selectedServiceIds.has(service.id) ? "ring-2 ring-primary shadow-lg bg-primary/10 dark:bg-primary/20" : "bg-card dark:bg-card/80"
        )}
      >
        <div className="flex items-start justify-between">
          <p className="font-medium leading-tight line-clamp-2 text-xs sm:text-sm" title={service.name}>{service.name}</p>
          {selectedServiceIds.has(service.id) && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0"/>}
        </div>
        <div className="mt-auto space-y-0.5">
          {isCompanyPatient && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 leading-tight border-blue-500 text-blue-600">
              {t('common:companyPrice')}
            </Badge>
          )}
          {needsApproval && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight mt-0.5 block w-fit">
              <AlertCircle className="h-2.5 w-2.5 ltr:mr-0.5 rtl:ml-0.5"/>
              {t('common:requiresApproval')}
            </Badge>
          )}
          <p className="text-muted-foreground text-[10px] truncate">{service.service_group?.name}</p>
          <p className="font-semibold text-sm">{formatNumber(Number(priceToShow))} {t('common:currencySymbolShort')}</p>
        </div>
      </Card>
    );
  };


  return (
    <div className="space-y-3 w-full"> 
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-grow w-full sm:w-auto">
          <Input
          type="search"
          placeholder={t('common:searchPlaceholder', { entity: t('services:servicesEntityNamePlural', "Services")})}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ps-10 rtl:pr-10 h-9"
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={onCancel} variant="outline" size="sm" className="w-full sm:w-auto h-9">
          <List className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('common:viewRequested')}
        </Button>
      </div>
      
      {filteredCatalog.length === 0 && searchTerm ? (
       <div className="text-center py-10 text-muted-foreground">{t('common:noResultsFound')}</div>
      ) : filteredCatalog.length === 0 && !searchTerm ? (
       <div className="text-center py-10 text-muted-foreground">{t('services:noServicesAvailableForSelection')}</div>
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={activeTab || filteredCatalog[0]?.id.toString()} dir={i18n.dir()} className="w-full">
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
          <ScrollArea className="h-[calc(100vh-450px)] min-h-[200px]"> {/* Adjusted height calculation */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-0.5">
                {group.services.map((service) => <ServiceCard key={service.id} service={service} />)}
            </div>
          </ScrollArea>
          )}
        </TabsContent>
        ))}
      </Tabs>
      )}
      {selectedServiceIds.size > 0 && (
      <div className="mt-3 flex justify-end">
        <Button onClick={handleAddClick} disabled={isLoading} size="sm">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
        {t('common:addSelectedCount', { count: selectedServiceIds.size })} 
        </Button>
      </div>
      )}
    </div>
  );
};
export default ServiceSelectionGrid;