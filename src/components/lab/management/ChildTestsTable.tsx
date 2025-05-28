import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import type {
  ChildTest,
  Unit,
  ChildGroup,
  ChildTestFormData as ChildTestFormDataType,
} from "@/types/labTests";
import ChildTestDisplayRow from "./ChildTestDisplayRow";
import ChildTestEditableRow from "./ChildTestEditableRow";

interface ChildTestsTableProps {
  mainTestId: number;
  initialChildTests: ChildTest[];
  isLoadingList: boolean;
  units: Unit[];
  isLoadingUnits: boolean;
  childGroups: ChildGroup[];
  isLoadingChildGroups: boolean;
  onSaveNewChildTest: (data: ChildTestFormDataType) => Promise<ChildTest | void>;
  onUpdateChildTest: (id: number, data: ChildTestFormDataType) => Promise<ChildTest | void>;
  onDeleteChildTest: (id: number) => Promise<void>;
  onOrderChange: (orderedIds: number[]) => Promise<void>;
  onManageOptions: (childTest: ChildTest) => void;
  onUnitQuickAdd: (newUnit: Unit) => void;
  onChildGroupQuickAdd: (newGroup: ChildGroup) => void;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageOptions: boolean;
  canReorder: boolean;
}

const ChildTestsTable: React.FC<ChildTestsTableProps> = ({
  initialChildTests,
  isLoadingList,
  units,
  isLoadingUnits,
  childGroups,
  isLoadingChildGroups,
  onSaveNewChildTest,
  onUpdateChildTest,
  onDeleteChildTest,
  onOrderChange,
  onManageOptions,
  canAdd,
  canEdit,
  canDelete,
  canManageOptions,
  canReorder,
  onUnitQuickAdd,
  onChildGroupQuickAdd,
}) => {
  const { t } = useTranslation(["labTests", "common"]);
  const [displayableChildTests, setDisplayableChildTests] = useState<ChildTest[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeFormChildTest, setActiveFormChildTest] = useState<Partial<ChildTestFormDataType> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSavingChildTest, setIsSavingChildTest] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderHasChanged, setOrderHasChanged] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const processedTests = initialChildTests
      .map((ct, index) => ({
        ...ct,
        _localId: ct._localId || String(ct.id) || `prop-${ct.id || index}-${Date.now()}`,
        test_order: ct.test_order || index + 1,
      }))
      .sort((a, b) => Number(a.test_order || 0) - Number(b.test_order || 0));
    setDisplayableChildTests(processedTests);
    setOrderHasChanged(false);
  }, [initialChildTests]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        tolerance: 5,
        delay: 0
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDisplayableChildTests((items) => {
        const oldIndex = items.findIndex(
          (item) => item._localId === active.id || String(item.id) === active.id
        );
        const newIndex = items.findIndex(
          (item) => item._localId === over.id || String(item.id) === over.id
        );
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrderedItems = arrayMove(items, oldIndex, newIndex);
          setOrderHasChanged(true);
          return newOrderedItems;
        }
        return items;
      });
    }
  };

  const saveOrder = async () => {
    // alert("saveOrder");
    if (!canReorder || !orderHasChanged) return;
    const orderedPersistedIds = displayableChildTests
      .map((ct) => ct.id)
      .filter((id): id is number => id !== undefined && id !== null);

    if (orderedPersistedIds.length > 0) {
      setIsSavingOrder(true);
      try {
        await onOrderChange(orderedPersistedIds);
        toast.success(t("labTests:childTests.orderSavedSuccess"));
        setOrderHasChanged(false);
      } catch {
        toast.error(t("labTests:childTests.orderSaveError"));
      } finally {
        setIsSavingOrder(false);
      }
    } else if (displayableChildTests.some((ct) => !ct.id)) {
      toast.info(t("labTests:childTests.saveNewItemsBeforeOrder"));
      setOrderHasChanged(false);
    }
  };

  const handleStartAddNew = () => {
    setActiveFormChildTest({
      child_test_name: "",
      test_order: String(displayableChildTests.length + 1),
    });
    setIsAddingNew(true);
  };

  const handleStartEdit = (ct: ChildTest) => {
    setEditingId(ct.id!);
    setActiveFormChildTest({
      child_test_name: ct.child_test_name,
      low: ct.low !== null ? String(ct.low) : "",
      upper: ct.upper !== null ? String(ct.upper) : "",
      defval: ct.defval || "",
      unit_id: ct.unit_id ? String(ct.unit_id) : undefined,
      normalRange: ct.normalRange || "",
      max: ct.max !== null ? String(ct.max) : "",
      lowest: ct.lowest !== null ? String(ct.lowest) : "",
      test_order: String(ct.test_order || 0),
      child_group_id: ct.child_group_id ? String(ct.child_group_id) : undefined,
    });
    setIsAddingNew(false);
  };

  const handleCancelEditOrAdd = () => {
    setIsAddingNew(false);
    setActiveFormChildTest(null);
    setEditingId(null);
  };

  const handleSaveFromEditableRow = async (data: ChildTestFormDataType) => {
    setIsSavingChildTest(true);
    try {
      if (!isAddingNew && editingId) {
        await onUpdateChildTest(editingId, data);
      } else {
        await onSaveNewChildTest(data);
      }
      handleCancelEditOrAdd();
    } catch (e) {
      console.error("Save child test failed from table", e);
    } finally {
      setIsSavingChildTest(false);
    }
  };

  const handleDeleteFromDisplayRow = async (id: number) => {
    setIsDeletingId(id);
    try {
      await onDeleteChildTest(id);
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoadingList && displayableChildTests.length === 0) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAddingNew || activeFormChildTest) {
    return (
      <ChildTestEditableRow
        key={
          !isAddingNew && editingId
            ? `edit-${editingId}`
            : "new-child-test"
        }
        initialData={activeFormChildTest || undefined}
        units={units}
        isLoadingUnits={isLoadingUnits}
        childGroups={childGroups}
        isLoadingChildGroups={isLoadingChildGroups}
        onSave={handleSaveFromEditableRow}
        onCancel={handleCancelEditOrAdd}
        isSaving={isSavingChildTest}
        onUnitQuickAdd={onUnitQuickAdd}
        onChildGroupQuickAdd={onChildGroupQuickAdd}
      />
    );
  }

  return (
    <div className="space-y-3 max-w-[1200px] mx-auto">
      <div className="flex justify-end items-center gap-2">
        {orderHasChanged && canReorder && (
          <Button
            onClick={saveOrder}
            size="sm"
            variant="outline"
            disabled={isSavingOrder || isSavingChildTest}
          >
            {isSavingOrder && (
              <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
            )}
            {t("labTests:childTests.saveOrderButton")}
          </Button>
        )}
        {canAdd && (
          <Button
            onClick={handleStartAddNew}
            size="sm"
            disabled={isSavingChildTest}
          >
            <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("labTests:childTests.addParameterButton")}
          </Button>
        )}
      </div>

      {displayableChildTests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("labTests:childTests.noChildTestsYet")}
        </p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          {canReorder && (
            <p className="text-xs text-muted-foreground p-2 text-center bg-amber-50 dark:bg-amber-900/20 border-b">
              {t("labTests:childTests.dragToReorder")}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          >
            <SortableContext
              items={displayableChildTests.map(
                (ct) => ct._localId || String(ct.id)
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 print:hidden text-center"></TableHead>
                        <TableHead className="text-center">{t("labTests:childTests.form.name")}</TableHead>
                        <TableHead className="hidden sm:table-cell text-center">
                          {t("labTests:childTests.form.unit")}
                        </TableHead>
                        <TableHead className="hidden md:table-cell text-center">
                          {t("labTests:childTests.form.group")}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell text-center">
                          {t("labTests:childTests.form.normalRangeText")}
                        </TableHead>
                        <TableHead className="text-center">
                          {t("labTests:childTests.form.displayOrder")}
                        </TableHead>
                        <TableHead className="text-center">
                          {t("common:actions.openMenu")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayableChildTests.map((ct, index) => (
                        <ChildTestDisplayRow
                          key={ct._localId || String(ct.id)}
                          childTest={{ ...ct, _localId: ct._localId || String(ct.id), test_order: index + 1 }}
                          onEdit={() => handleStartEdit(ct)}
                          onDelete={() => handleDeleteFromDisplayRow(ct.id!)}
                          onManageOptions={onManageOptions}
                          isDeletingThisRow={isDeletingId === ct.id}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          canManageOptions={canManageOptions}
                          canReorder={canReorder}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default ChildTestsTable;
