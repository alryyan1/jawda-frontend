// src/components/clinic/LabTestSelectionTabs.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, PlusCircle, Tag } from 'lucide-react'; // Tag for package
import { cn } from '@/lib/utils';
import type { Package, MainTestStripped } from '@/types/labTests';
import { getPackagesList } from '@/services/packageService';
import { getMainTestsListForSelection, findMainTestByIdentifier } from '@/services/mainTestService';

interface LabTestSelectionTabsProps {
  visitId: number; // To exclude already requested tests
  selectedTestIds: Set<number>; // Set of currently selected test IDs from parent
  onTestSelectionChange: (testId: number, isSelected: boolean) => void;
  onAddById: (test: MainTestStripped) => void; // Callback to add a test found by ID
}

const LabTestSelectionTabs: React.FC<LabTestSelectionTabsProps> = ({ 
    visitId, selectedTestIds, onTestSelectionChange, onAddById 
}) => {
  const { t, i18n } = useTranslation(['labTests', 'common']);
  const [activePackageTab, setActivePackageTab] = useState<string>('all'); // 'all' or package_id as string
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [testIdInput, setTestIdInput] = useState('');
  const [isFindingTestById, setIsFindingTestById] = useState(false);


  useEffect(() => { // Debounce search
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
    enabled: !!visitId, // Only fetch when visitId is present
  });
  
  const handleFindTestById = async () => {
    if (!testIdInput.trim()) return;
    setIsFindingTestById(true);
    try {
        const foundTest = await findMainTestByIdentifier(testIdInput.trim(), visitId);
        if (foundTest) {
            onAddById(foundTest); // Parent adds to selected list if not already there
            setTestIdInput('');
        }
        // Error toast handled by service
    } catch (error) {
        console.error("Error finding test by ID", error);
        // toast.error(t('common:error.generic')); // Service might handle specific errors
    } finally {
        setIsFindingTestById(false);
    }
  };

  const ServiceCard: React.FC<{ test: MainTestStripped }> = ({ test }) => (
    <Card
      onClick={() => onTestSelectionChange(test.id, !selectedTestIds.has(test.id))}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all text-xs p-2 flex flex-col justify-between h-[70px] sm:h-[80px] relative w-full max-w-[140px] sm:max-w-[160px]",
        selectedTestIds.has(test.id) ? "ring-2 ring-primary shadow-lg bg-primary/10" : "bg-card"
      )}
      title={test.main_test_name}
    >
      <div className="flex items-start justify-between">
        <p className="font-medium leading-tight line-clamp-2 text-xs sm:text-sm">
          {test.main_test_name}
        </p>
        <Checkbox checked={selectedTestIds.has(test.id)} className="h-3.5 w-3.5 shrink-0" />
      </div>
      <div className="mt-auto">
        <p className="font-semibold text-[10px] sm:text-xs">{Number(test.price).toFixed(1)} {t('common:currency')}</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2 items-end">
        <div className="relative">
          <Input
            type="search"
            placeholder={t('labTests:request.searchTestsPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 rtl:pr-10 h-9"
          />
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-end gap-1 w-full md:w-auto">
            <Input
                type="text"
                placeholder={t('labTests:request.addByTestIdPlaceholder')}
                value={testIdInput}
                onChange={(e) => setTestIdInput(e.target.value)}
                className="h-9 flex-grow"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFindTestById();}}}
            />
            <Button onClick={handleFindTestById} size="icon" className="h-9 w-9 shrink-0" disabled={isFindingTestById || !testIdInput.trim()}>
                {isFindingTestById ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}
            </Button>
        </div>
      </div>

      {isLoadingPackages ? <div className="py-2"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div> : (
      <Tabs value={activePackageTab} onValueChange={setActivePackageTab} defaultValue="all" dir={i18n.dir()} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap border-b">
          <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
            {/* <TabsTrigger value="all" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('common:all')}</TabsTrigger> */}
            <TabsTrigger value="none" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('labTests:request.unpackaged')}</TabsTrigger>
            {packages?.map((pkg) => (
              <TabsTrigger key={pkg.id} value={String(pkg.id)} className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="h-3 w-3 ltr:mr-1 rtl:ml-1 opacity-70"/> {pkg.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>
        
        <div className="mt-2">
            {isLoadingTests ? <div className="h-[200px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> :
             !testsForTab || testsForTab.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                    {debouncedSearchTerm ? t('common:noResultsFound') : t('labTests:request.noTestsInPackage')}
                </div>
             ) : (
                <ScrollArea className="h-[calc(50vh-220px)] min-h-[150px]"> {/* Adjust height */}
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2 p-0.5">
                        {testsForTab.map((test) => <ServiceCard key={test.id} test={test} />)}
                    </div>
                </ScrollArea>
             )
            }
        </div>
      </Tabs>
      )}
    </div>
  );
};
export default LabTestSelectionTabs;