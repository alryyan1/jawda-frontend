import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

import type { ChildTest, Unit, ChildGroup, ChildTestFormData } from '@/types/labTests';
import AddUnitDialog from './AddUnitDialog';
import AddChildGroupDialog from './AddChildGroupDialog';

interface ChildTestItemRowProps {
  childTest?: ChildTest;
  units: Unit[];
  childGroups: ChildGroup[];
  onSave: (data: ChildTestFormData, existingChildTestId?: number) => void;
  onCancel: () => void;
  isLoading: boolean;
  onUnitQuickAdd: (newUnit: Unit) => void;
  onChildGroupQuickAdd: (newGroup: ChildGroup) => void;
}

const getChildTestFormSchema = (t: (key: string, options?: { field?: string; count?: number }) => string) => z.object({
  child_test_name: z.string()
    .min(1, { message: t('common:validation.required', { field: t('labTests:childTests.form.name') }) })
    .max(70, { message: t('common:validation.maxLength', { field: t('labTests:childTests.form.name'), count: 70 }) }),
  low: z.string().optional().nullable()
    .refine(val => !val || /^-?\d*\.?\d*$/.test(val || ""), { message: t('common:validation.mustBeNumericOptional') }),
  upper: z.string().optional().nullable()
    .refine(val => !val || /^-?\d*\.?\d*$/.test(val || ""), { message: t('common:validation.mustBeNumericOptional') }),
  defval: z.string().max(1000, { message: t('common:validation.maxLengthText', { count: 1000 })}).optional().nullable(),
  unit_id: z.string().optional().nullable(),
  normalRange: z.string().max(1000, { message: t('common:validation.maxLengthText', { count: 1000 })}).optional().nullable(),
  max: z.string().optional().nullable()
    .refine(val => !val || /^-?\d*\.?\d*$/.test(val || ""), { message: t('common:validation.mustBeNumericOptional') }),
  lowest: z.string().optional().nullable()
    .refine(val => !val || /^-?\d*\.?\d*$/.test(val || ""), { message: t('common:validation.mustBeNumericOptional') }),
  test_order: z.string().optional().nullable()
    .refine(val => !val || /^\d*$/.test(val || ""), { message: t('common:validation.mustBeIntegerOptional') }),
  child_group_id: z.string().optional().nullable(),
}).refine(data => {
    if (data.low && data.upper && !isNaN(parseFloat(data.low)) && !isNaN(parseFloat(data.upper))) {
        return parseFloat(data.low) <= parseFloat(data.upper);
    }
    return true;
  }, {
    message: t('labTests:childTests.validation.lowGreaterThanUpper'),
    path: ['upper'],
}).refine(data => {
    if (data.lowest && data.max && !isNaN(parseFloat(data.lowest)) && !isNaN(parseFloat(data.max))) {
        return parseFloat(data.lowest) <= parseFloat(data.max);
    }
    return true;
  }, {
    message: t('labTests:childTests.validation.lowestGreaterThanMax'),
    path: ['max'],
}).refine(data => {
    if (!data.low && !data.upper && (!data.normalRange || data.normalRange.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: t('labTests:childTests.validation.normalRangeOrNumericRequired'),
    path: ['normalRange'],
});

type ChildTestFormValues = z.infer<ReturnType<typeof getChildTestFormSchema>>;

const ChildTestItemRow: React.FC<ChildTestItemRowProps> = ({
  childTest,
  units,
  childGroups,
  onSave,
  onCancel,
  isLoading,
  onUnitQuickAdd,
  onChildGroupQuickAdd,
}) => {
  const { t, i18n } = useTranslation(['labTests', 'common']);

  const form = useForm<ChildTestFormValues>({
    resolver: zodResolver(getChildTestFormSchema(t)),
    defaultValues: {
      child_test_name: childTest?.child_test_name || '',
      low: (childTest?.low !== null && childTest?.low !== undefined) ? String(childTest.low) : '',
      upper: (childTest?.upper !== null && childTest?.upper !== undefined) ? String(childTest.upper) : '',
      defval: childTest?.defval || '',
      unit_id: childTest?.unit_id ? String(childTest.unit_id) : undefined,
      normalRange: childTest?.normalRange || '',
      max: (childTest?.max !== null && childTest?.max !== undefined) ? String(childTest.max) : '',
      lowest: (childTest?.lowest !== null && childTest?.lowest !== undefined) ? String(childTest.lowest) : '',
      test_order: (childTest?.test_order !== null && childTest?.test_order !== undefined) ? String(childTest.test_order) : '',
      child_group_id: childTest?.child_group_id ? String(childTest.child_group_id) : undefined,
    },
  });
  const { control, handleSubmit } = form;

  const processSubmit = (data: ChildTestFormValues) => {
    const submissionData: ChildTestFormData = {
      child_test_name: data.child_test_name,
      low: data.low?.trim() || undefined,
      upper: data.upper?.trim() || undefined,
      defval: data.defval?.trim() || undefined,
      unit_id: data.unit_id || undefined,
      normalRange: data.normalRange?.trim() || undefined,
      max: data.max?.trim() || undefined,
      lowest: data.lowest?.trim() || undefined,
      test_order: data.test_order?.trim() || undefined,
      child_group_id: data.child_group_id || undefined,
    };
    onSave(submissionData, childTest?.id);
  };

  return (
    <Card className="p-4 my-3 shadow-md bg-card border border-border transition-all animate-in fade-in-50">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
            {/* Row 1: Name */}
            <FormField control={control} name="child_test_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('labTests:childTests.form.name')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('labTests:childTests.form.namePlaceholder', "e.g., WBC, Glucose, Color")} disabled={isLoading} className="h-9"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Row 2: Low, Upper, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <FormField control={control} name="low" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.low')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="text" disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="upper" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.upper')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="text" disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="unit_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.unit')}</FormLabel>
                  <div className="flex items-center gap-1">
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""} dir={i18n.dir()} disabled={isLoading}>
                      <FormControl className="flex-grow">
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t('labTests:childTests.form.selectUnit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t('common:none')}</SelectItem>
                        {units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <AddUnitDialog onUnitAdded={onUnitQuickAdd} />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Textual Normal Range */}
            <FormField control={control} name="normalRange" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('labTests:childTests.form.normalRangeText')}</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ''} rows={2} placeholder={t('labTests:childTests.form.normalRangePlaceholder', "e.g., < 5.0 or Positive/Negative")} disabled={isLoading} className="text-xs"/>
                </FormControl>
                <FormDescription className="text-xs">{t('labTests:childTests.form.normalRangeDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Row 4: Critical Low, Critical High, Display Order */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField control={control} name="lowest" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.criticalLow')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="text" disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="max" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.criticalHigh')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="text" disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="test_order" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.displayOrder')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="number" disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 5: Child Group, Default Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormField control={control} name="child_group_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.group')}</FormLabel>
                  <div className="flex items-center gap-1">
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""} dir={i18n.dir()} disabled={isLoading}>
                      <FormControl className="flex-grow">
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t('labTests:childTests.form.selectGroup')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t('common:none')}</SelectItem>
                        {childGroups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <AddChildGroupDialog onChildGroupAdded={onChildGroupQuickAdd} />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={control} name="defval" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('labTests:childTests.form.defaultValue')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} disabled={isLoading} className="h-9"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ChildTestItemRow;