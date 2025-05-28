// src/components/lab/workstation/ResultEntryPanel.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertTriangle, XCircle } from 'lucide-react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

import type { LabRequest } from '@/types/visits';
import type { ChildTestOption } from '@/types/labTests';
import type { MainTestWithChildrenResults, ResultEntryFormValues, ResultEntryItemFormValue, ChildTestWithResult } from '@/types/labWorkflow';
import { getLabRequestForEntry, saveLabResults } from '@/services/labWorkflowService';
import { cn } from '@/lib/utils';
import { TableBody, TableCell, TableHead, TableHeader, TableRow ,Table } from '@/components/ui/table';
import { Paper } from '@mui/material';

interface ResultEntryPanelProps {
  initialLabRequest: LabRequest;
  onResultsSaved: () => void;
  onClosePanel?: () => void;
  onChildTestFocus: (childTest: ChildTestWithResult | null) => void;
}

type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

// Zod schema for one result item - refine validation as needed
const getResultItemSchema = (t: TranslateFunction, childTest: ChildTestWithResult) => {
  const resultValidator = z.string().optional().nullable();

  // Basic validation: if not option-based and has numeric range, expect a number
  if (!(childTest.options && childTest.options.length > 0) && (childTest.low !== null || childTest.upper !== null)) {
    // resultValidator = resultValidator.refine(val => !val || /^-?\d*\.?\d*$/.test(val), {
    //   message: t('common:validation.mustBeNumericOptional')
    // });
  }

  return z.object({
    child_test_id: z.number(),
    child_test_name: z.string(),
    unit_name: z.string().optional().nullable(),
    normal_range_text: z.string().optional().nullable(),
    options: z.array(z.custom<ChildTestOption>()).optional(),
    is_numeric: z.boolean().optional(),
    is_boolean_result: z.boolean().optional(),

    result_value: resultValidator,
    result_flags: z.string().max(10, t('common:validation.maxLengthShort', {count: 10})).optional().nullable(),
    result_comment: z.string().max(255, t('common:validation.maxLength', {field: t('labResults:resultEntry.comment'), count: 255})).optional().nullable(),
  });
};

// Zod schema for the whole form
const getResultEntrySchema = (t: TranslateFunction) => z.object({
  results: z.array(getResultItemSchema(t, {} as ChildTestWithResult)),
  main_test_comment: z.string().max(1000).optional().nullable(),
});

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({ initialLabRequest, onResultsSaved, onClosePanel, onChildTestFocus }) => {
  const { t } = useTranslation(['labResults', 'common', 'labTests', 'payments']);
  const queryClient = useQueryClient();
  // alert('This component is deprecated and will be removed in future versions. Please use the new lab results entry panel.');
  const { data: testDataForEntry, isLoading, error: fetchError } = useQuery<MainTestWithChildrenResults, Error>({
    queryKey: ['labRequestForEntry', initialLabRequest.id],
    queryFn: () => getLabRequestForEntry(initialLabRequest.id),
    enabled: !!initialLabRequest.id,
  });

  const form = useForm<ResultEntryFormValues>({
    defaultValues: { results: [], main_test_comment: initialLabRequest.comment || '' },
  });
  const { control, handleSubmit, setValue, formState: { isDirty } } = form;

  const { fields, replace } = useFieldArray({
    control,
    name: "results",
    keyName: "fieldId" 
  });

  // Populate form with fetched child tests and their existing results
  useEffect(() => {
    if (testDataForEntry) {
      const formattedResults: ResultEntryItemFormValue[] = testDataForEntry.child_tests_with_results.map(ct => {
        const isNumeric = !(ct.options && ct.options.length > 0) && 
                          (ct.low !== null || ct.upper !== null || !String(ct.defval || '').match(/[a-zA-Z]/));
        // Simple check for boolean type (e.g. "Positive/Negative", "Present/Absent")
        const isBooleanResult = ct.options && ct.options.length === 2 && 
                                ct.options.every(opt => /^(positive|negative|present|absent|yes|no|true|false)$/i.test(opt.name));

        return {
          child_test_id: ct.id!,
          child_test_name: ct.child_test_name,
          unit_name: ct.unit?.name || ct.unit_name,
          normal_range_text: ct.normalRange || ( (ct.low !== null && ct.low !== undefined) && (ct.upper !== null && ct.upper !== undefined) ? `${ct.low} - ${ct.upper}` : ''),
          options: ct.options || [],
          is_numeric: isNumeric,
          is_boolean_result: isBooleanResult,
          result_value: ct.result_value !== undefined ? ct.result_value : (ct.defval || null),
          result_flags: ct.result_flags || '',
          result_comment: ct.result_comment || '',
        };
      });
      replace(formattedResults);
      setValue('main_test_comment', initialLabRequest.comment || '');
    } else {
      replace([]);
    }
  }, [testDataForEntry, replace, setValue, initialLabRequest.comment]);

  const saveResultsMutation = useMutation({
    mutationFn: (data: ResultEntryFormValues) => saveLabResults(initialLabRequest.id, data),
    onSuccess: () => {
      toast.success(t('labResults:resultEntry.resultsSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', initialLabRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', initialLabRequest.doctor_visit_id] });
      queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] });
      onResultsSaved();
    },
    onError: () => {
      toast.error(t('common:error.saveFailed', { entity: t('labResults:results') }));
    }
  });

  const onSubmit = (data: ResultEntryFormValues) => {
    saveResultsMutation.mutate(data);
  };

  const filterOptions = createFilterOptions<string>();

  if (isLoading && !testDataForEntry) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">{t('common:loading')}</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-6">
        <AlertTriangle className="h-12 w-12 mb-4"/>
        <p className="font-semibold">{t('common:error.fetchFailed', { entity: t('labResults:results') })}</p>
        <p className="text-sm mt-1">{fetchError.message}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 bg-slate-50 dark:bg-background shadow-inner">
      <div className="flex justify-between items-center mb-3 pb-2 border-b flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold">{t('labResults:resultEntry.title', { testName: testDataForEntry?.main_test_name || initialLabRequest.main_test?.main_test_name })}</h2>
          <p className="text-xs text-muted-foreground">
            {t('common:labRequestId')}: {initialLabRequest.id}
            {testDataForEntry?.is_trailer_hidden && <Badge variant="outline" className="ltr:ml-2 rtl:mr-2 text-xs">{t('labResults:testSelection.trailerShort')}</Badge>}
          </p>
        </div>
        {onClosePanel && (
          <Button variant="ghost" size="sm" onClick={onClosePanel} className="h-8 px-2">
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow pr-2 mb-3">
            {fields.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-10">{t('labResults:resultEntry.noChildTestsForEntry')}</div>
            )}
            <div className="space-y-4">
              {fields.map((item, index) => (
               <Table key={item.fieldId} className="min-w-[400px]"> {/* Simple table for results */}
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[40%] sm:w-[35%]">{t('labResults:resultEntry.childTestName')}</TableHead>
                   <TableHead className="w-[60%] sm:w-[45%]">{t('labResults:resultEntry.result')}</TableHead>
                   <TableHead className="hidden sm:table-cell w-[20%]">{t('labResults:resultEntry.flags')}</TableHead>
                   {/* Comment might be in a separate row or a small input below result */}
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {fields.map((item, index) => (
                   <TableRow key={item.fieldId}>
                     <TableCell className="py-1.5 align-top font-medium text-xs sm:text-sm">
                       {item.child_test_name}
                       <div className="text-[10px] text-muted-foreground">
                          {item.unit_name && <span>({item.unit_name})</span>}
                          {/* Normal range is now shown in StatusAndInfoPanel on focus */}
                       </div>
                     </TableCell>
                     <TableCell className="py-1.5 align-top">
                       <FormField
                         control={control}
                         name={`results.${index}.result_value`}
                         render={({ field }) => (
                           <FormItem className="w-full">
                             {/* <FormLabel className="sr-only">Result</FormLabel> */}
                             <FormControl>
                               {item.is_qualitative_with_options && item.options ? (
                                 <Autocomplete
                                   fullWidth
                                   size="small"
                                   options={item.options} // These are ChildTestOption objects
                                   getOptionLabel={(option) => typeof option === 'string' ? option : option.name} // Handle string or object
                                   value={field.value} // RHF value can be string or ChildTestOption object
                                   onChange={(event, newValue) => {
                                      // newValue can be string (if freeSolo and new value) or ChildTestOption object or null
                                      field.onChange(newValue);
                                   }}
                                   onFocus={() => onChildTestFocus(testDataForEntry?.child_tests_with_results[index] || null)}
                                   onBlur={() => onChildTestFocus(null)} // Clear focus
                                   isOptionEqualToValue={(option, value) => option.name === (typeof value === 'string' ? value : value?.name)}
                                   freeSolo // Allow typing values not in the list
                                   filterOptions={(options, params) => {
                                      const filtered = filter(options, params);
                                      const { inputValue } = params;
                                      const isExisting = options.some((option) => inputValue === option.name);
                                      if (inputValue !== '' && !isExisting) {
                                        // Create a temporary option object for the new string value
                                        filtered.push({ id: 0, child_test_id: item.child_test_id, name: inputValue });
                                      }
                                      return filtered;
                                    }}
                                   renderInput={(params) => (
                                     <TextField {...params} 
                                          variant="outlined" 
                                          placeholder={t('labResults:resultEntry.enterOrSelectResult')}
                                          sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem', padding: '1px 6px !important', backgroundColor: 'var(--background)', borderRadius: 'var(--radius)' }, '& .MuiInputLabel-root': {fontSize: '0.875rem'} }}
                                     />
                                   )}
                                   disabled={saveResultsMutation.isPending}
                                   PaperComponent={props => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100"/>}
                                 />
                               ) : (
                                 <Input 
                                   {...field} 
                                   value={field.value || ''}
                                   onChange={(e) => field.onChange(e.target.value)}
                                   onFocus={() => onChildTestFocus(testDataForEntry?.child_tests_with_results[index] || null)}
                                   onBlur={() => onChildTestFocus(null)} // Clear focus
                                   type={item.is_numeric ? "number" : "text"}
                                   step={item.is_numeric ? "any" : undefined}
                                   className="h-9 text-sm" 
                                   disabled={saveResultsMutation.isPending}
                                 />
                               )}
                             </FormControl>
                             <FormMessage className="text-xs"/>
                           </FormItem>
                         )}
                       />
                     </TableCell>
                     <TableCell className="py-1.5 align-top hidden sm:table-cell">
                       <FormField control={control} name={`results.${index}.result_flags`} render={({ field }) => (
                           <FormItem><FormControl><Input {...field} value={field.value || ''} className="h-9 text-sm w-20" placeholder={t('labResults:resultEntry.flagsShort')} disabled={saveResultsMutation.isPending}/></FormControl></FormItem>
                       )}/>
                     </TableCell>
                     {/* Comment could be a separate row or a larger textarea below if needed */}
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 flex-shrink-0">
            <FormField
              control={control}
              name="main_test_comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labResults:resultEntry.mainTestComment')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      className="h-20 resize-none text-sm"
                      placeholder={t('labResults:resultEntry.mainTestCommentPlaceholder')}
                      disabled={saveResultsMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage className="text-xs"/>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 mt-4">
              {onClosePanel && <Button type="button" variant="outline" onClick={onClosePanel} disabled={saveResultsMutation.isPending}>{t('common:closePanel')}</Button>}
              <Button type="submit" disabled={saveResultsMutation.isPending || !isDirty}>
                {saveResultsMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('labResults:resultEntry.saveResultsButton')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ResultEntryPanel;