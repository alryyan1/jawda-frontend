// src/components/lab/ManageChildTestOptionsDialog.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

import type { ChildTest, ChildTestOption } from '@/types/labTests';
import { getChildTestOptionsList, createChildTestOption, updateChildTestOption, deleteChildTestOption } from '@/services/childTestOptionService';

interface ManageChildTestOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  childTest: ChildTest | null;
}

const optionSchema = z.object({
  name: z.string().min(1, 'هذا الحقل مطلوب').max(255)
});

type OptionFormValues = z.infer<ReturnType<typeof optionSchema>>;

const ManageChildTestOptionsDialog: React.FC<ManageChildTestOptionsDialogProps> = ({ isOpen, onOpenChange, childTest }) => {
  const queryClient = useQueryClient();
  const [editingOption, setEditingOption] = useState<ChildTestOption | null>(null);

  const optionsQueryKey = ['childTestOptions', childTest?.id];
  const { data: options = [], isLoading } = useQuery<ChildTestOption[]>({
    queryKey: optionsQueryKey,
    queryFn: () => childTest ? getChildTestOptionsList(childTest.id!) : Promise.resolve([]),
    enabled: !!childTest && isOpen,
  });

  const form = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema),
    defaultValues: { name: '' }
  });

  const createMutation = useMutation({
    mutationFn: ({ childTestId, data }: { childTestId: number; data: OptionFormValues }) => 
      createChildTestOption(childTestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      form.reset();
      toast.success('تمت إضافة الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل إضافة الخيار');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ optionId, data }: { optionId: number; data: OptionFormValues }) =>
      updateChildTestOption(optionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      form.reset();
      setEditingOption(null);
      toast.success('تم تحديث الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل تحديث الخيار');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: number) => deleteChildTestOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      toast.success('تم حذف الخيار بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل حذف الخيار');
    }
  });

  const handleSaveOption = (data: OptionFormValues) => {
    if (!childTest) return;
    if (editingOption) {
      updateMutation.mutate({ optionId: editingOption.id, data });
    } else {
      createMutation.mutate({ childTestId: childTest.id!, data });
    }
  };

  const handleEditOption = (option: ChildTestOption) => {
    setEditingOption(option);
    form.setValue('name', option.name);
  };

  const handleDeleteOption = (optionId: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الخيار؟')) {
      deleteMutation.mutate(optionId);
    }
  };

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="sm">
      <DialogTitle>خيارات الفحص الفرعي</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={form.handleSubmit(handleSaveOption)} sx={{ mt: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="اسم الخيار"
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? (
                <CircularProgress size={18} sx={{ color: 'white' }} />
              ) : editingOption ? (
                <Edit className="h-4 w-4" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
            </Button>
          </Box>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : options.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary', fontSize: 14 }}>
            لا توجد خيارات مسجلة
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell align="right">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {options.map((option) => (
                <TableRow key={option.id} hover>
                  <TableCell>{option.name}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEditOption(option)}>
                        <Edit className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteOption(option.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageChildTestOptionsDialog;