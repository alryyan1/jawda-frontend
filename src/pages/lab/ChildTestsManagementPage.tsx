// src/pages/lab/ChildTestsManagementPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  PlusCircle,
  Save,
  XCircle,
  Trash2,
  ArrowLeft,
  Pencil as Edit,
} from "lucide-react";

import type {
  ChildTest,
  Unit,
  ChildGroup,
  ChildTestFormData,
  MainTest,
} from "@/types/labTests";
import { getMainTestById } from "@/services/mainTestService";
import {
  getChildTestsForMainTest,
  createChildTest,
  updateChildTest,
  deleteChildTest,
} from "@/services/childTestService";
import { getUnits } from "@/services/unitService";
import { getChildGroups } from "@/services/childGroupService";
import AddUnitDialog from "@/components/lab/AddUnitDialog";
import AddChildGroupDialog from "@/components/lab/AddChildGroupDialog";

// Zod Schema for a single child test row in the editable table
const getChildTestRowSchema = () =>
  z.object({
    _localId: z.string().optional(),
    id: z.number().optional().nullable(),
    child_test_name: z.string().min(1).max(70),
    low: z.string().optional().nullable(),
    upper: z.string().optional().nullable(),
    defval: z.string().max(1000).optional().nullable(),
    unit_id: z.string().optional().nullable(),
    normalRange: z.string().max(1000).optional().nullable(),
    max: z.string().optional().nullable(),
    lowest: z.string().optional().nullable(),
    test_order: z.string().optional().nullable(),
    child_group_id: z.string().optional().nullable(),
  });
type ChildTestRowFormValues = z.infer<ReturnType<typeof getChildTestRowSchema>>;

// Zod Schema for the whole array of child tests
const getChildTestsArraySchema = () =>
  z.object({
    childTestRows: z.array(getChildTestRowSchema()),
  });
type ChildTestsArrayFormValues = z.infer<
  ReturnType<typeof getChildTestsArraySchema>
>;

const ChildTestsManagementPage: React.FC = () => {
  const { mainTestId } = useParams<{ mainTestId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["labTests", "common"]);
  const queryClient = useQueryClient();

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null); // Index of the row being edited/added

  const { data: mainTest, isLoading: isLoadingMainTest } = useQuery<
    MainTest,
    Error
  >({
    queryKey: ["mainTestForChildParams", mainTestId],
    queryFn: () => getMainTestById(Number(mainTestId)).then((res) => res.data),
    enabled: !!mainTestId,
  });

  // Form to manage the array of child tests
  const form = useForm<ChildTestsArrayFormValues>({
    resolver: zodResolver(getChildTestsArraySchema()),
    defaultValues: { childTestRows: [] },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "childTestRows",
    keyName: "arrayId",
  });

  // Memoize the query key to prevent unnecessary re-renders
  const childTestsQueryKey = useMemo(() => ["childTestsForMainTest", mainTestId] as const, [mainTestId]);

  // Fetch existing child tests and populate the form array
  const { isLoading: isLoadingInitialChildTests } = useQuery<ChildTest[], Error>({
    queryKey: childTestsQueryKey,
    queryFn: () =>
      mainTestId ? getChildTestsForMainTest(Number(mainTestId)) : Promise.resolve([]),
    enabled: !!mainTestId,
  });

  useEffect(() => {
    if (isLoadingInitialChildTests || !mainTestId) return;
    
    const childTests = queryClient.getQueryData<ChildTest[]>(childTestsQueryKey);
    if (!childTests) return;

    const formattedData = childTests.map((ct: ChildTest) => ({
      ...ct,
      _localId: ct.id ? `existing-${ct.id}` : `new-${Date.now()}`,
      low: ct.low !== null && ct.low !== undefined ? String(ct.low) : "",
      upper: ct.upper !== null && ct.upper !== undefined ? String(ct.upper) : "",
      max: ct.max !== null && ct.max !== undefined ? String(ct.max) : "",
      lowest: ct.lowest !== null && ct.lowest !== undefined ? String(ct.lowest) : "",
      test_order: ct.test_order !== null && ct.test_order !== undefined ? String(ct.test_order) : "",
      unit_id: ct.unit_id ? String(ct.unit_id) : undefined,
      child_group_id: ct.child_group_id ? String(ct.child_group_id) : undefined,
    }));
    
    reset({ childTestRows: formattedData });
    setEditingRowIndex(null);
  }, [isLoadingInitialChildTests, mainTestId, childTestsQueryKey, reset]);

  const { data: units = [], isLoading: isLoadingUnits } = useQuery<Unit[], Error>({
    queryKey: ["unitsListForChildTests"],
    queryFn: () => getUnits().then(res => res.data),
  });

  const { data: childGroups = [], isLoading: isLoadingChildGroups } = useQuery<ChildGroup[], Error>({
    queryKey: ["childGroupsListForChildTests"],
    queryFn: () => getChildGroups().then(res => res.data),
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (rowData: ChildTestRowFormValues) => {
        // alert('createOrUpdateMutation '+ mainTestId)
      if (!mainTestId) throw new Error("Main Test ID is missing.");
      const payload: ChildTestFormData = {
        child_test_name: rowData.child_test_name,
        low: rowData.low || undefined,
        upper: rowData.upper || undefined,
        defval: rowData.defval || undefined,
        unit_id: rowData.unit_id || undefined,
        normalRange: rowData.normalRange || undefined,
        max: rowData.max || undefined,
        lowest: rowData.lowest || undefined,
        test_order: rowData.test_order || undefined,
        child_group_id: rowData.child_group_id || undefined,
      };
    //   alert('createOrUpdateMutation')
      if (rowData.id) {
        return updateChildTest(rowData.id, payload);
      } else {
        return createChildTest(Number(mainTestId), payload);
      }
    },
    onSuccess: () => {
      toast.success(
        t(
          editingRowIndex !== null && fields[editingRowIndex]?.id
            ? "labTests:childTests.updatedSuccess"
            : "labTests:childTests.addedSuccess"
        )
      );
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
      setEditingRowIndex(null);
    },
    onError: () => {
      toast.error(t("common:error.saveFailed", { entity: t("labTests:childTests.entityName") }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (childTestId: number) => deleteChildTest(childTestId),
    onSuccess: () => {
      toast.success(t("labTests:childTests.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: childTestsQueryKey });
    },
    onError: () => {
      toast.error(t("labTests:childTests.deleteError"));
    }
  });

  const handleAddNewRow = () => {
    const newRowDefault: ChildTestRowFormValues = {
      _localId: `new-${Date.now()}-${Math.random()}`, // Unique local ID for react key
      id: undefined,
      child_test_name: "",
      low: "",
      upper: "",
      defval: "",
      unit_id: undefined,
      normalRange: "",
      max: "",
      lowest: "",
      test_order: String(fields.length + 1),
      child_group_id: undefined,
    };
    append(newRowDefault);
    setEditingRowIndex(fields.length); // Set the new row to be in edit mode
  };

  const handleSaveRow = (index: number) => {
    const rowData = getValues(`childTestRows.${index}`); // Get data for specific row
    console.log("rowData", rowData);
    // Trigger validation for this specific row if possible, or rely on main submit
    // For simplicity, assuming direct mutation for now
    createOrUpdateMutation.mutate(rowData);
  };

  const handleCancelRowEdit = (index: number) => {
    const rowData = getValues(`childTestRows.${index}`);
    if (!rowData.id) {
      // If it was a new, unsaved row
      remove(index);
    }
    setEditingRowIndex(null);
    // Optionally, reset that row to its original values if it was an existing one being edited
    // This requires fetching original data again or storing it, which adds complexity.
    // A simpler approach is to just refetch all on cancel if data was dirty.
    // For now, just exits edit mode. User can click edit again.
  };

  const handleDeleteRow = (index: number) => {
    const rowData = getValues(`childTestRows.${index}`);
    if (rowData.id) {
      // Only delete if it's a persisted record
      if (window.confirm(t("labTests:childTests.deleteConfirm"))) {
        deleteMutation.mutate(rowData.id, {
          onSuccess: () => {
            // Remove the row from the form state after successful deletion
            remove(index);
            if (editingRowIndex === index) setEditingRowIndex(null);
          }
        });
      }
    } else {
      // If it's a new, unsaved row
      remove(index);
      if (editingRowIndex === index) setEditingRowIndex(null);
    }
  };

  const handleUnitAddedForRow = (index: number, newUnit: Unit) => {
    queryClient.invalidateQueries({ queryKey: ["unitsListForChildTests"] }); // Or global 'unitsList'
    setValue(`childTestRows.${index}.unit_id`, String(newUnit.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };
  const handleChildGroupAddedForRow = (index: number, newGroup: ChildGroup) => {
    queryClient.invalidateQueries({
      queryKey: ["childGroupsListForChildTests"],
    });
    setValue(`childTestRows.${index}.child_group_id`, String(newGroup.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  if (isLoadingMainTest || isLoadingInitialChildTests)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {t("common:loading")}
      </div>
    );

  return (
    <div style={{direction: i18n.dir()  == 'rtl' ? 'ltr' : 'rtl'}} className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/settings/laboratory/${mainTestId}/edit`)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {t("labTests:childTests.managePageTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("labTests:childTests.forMainTest", {
                testName: mainTest?.main_test_name || "...",
              })}
            </p>
          </div>
        </div>
        <Button
          onClick={handleAddNewRow}
          size="sm"
          disabled={isSubmitting || createOrUpdateMutation.isPending}
        >
          <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("labTests:childTests.addParameterButton")}
        </Button>
      </div>

      <Form {...form}>
        
        {/* Main form wrapping the table */}
        <form
          onSubmit={handleSubmit(() => {
            /* This main form submit might not be used if rows save individually */
          })}
        >
          <Card>
            <CardContent className="pt-4">
              {isLoadingInitialChildTests ? (
                <div className="text-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : fields.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("labTests:childTests.noChildTestsYet")}
                </p>
              ) : (
                <Table className="min-w-[900px]">
                  
                  {/* Ensure table can scroll horizontally if needed */}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">
                        {t("labTests:childTests.form.name")}
                      </TableHead>
                      <TableHead className="w-[80px]">
                        {t("labTests:childTests.form.low")}
                      </TableHead>
                      <TableHead className="w-[80px]">
                        {t("labTests:childTests.form.upper")}
                      </TableHead>
                      <TableHead className="w-[150px]">
                        {t("labTests:childTests.form.unit")}
                      </TableHead>
                      <TableHead className="w-[180px]">
                        {t("labTests:childTests.form.normalRangeText")}
                      </TableHead>
                      <TableHead className="w-[100px]">
                        {t("labTests:childTests.form.group")}
                      </TableHead>
                      <TableHead className="w-[70px]">
                        {t("labTests:childTests.form.displayOrder")}
                      </TableHead>
                      <TableHead className="text-right w-[120px]">
                        {t("common:actions.openMenu")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const isCurrentRowEditing = editingRowIndex === index;
                      return (
                        <TableRow
                          key={item.arrayId}
                          className={
                            isCurrentRowEditing
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : ""
                          }
                        >
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`childTestRows.${index}.child_test_name`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  className="h-8 text-xs"
                                  disabled={
                                    !isCurrentRowEditing ||
                                    createOrUpdateMutation.isPending
                                  }
                                />
                              )}
                            />
                            <FormMessage>
                              {
                                errors.childTestRows?.[index]?.child_test_name
                                  ?.message
                              }
                            </FormMessage>
                          </TableCell>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`childTestRows.${index}.low`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  value={String(field.value || "")}
                                  className="h-8 text-xs"
                                  disabled={
                                    !isCurrentRowEditing ||
                                    createOrUpdateMutation.isPending
                                  }
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`childTestRows.${index}.upper`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  value={String(field.value || "")}
                                  className="h-8 text-xs"
                                  disabled={
                                    !isCurrentRowEditing ||
                                    createOrUpdateMutation.isPending
                                  }
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <FormField
                                control={control}
                                name={`childTestRows.${index}.unit_id`}
                                render={({ field }) => (
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    disabled={
                                      !isCurrentRowEditing ||
                                      isLoadingUnits ||
                                      createOrUpdateMutation.isPending
                                    }
                                    dir={i18n.dir()}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs flex-grow">
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
                                      {units?.map((u) => (
                                        <SelectItem
                                          key={u.id}
                                          value={String(u.id)}
                                        >
                                          {u.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {isCurrentRowEditing && (
                                <AddUnitDialog
                                  onUnitAdded={(unit) =>
                                    handleUnitAddedForRow(index, unit)
                                  }
                                  triggerButton={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                    >
                                      <PlusCircle className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`childTestRows.${index}.normalRange`}
                              render={({ field }) => (
                                <Textarea
                                  {...field}
                                  value={String(field.value || "")}
                                  rows={1}
                                  className="h-8 text-xs resize-none"
                                  disabled={
                                    !isCurrentRowEditing ||
                                    createOrUpdateMutation.isPending
                                  }
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <FormField
                                control={control}
                                name={`childTestRows.${index}.child_group_id`}
                                render={({ field }) => (
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                    disabled={
                                      !isCurrentRowEditing ||
                                      isLoadingChildGroups ||
                                      createOrUpdateMutation.isPending
                                    }
                                    dir={i18n.dir()}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs flex-grow">
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
                                      {childGroups?.map((g) => (
                                        <SelectItem
                                          key={g.id}
                                          value={String(g.id)}
                                        >
                                          {g.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {isCurrentRowEditing && (
                                <AddChildGroupDialog
                                  onChildGroupAdded={(group) =>
                                    handleChildGroupAddedForRow(index, group)
                                  }
                                  triggerButton={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                    >
                                      <PlusCircle className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <FormField
                              control={control}
                              name={`childTestRows.${index}.test_order`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  value={String(field.value || "")}
                                  className="h-8 text-xs w-16 text-center"
                                  disabled={
                                    !isCurrentRowEditing ||
                                    createOrUpdateMutation.isPending
                                  }
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right py-1">
                            {isCurrentRowEditing ? (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSaveRow(index)}
                                  disabled={createOrUpdateMutation.isPending}
                                  className="h-7 w-7"
                                >
                                  {createOrUpdateMutation.status === 'pending' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleCancelRowEdit(index)}
                                  className="h-7 w-7"
                                >
                                  <XCircle className="h-4 w-4 text-slate-500" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingRowIndex(index)}
                                  className="h-7 w-7"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRow(index)}
                                  disabled={
                                    deleteMutation.isPending &&
                                    deleteMutation.variables === item.id
                                  }
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                >
                                  {deleteMutation.isPending &&
                                  deleteMutation.variables === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
export default ChildTestsManagementPage;
