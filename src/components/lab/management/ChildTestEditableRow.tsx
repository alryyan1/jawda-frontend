// src/components/lab/management/ChildTestEditableRow.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TableCell, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, GripVertical } from "lucide-react";

import type {
  Unit,
  ChildGroup,
  ChildTestFormData,
} from "@/types/labTests";
import { Card, CardContent } from "@/components/ui/card";
import AddUnitDialog from "../AddUnitDialog";
import AddChildGroupDialog from "../AddChildGroupDialog";

interface ChildTestEditableRowProps {
  initialData?: Partial<ChildTestFormData>; // For pre-filling (new row or edit)
  units: Unit[];
  isLoadingUnits: boolean;
  childGroups: ChildGroup[];
  isLoadingChildGroups: boolean;
  onSave: (data: ChildTestFormData) => void;
  onCancel: () => void;
  isSaving: boolean; // Loading state from parent's mutation
  onUnitQuickAdd: (newUnit: Unit) => void;
  onChildGroupQuickAdd: (newGroup: ChildGroup) => void;
}

// Zod Schema (same as defined before in previous model answers for ChildTestItemRow)
const getChildTestFormSchema = (t: (key: string, options?: any) => string) =>
  z
    .object({
      child_test_name: z
        .string()
        .min(1, {
          message: t("common:validation.required", {
            field: t("labTests:childTests.form.name"),
          }),
        })
        .max(70),
      low: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) =>
            !val || val.trim() === "" || /^-?\d*\.?\d*$/.test(val.trim()),
          { message: t("common:validation.mustBeNumericOptional") }
        ),
      upper: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) =>
            !val || val.trim() === "" || /^-?\d*\.?\d*$/.test(val.trim()),
          { message: t("common:validation.mustBeNumericOptional") }
        ),
      defval: z.string().max(1000).optional().nullable(),
      unit_id: z.string().optional().nullable(),
      normalRange: z.string().max(1000).optional().nullable(),
      max: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) =>
            !val || val.trim() === "" || /^-?\d*\.?\d*$/.test(val.trim()),
          { message: t("common:validation.mustBeNumericOptional") }
        ),
      lowest: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) =>
            !val || val.trim() === "" || /^-?\d*\.?\d*$/.test(val.trim()),
          { message: t("common:validation.mustBeNumericOptional") }
        ),
      test_order: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) => !val || val.trim() === "" || /^\d*$/.test(val.trim()),
          { message: t("common:validation.mustBeIntegerOptional") }
        ),
      child_group_id: z.string().optional().nullable(),
    })
    .refine(
      () => {
        /* low <= upper */ return true;
      },
      {
        message: t("labTests:childTests.validation.lowGreaterThanUpper"),
        path: ["upper"],
      }
    )
    .refine(
      () => {
        /* lowest <= max */ return true;
      },
      {
        message: t("labTests:childTests.validation.lowestGreaterThanMax"),
        path: ["max"],
      }
    );
// Add normalRange required if low/upper empty refinement if needed

type ChildTestFormValues = z.infer<ReturnType<typeof getChildTestFormSchema>>;

const ChildTestEditableRow: React.FC<ChildTestEditableRowProps> = ({
  initialData,
  units,
  isLoadingUnits,
  childGroups,
  isLoadingChildGroups,
  onSave,
  onCancel,
  isSaving,
  onUnitQuickAdd,
  onChildGroupQuickAdd,
}) => {
  const { t, i18n } = useTranslation(["labTests", "common"]);
  const childTestSchema = getChildTestFormSchema(t);

  const form = useForm<ChildTestFormValues>({
    resolver: zodResolver(childTestSchema),
    defaultValues: {
      child_test_name: initialData?.child_test_name || "",
      low: initialData?.low || "",
      upper: initialData?.upper || "",
      defval: initialData?.defval || "",
      unit_id: initialData?.unit_id || undefined,
      normalRange: initialData?.normalRange || "",
      max: initialData?.max || "",
      lowest: initialData?.lowest || "",
      test_order: initialData?.test_order || "", // Will be set by DND, not user input here
      child_group_id: initialData?.child_group_id || undefined,
    },
  });
  const { control, handleSubmit, reset } = form;

  // Re-initialize form if initialData changes (e.g., switching which item is being edited)
  useEffect(() => {
    reset({
      child_test_name: initialData?.child_test_name || "",
      low: initialData?.low || "",
      upper: initialData?.upper || "",
      defval: initialData?.defval || "",
      unit_id: initialData?.unit_id || undefined,
      normalRange: initialData?.normalRange || "",
      max: initialData?.max || "",
      lowest: initialData?.lowest || "",
      test_order: initialData?.test_order || "",
      child_group_id: initialData?.child_group_id || undefined,
    });
  }, [initialData, reset]);

  const processSubmit = (data: ChildTestFormValues) => {
    const submissionData: ChildTestFormData = {
      child_test_name: data.child_test_name,
      low: data.low?.trim() ? data.low : undefined,
      upper: data.upper?.trim() ? data.upper : undefined,
      defval: data.defval?.trim() || undefined,
      unit_id: data.unit_id || undefined,
      normalRange: data.normalRange?.trim() || undefined,
      max: data.max?.trim() ? data.max : undefined,
      lowest: data.lowest?.trim() ? data.lowest : undefined,
      test_order: data.test_order?.trim() ? data.test_order : undefined, // Backend may ignore this from direct edit
      child_group_id: data.child_group_id || undefined,
    };
    onSave(submissionData);
  };

  return (
    <TableRow className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15 !shadow-lg relative z-10">
      {" "}
      {/* Highlight & elevate editable row */}
      {/* Drag handle placeholder cell - not actually draggable while editing */}
      <TableCell className="py-1 w-10 text-center align-top pt-3">
        <GripVertical className="h-5 w-5 text-muted-foreground/30 cursor-not-allowed" />
      </TableCell>
      {/* We need to wrap the form around the cells OR provide form context to each cell */}
      {/* For simplicity and direct use with RHF, one <Form> wrapping all FormFields is easier */}
      {/* This requires the Form to be outside TableRow or for TableRow to accept a form prop */}
      {/* The provided solution places Form inside a single TableCell spanning columns */}
      <TableCell colSpan={6} className="p-0 align-top">
        {" "}
        {/* One cell to contain the form card */}
        <Form {...form}>
          <form onSubmit={handleSubmit(processSubmit)}>
            <Card className="p-3 sm:p-4 my-0 shadow-none border-0 rounded-none bg-transparent">
              {" "}
              {/* Transparent card */}
              <CardContent className="p-0 space-y-3">
                {/* Row 1: Name */}
                <FormField
                  control={control}
                  name="child_test_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sr-only">
                        {t("labTests:childTests.form.name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-8 text-xs"
                          placeholder={t("labTests:childTests.form.name")}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                {/* Grouping for Range, Unit, Group */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-3 items-start">
                  <FormField
                    control={control}
                    name="low"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.low")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value || ""}
                            className="h-8 text-xs"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="upper"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.upper")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value || ""}
                            className="h-8 text-xs"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.unit")}
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                            dir={i18n.dir()}
                            disabled={isLoadingUnits || isSaving}
                          >
                            <FormControl className="flex-grow">
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue
                                  placeholder={t(
                                    "labTests:childTests.form.selectUnit"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("common:none")}
                              </SelectItem>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddUnitDialog
                            onUnitAdded={onUnitQuickAdd}
                            triggerButton={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                disabled={isSaving}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={control}
                  name="normalRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("labTests:childTests.form.normalRangeText")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={1}
                          {...field}
                          value={field.value || ""}
                          className="h-8 text-xs resize-none"
                          placeholder={t(
                            "labTests:childTests.form.normalRangePlaceholder"
                          )}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-3 items-start">
                  <FormField
                    control={control}
                    name="lowest"
                    render={({ field }) => (
                      /* Critical Low */ <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.criticalLow")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value || ""}
                            className="h-8 text-xs"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="max"
                    render={({ field }) => (
                      /* Critical High */ <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.criticalHigh")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value || ""}
                            className="h-8 text-xs"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="child_group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("labTests:childTests.form.group")}
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                            dir={i18n.dir()}
                            disabled={isLoadingChildGroups || isSaving}
                          >
                            <FormControl className="flex-grow">
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue
                                  placeholder={t(
                                    "labTests:childTests.form.selectGroup"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("common:none")}
                              </SelectItem>
                              {childGroups.map((g) => (
                                <SelectItem key={g.id} value={String(g.id)}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AddChildGroupDialog
                            onChildGroupAdded={onChildGroupQuickAdd}
                            triggerButton={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                disabled={isSaving}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={control}
                  name="defval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("labTests:childTests.form.defaultValue")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                {/* test_order is removed from form */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    {t("common:cancel")}
                  </Button>
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving && (
                      <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                    )}
                    {t("common:save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </TableCell>
    </TableRow>
  );
};
export default ChildTestEditableRow;
