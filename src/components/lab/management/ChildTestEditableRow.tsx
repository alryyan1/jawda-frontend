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
  FormHelperText,
  TableCell, 
  TableRow,
  Box,
  CircularProgress,
  IconButton
} from "@mui/material";
import { Add as PlusIcon, DragIndicator as DragIcon } from "@mui/icons-material";

import type {
  Unit,
  ChildGroup,
  ChildTestFormData,
} from "@/types/labTests";
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
  const { control, handleSubmit, reset, register, formState: { errors } } = form;

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
      <TableCell className="py-1 w-10 text-center align-top pt-3">
        <DragIcon className="h-5 w-5 text-muted-foreground/30 cursor-not-allowed" />
      </TableCell>
      <TableCell colSpan={6} className="p-0 align-top">
        <form onSubmit={handleSubmit(processSubmit)}>
          <Box sx={{ display: 'grid', gap: 1.5, p: 1 }}>
            <TextField
              size="small"
              placeholder="اسم الفحص"
              {...register('child_test_name')}
            />

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
              <TextField size="small" placeholder="الحد الأدنى" {...register('low')} />
              <TextField size="small" placeholder="الحد الأعلى" {...register('upper')} />
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

            <TextField size="small" placeholder="المدى الطبيعي (نص)" {...register('normalRange')} />

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
              <TextField size="small" placeholder="أقل قيمة حرجة" {...register('lowest')} />
              <TextField size="small" placeholder="أعلى قيمة حرجة" {...register('max')} />
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

            <TextField size="small" placeholder="القيمة الافتراضية" {...register('defval')} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
              <Button type="button" variant="outlined" size="small" onClick={onCancel} disabled={isSaving}>إلغاء</Button>
              <Button type="submit" variant="contained" size="small" disabled={isSaving}>حفظ</Button>
            </Box>
          </Box>
        </form>
      </TableCell>
    </TableRow>
  );
};
export default ChildTestEditableRow;
