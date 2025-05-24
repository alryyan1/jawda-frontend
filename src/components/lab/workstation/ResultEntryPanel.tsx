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

interface ResultEntryPanelProps {
  initialLabRequest: LabRequest;
  onResultsSaved: () => void;
  onClosePanel?: () => void;
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

const ResultEntryPanel: React.FC<ResultEntryPanelProps> = ({ initialLabRequest, onResultsSaved, onClosePanel }) => {
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
                <Card key={item.fieldId} className="p-3 shadow-sm">
                  <h4 className="font-medium text-sm mb-1.5">{item.child_test_name}</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-x-3 gap-y-2 items-start">
                    {/* Result Value Input */}
                    <FormField
                      control={control}
                      name={`results.${index}.result_value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sr-only">{t('labResults:resultEntry.result')}</FormLabel>
                          <FormControl>
                            {item.options && item.options.length > 0 ? (
                              <Autocomplete
                                options={item.options.map(opt => opt.name)}
                                getOptionLabel={(option) => option}
                                value={field.value || null}
                                onChange={(event, newValue) => field.onChange(newValue)}
                                freeSolo={!item.is_boolean_result}
                                filterOptions={(options, params) => {
                                    const filtered = filterOptions(options, params);
                                    if (params.inputValue !== '' && !item.is_boolean_result) {
                                        filtered.push(params.inputValue);
                                    }
                                    return filtered;
                                }}
                                renderInput={(params) => (
                                  <TextField {...params} 
                                    variant="outlined" 
                                    size="small" 
                                    className="mui-autocomplete-custom bg-background text-sm"
                                    placeholder={t('labResults:resultEntry.enterOrSelectResult')}
                                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem', padding: '2px 8px !important' } }}
                                  />
                                )}
                                disabled={saveResultsMutation.isPending}
                                size="small"
                                fullWidth
                              />
                            ) : item.is_boolean_result ? (
                                <div className="flex items-center space-x-2 pt-1.5">
                                    <Checkbox id={`bool-res-${item.child_test_id}`} 
                                        checked={field.value === t('common:yes')}
                                        onCheckedChange={(checked) => field.onChange(checked ? t('common:yes') : t('common:no'))}
                                    />
                                    <label htmlFor={`bool-res-${item.child_test_id}`} className="text-sm">
                                        {field.value === t('common:yes') ? t('common:yes') : (field.value === t('common:no') ? t('common:no') : t('common:selectValue'))}
                                    </label>
                                </div>
                            ) : (
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                type={item.is_numeric ? "number" : "text"}
                                step={item.is_numeric ? "any" : undefined}
                                className="h-9 text-sm" 
                                placeholder={t('labResults:resultEntry.enterResult')}
                                disabled={saveResultsMutation.isPending}
                              />
                            )}
                          </FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <div className="text-xs text-muted-foreground pt-1 sm:pt-[26px]">
                       {item.unit_name && <span className="whitespace-nowrap">({item.unit_name})</span>}
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 sm:pt-[26px] truncate" title={item.normal_range_text || ''}>
                       {item.normal_range_text || t('common:notApplicableShort')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-2 mt-1.5">
                    <FormField control={control} name={`results.${index}.result_flags`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs sr-only">{t('labResults:resultEntry.flags')}</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-8 text-xs" placeholder={t('labResults:resultEntry.flagsPlaceholder')} disabled={saveResultsMutation.isPending}/></FormControl></FormItem>
                    )}/>
                    <FormField control={control} name={`results.${index}.result_comment`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs sr-only">{t('labResults:resultEntry.comment')}</FormLabel><FormControl><Input {...field} value={field.value || ''} className="h-8 text-xs" placeholder={t('labResults:resultEntry.commentPlaceholder')} disabled={saveResultsMutation.isPending}/></FormControl></FormItem>
                    )}/>
                  </div>
                </Card>
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