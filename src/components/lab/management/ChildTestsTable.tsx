import React, { useState, useEffect } from "react";
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
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import { Add as PlusIcon } from "@mui/icons-material";
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
  onStartAddNew?: () => void;
  onStartEdit?: (ct: ChildTest) => void;
  highlightedId?: number | null;
}

const ChildTestsTable: React.FC<ChildTestsTableProps> = ({
  mainTestId: _mainTestId, // Currently unused but kept for potential future use
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
  onStartAddNew,
  onStartEdit,
  highlightedId,
}) => {
  const [displayableChildTests, setDisplayableChildTests] = useState<ChildTest[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeFormChildTest, setActiveFormChildTest] = useState<(Partial<ChildTestFormDataType> & { id?: number }) | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSavingChildTest, setIsSavingChildTest] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderHasChanged, setOrderHasChanged] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);

  // Mark mainTestId as intentionally unused for now
  void _mainTestId;

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
        toast.success("تم حفظ ترتيب الفحوصات بنجاح");
        setOrderHasChanged(false);
      } catch {
        toast.error("خطأ في حفظ ترتيب الفحوصات");
      } finally {
        setIsSavingOrder(false);
      }
    } else if (displayableChildTests.some((ct) => !ct.id)) {
      toast.info("يرجى حفظ العناصر الجديدة قبل تغيير الترتيب");
      setOrderHasChanged(false);
    }
  };

  const handleStartAddNew = () => {
    if (typeof onStartAddNew === 'function') {
      onStartAddNew();
    }
  };

  const handleStartEdit = (ct: ChildTest) => {
    if (typeof onStartEdit === 'function') {
      onStartEdit(ct);
    }
    setActiveFormChildTest({
      id: ct.id,
      child_test_name: ct.child_test_name,
      low: typeof ct.low === 'number' ? String(ct.low) : (ct.low ?? ''),
      upper: typeof ct.upper === 'number' ? String(ct.upper) : (ct.upper ?? ''),
      defval: ct.defval ?? '',
      unit_id: ct.unit_id ? String(ct.unit_id) : undefined,
      normalRange: ct.normalRange ?? '',
      max: typeof ct.max === 'number' ? String(ct.max) : (ct.max ?? ''),
      lowest: typeof ct.lowest === 'number' ? String(ct.lowest) : (ct.lowest ?? ''),
      test_order: ct.test_order != null ? String(ct.test_order) : undefined,
      child_group_id: ct.child_group_id ? String(ct.child_group_id) : undefined,
    });
    setEditingId(ct.id ?? null);
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
        setLastSavedId(editingId);
      } else {
        const res = await onSaveNewChildTest(data);
        const newId = (res && typeof (res as unknown) === 'object' && (res as ChildTest).id) ? (res as ChildTest).id : null;
        if (newId) {
          setLastSavedId(newId);
        }
      }
      handleCancelEditOrAdd();
    } catch (e) {
      console.error("Save child test failed from table", e);
    } finally {
      setIsSavingChildTest(false);
    }
  };

  useEffect(() => {
    if (lastSavedId) {
      const timer = setTimeout(() => setLastSavedId(null), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastSavedId]);

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
      <Box display="flex" justifyContent="center" alignItems="center" p={6}>
        <CircularProgress />
      </Box>
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
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 3 }}>
        {orderHasChanged && canReorder && (
          <Button
            onClick={saveOrder}
            size="small"
            variant="outlined"
            disabled={isSavingOrder || isSavingChildTest}
            startIcon={isSavingOrder ? <CircularProgress size={16} /> : null}
          >
            حفظ الترتيب
          </Button>
        )}
        {canAdd && (
          <Button
            onClick={handleStartAddNew}
            size="small"
            variant="contained"
            disabled={isSavingChildTest}
            startIcon={<PlusIcon />}
          >
            إضافة باراميتر
          </Button>
        )}
      </Box>

      {displayableChildTests.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>
          لا توجد فحوصات فرعية بعد
        </Typography>
      ) : (
        <Paper sx={{ overflow: 'hidden' }}>
          {canReorder && (
            <Alert severity="info" sx={{ borderRadius: 0, mb: 0 }}>
              <Typography variant="caption">
                اسحب العناصر لإعادة ترتيبها
              </Typography>
            </Alert>
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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40, display: { xs: 'none', print: 'none' } }}></TableCell>
                      <TableCell align="center">الاسم</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        الوحدة
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        المجموعة
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        النطاق الطبيعي
                      </TableCell>
                      <TableCell align="center">ترتيب العرض</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayableChildTests.map((ct, index) => (
                      <ChildTestDisplayRow
                        key={ct._localId || String(ct.id)}
                        childTest={{ ...ct, _localId: ct._localId || String(ct.id), test_order: index + 1 }}
                        isHighlighted={ct.id != null && (highlightedId ?? lastSavedId) === ct.id}
                        onEdit={(id) => {
                          const found = displayableChildTests.find((x) => x.id === id);
                          if (found) {
                            handleStartEdit(found);
                          }
                        }}
                        onDelete={(id) => {
                          if (typeof id === 'number') {
                            void handleDeleteFromDisplayRow(id);
                          }
                        }}
                        onManageOptions={(child) => onManageOptions(child)}
                        isDeletingThisRow={isDeletingId === ct.id}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canManageOptions={canManageOptions}
                        canReorder={canReorder}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SortableContext>
          </DndContext>
        </Paper>
      )}
    </Box>
  );
};

export default ChildTestsTable;
