// src/pages/settings/LabPriceListPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Save, Trash2, Printer, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { MainTest } from '@/types/labTests';
import { 
    getAllActiveMainTestsForPriceList, 
    batchUpdateTestPrices, 
    batchDeleteMainTests 
} from '@/services/mainTestService';
import { downloadLabPriceListPdf } from '@/services/reportService';

// Zod schema for the form managing an array of price list items
const priceListItemSchema = z.object({
  id: z.number(),
  main_test_name: z.string(),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "يجب أن يكون السعر رقمًا موجبًا."}),
  isSelectedForDelete: z.boolean().optional(), // For mass delete
});

const priceListSchema = z.object({
  tests: z.array(priceListItemSchema),
});
type PriceListFormValues = z.infer<typeof priceListSchema>;

interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const LabPriceListPage: React.FC = () => {
  const { t } = useTranslation(['labSettings', 'common', 'labTests']);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [numColumns, setNumColumns] = useState(3); // Default columns
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Calculate number of columns based on screen width
  useEffect(() => {
     const calculateCols = () => {
         // Approx width per item (name + price input)
         const itemWidth = 280; // Adjust as needed (e.g., 250px for name + 100px for price + gap)
         const screenWidth = window.innerWidth - 240 - 64; // Subtract sidebar and padding approx
         setNumColumns(Math.max(1, Math.floor(screenWidth / itemWidth)));
     };
     calculateCols();
     window.addEventListener('resize', calculateCols);
     return () => window.removeEventListener('resize', calculateCols);
  }, []);

  const { data: allTests, isLoading: isLoadingTests } = useQuery<MainTest[], Error>({
    queryKey: ['allActiveMainTestsForPriceList', debouncedSearchTerm],
    queryFn: () => getAllActiveMainTestsForPriceList(debouncedSearchTerm),
  });

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: { tests: [] },
  });
  const { control, handleSubmit, reset, getValues, formState: { dirtyFields, errors, isDirty } } = form;

  const { fields } = useFieldArray({
    control,
    name: "tests",
    keyName: "fieldId" // Important for React key
  });

  // Populate form with fetched tests
  useEffect(() => {
    if (allTests) {
      const formattedTests = allTests.map(test => ({
        id: test.id,
        main_test_name: test.main_test_name,
        price: test.price !== null && test.price !== undefined ? String(test.price) : '0',
        isSelectedForDelete: false,
      }));
      reset({ tests: formattedTests });
    }
  }, [allTests, reset]);

  const updatePricesMutation = useMutation({
    mutationFn: batchUpdateTestPrices,
    onSuccess: (data) => {
      toast.success(data.message || t('labSettings:pricesSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['allActiveMainTestsForPriceList'] });
      form.reset(getValues(), { keepValues: true, keepDirty: false, keepDefaultValues: false }); // Reset dirty state
    },
    onError: (error: ErrorResponse) => toast.error(error.response?.data?.message || t('labSettings:pricesSaveError')),
  });

  const deleteMutation = useMutation({
     mutationFn: batchDeleteMainTests,
     onSuccess: (data) => {
         toast.success(data.message || t('labSettings:massDeleteSuccess', {count: data.deleted_count}));
         if (data.errors && data.errors.length > 0) {
             data.errors.forEach(errMsg => toast.warning(errMsg));
         }
         queryClient.invalidateQueries({ queryKey: ['allActiveMainTestsForPriceList'] });
     },
     onError: (error: ErrorResponse) => toast.error(error.response?.data?.message || t('labSettings:massDeleteError')),
  });

  const onSubmit = (data: PriceListFormValues) => {
    const dirtyTestUpdates: Array<{ id: number; price: number }> = [];
    data.tests.forEach((test, index) => {
      if (dirtyFields.tests?.[index]?.price) {
        dirtyTestUpdates.push({ id: test.id, price: parseFloat(test.price) });
      }
    });

    if (dirtyTestUpdates.length > 0) {
      updatePricesMutation.mutate(dirtyTestUpdates);
    } else {
      toast.info(t('common:noChangesToSave'));
    }
  };

  const handleDeleteSelected = () => {
     const selectedIds = getValues().tests.filter(t => t.isSelectedForDelete).map(t => t.id);
     if (selectedIds.length === 0) {
         toast.info(t('common:selectItemsToDeleteFirst'));
         return;
     }
     if (window.confirm(t('labSettings:confirmMassDelete', { count: selectedIds.length }))) {
         deleteMutation.mutate(selectedIds);
     }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
        const filters: LabPriceListPdfFilters = {};
        if (debouncedSearchTerm) {
            filters.search_service_name = debouncedSearchTerm;
        }
        // Add other active filters if your UI has them (e.g., service_group_id)

        const blob = await downloadLabPriceListPdf(filters);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab_price_list_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success(t('labSettings:pdfGeneratedSuccess', "Price list PDF generated!"));

    } catch (error: any) {
        console.error("PDF generation error:", error.message);
        toast.error(t('labSettings:pdfGeneratedError', "Failed to generate price list PDF."), {
            description: error.response?.data?.message || error.message
        });
    } finally {
        setIsGeneratingPdf(false);
    }
};


  const testsToDisplay = fields;

  // Split tests into chunks for multi-column display
  const testChunks = useMemo(() => {
     const chunks = [];
     if (!testsToDisplay) return [];
     for (let i = 0; i < testsToDisplay.length; i += numColumns) {
         chunks.push(testsToDisplay.slice(i, i + numColumns));
     }
     return chunks;
  }, [testsToDisplay, numColumns]);

  if (isLoadingTests && !allTests) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t('labSettings:priceListPageTitle')}</h1>
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <Button onClick={handleGeneratePdf} variant="outline" size="sm" disabled={isGeneratingPdf}>
             {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>}
             <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('labSettings:generatePriceListPdf')}</span>
          </Button>
          <Button onClick={handleSubmit(onSubmit)} size="sm" disabled={updatePricesMutation.isPending || !isDirty}>
            {updatePricesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
            <span className="ltr:ml-2 rtl:mr-2 hidden sm:inline">{t('labSettings:saveAllPricesButton')}</span>
          </Button>
        </div>
      </div>
      <CardDescription>{t('labSettings:priceListDescription')}</CardDescription>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border bg-card rounded-lg">
         <div className="relative flex-grow w-full sm:max-w-xs">
             <Input
                 type="search"
                 placeholder={t('labSettings:searchTestsPlaceholder')}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="ps-10 rtl:pr-10 h-9"
             />
             <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
         </div>
         <Button 
             variant="destructive" 
             size="sm" 
             onClick={handleDeleteSelected}
             disabled={deleteMutation.isPending || getValues().tests.filter(t => t.isSelectedForDelete).length === 0}
         >
             <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> 
             {t('labSettings:deleteSelectedButton', { count: getValues().tests.filter(t => t.isSelectedForDelete).length })}
         </Button>
      </div>

      {isLoadingTests && testsToDisplay.length === 0 ? <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : null}
      {!isLoadingTests && testsToDisplay.length === 0 ? (
         <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card">
             {searchTerm ? t('common:noResultsFound') : t('labSettings:noTestsToList')}
         </div>
      ) : (
         <form onSubmit={handleSubmit(onSubmit)}> {/* Main form for submitting all price changes */}
             <ScrollArea className="w-full" style={{maxHeight: 'calc(100vh - 300px)'}}> {/* Adjust max height */}
                 <div className="space-y-1"> {/* Vertical space between rows of items */}
                 {testChunks.map((chunk, rowIndex) => (
                     <div key={`row-${rowIndex}`} className="grid gap-2 items-start" style={{gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`}}>
                         {chunk.map((field, colIndex) => {
                             const actualIndex = rowIndex * numColumns + colIndex;
                             return (
                             <Card key={field.fieldId} className={cn("p-2 text-xs", errors.tests?.[actualIndex]?.price && "border-destructive")}>
                                 <div className="flex items-start gap-2">
                                     <Controller
                                         control={control}
                                         name={`tests.${actualIndex}.isSelectedForDelete`}
                                         render={({ field: checkboxField }) => (
                                             <Checkbox
                                                 id={`delete-${field.id}`}
                                                 checked={checkboxField.value}
                                                 onCheckedChange={checkboxField.onChange}
                                                 className="mt-1"
                                             />
                                         )}
                                     />
                                     <div className="flex-grow space-y-1">
                                         <label htmlFor={`price-${field.id}`} className="block font-medium leading-tight line-clamp-2" title={field.main_test_name}>
                                             {field.main_test_name}
                                         </label>
                                         <Controller
                                             control={control}
                                             name={`tests.${actualIndex}.price`}
                                             render={({ field: priceField }) => (
                                                 <Input
                                                     id={`price-${field.id}`}
                                                     type="number"
                                                     step="0.01"
                                                     className="h-7 text-xs p-1"
                                                     {...priceField}
                                                 />
                                             )}
                                         />
                                         {errors.tests?.[actualIndex]?.price && <p className="text-destructive text-[10px] mt-0.5">{errors.tests[actualIndex]?.price?.message}</p>}
                                     </div>
                                 </div>
                             </Card>
                         );})}
                         {/* Fill empty cells in the last row if chunk is not full */}
                         {Array(numColumns - chunk.length).fill(0).map((_, emptyIndex) => <div key={`empty-${rowIndex}-${emptyIndex}`} />)}
                     </div>
                 ))}
                 </div>
             </ScrollArea>
         </form>
      )}
    </div>
  );
};

export default LabPriceListPage;