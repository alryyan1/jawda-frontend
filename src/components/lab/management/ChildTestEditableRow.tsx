// src/components/lab/management/ChildTestEditableRow.tsx
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Box
} from "@mui/material";
import { Add as PlusIcon, DataObject as JsonIcon } from "@mui/icons-material";

import type {
  Unit,
  ChildGroup,
  ChildTestFormData,
} from "@/types/labTests";
import AddUnitDialog from "../AddUnitDialog";
import AddChildGroupDialog from "../AddChildGroupDialog";
import JsonParamsDialog from "./JsonParamsDialog";
import { getChildTestJsonParams, updateChildTestJsonParams } from "@/services/childTestService";
import { toast } from 'sonner';

interface ChildTestEditableRowProps {
  initialData?: (Partial<ChildTestFormData> & { id?: number }); // Include optional id for edit ops
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

type ChildTestFormValues = {
  child_test_name: string;
  low?: string | null;
  upper?: string | null;
  defval?: string | null;
  unit_id?: string | null;
  normalRange?: string | null;
  max?: string | null;
  lowest?: string | null;
  test_order?: string | null;
  child_group_id?: string | null;
};

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
  const [jsonOpen, setJsonOpen] = React.useState(false);
  const [isSavingJson, setIsSavingJson] = React.useState(false);
  const [jsonInitial, setJsonInitial] = React.useState<unknown>({});
  const form = useForm<ChildTestFormValues>({
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
  const { control, handleSubmit, reset, register } = form;

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

  const handleOpenJson = async () => {
    console.log('handleOpenJson', initialData);
    // Fetch first, then open to avoid flicker/empty state
    if (initialData && 'id' in initialData && initialData.id) {
      try {
        const fresh = await getChildTestJsonParams(initialData.id as number);
        setJsonInitial(fresh ?? {});
      } catch {
        toast.error('تعذر تحميل بيانات JSON');
        setJsonInitial((initialData as { json_params?: unknown })?.json_params ?? {});
      }
    } else {
      setJsonInitial((initialData as { json_params?: unknown })?.json_params ?? {});
    }
    setJsonOpen(true);
  };
  const handleCloseJson = () => setJsonOpen(false);
  const handleSaveJson = async (value: unknown) => {
    if (!initialData || !('id' in initialData) || !initialData.id) {
      // Cannot save without an id; close only
      setJsonOpen(false);
      return;
    }
    try {
      setIsSavingJson(true);
      await updateChildTestJsonParams(initialData.id as number, value);
      setJsonOpen(false);
    } finally {
      setIsSavingJson(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)}>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          size="small"
          label="اسم الفحص"
          placeholder="اسم الفحص"
          {...register('child_test_name')}
          onFocus={(e) => e.target.select()}
          onMouseUp={(e) => e.preventDefault()}
        />

        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
          <TextField size="small" label="الحد الأدنى" placeholder="الحد الأدنى" {...register('low')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />
          <TextField size="small" label="الحد الأعلى" placeholder="الحد الأعلى" {...register('upper')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="unit-label">الوحدة</InputLabel>
              <Controller
                control={control}
                name="unit_id"
                render={({ field }) => (
                  <Select labelId="unit-label" label="الوحدة" value={field.value || ''} onChange={(e) => field.onChange(e.target.value)} disabled={isLoadingUnits || isSaving}>
                    <MenuItem value=" ">بدون</MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <AddUnitDialog
              onUnitAdded={onUnitQuickAdd}
              triggerButton={
                <Button type="button" variant="outlined" size="small" disabled={isSaving}>
                  <PlusIcon fontSize="small" />
                </Button>
              }
            />
          </Box>
        </Box>

        <TextField size="small" label="المدى الطبيعي (نص)" placeholder="المدى الطبيعي (نص)" multiline rows={6} {...register('normalRange')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />

        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
          <TextField size="small" label="أقل قيمة حرجة" placeholder="أقل قيمة حرجة" {...register('lowest')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />
          <TextField size="small" label="أعلى قيمة حرجة" placeholder="أعلى قيمة حرجة" {...register('max')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="group-label">المجموعة</InputLabel>
              <Controller
                control={control}
                name="child_group_id"
                render={({ field }) => (
                  <Select labelId="group-label" label="المجموعة" value={field.value || ''} onChange={(e) => field.onChange(e.target.value)} disabled={isLoadingChildGroups || isSaving}>
                    <MenuItem value=" ">بدون</MenuItem>
                    {childGroups.map((g) => (
                      <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <AddChildGroupDialog
              onChildGroupAdded={onChildGroupQuickAdd}
              triggerButton={
                <Button type="button" variant="outlined" size="small" disabled={isSaving}>
                  <PlusIcon fontSize="small" />
                </Button>
              }
            />
          </Box>
        </Box>

        <TextField size="small" label="القيمة الافتراضية" placeholder="القيمة الافتراضية" {...register('defval')} onFocus={(e) => e.target.select()} onMouseUp={(e) => e.preventDefault()} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 1 }}>
          <Button type="button" variant="outlined" size="small" startIcon={<JsonIcon fontSize="small" />} onClick={handleOpenJson} disabled={isSaving || isSavingJson}>باراميترات JSON</Button>
          <Button type="button" variant="outlined" size="small" onClick={onCancel} disabled={isSaving}>إلغاء</Button>
          <Button type="submit" variant="contained" size="small" disabled={isSaving}>حفظ</Button>
        </Box>
        <JsonParamsDialog open={jsonOpen} initialJson={jsonInitial} onClose={handleCloseJson} onSave={handleSaveJson} />
      </Box>
    </form>
  );
};
export default ChildTestEditableRow;
