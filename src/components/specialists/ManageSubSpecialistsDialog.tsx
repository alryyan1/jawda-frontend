// src/components/specialists/ManageSubSpecialistsDialog.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Paper,
} from '@mui/material';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';

import {
  getSubSpecialists,
  createSubSpecialist,
  updateSubSpecialist,
  deleteSubSpecialist,
  type SubSpecialistFormData,
} from '@/services/subSpecialistService';
import type { Specialist, SubSpecialist } from '@/types/doctors';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ManageSubSpecialistsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specialist: Specialist | null;
}

const subSpecialistSchema = z.object({
  name: z.string().min(1, { message: 'اسم الاختصاص الفرعي مطلوب' }).max(255),
});

const ManageSubSpecialistsDialog: React.FC<ManageSubSpecialistsDialogProps> = ({
  isOpen,
  onOpenChange,
  specialist,
}) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subSpecialistToDelete, setSubSpecialistToDelete] = useState<SubSpecialist | null>(null);

  const { data: subSpecialists, isLoading, refetch } = useQuery<SubSpecialist[], Error>({
    queryKey: ['subSpecialists', specialist?.id],
    queryFn: () => getSubSpecialists(specialist!.id),
    enabled: isOpen && !!specialist,
  });

  const form = useForm<SubSpecialistFormData>({
    resolver: zodResolver(subSpecialistSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<SubSpecialistFormData>({
    resolver: zodResolver(subSpecialistSchema),
    defaultValues: { name: '' },
  });

  const createMutation = useMutation({
    mutationFn: (data: SubSpecialistFormData) => createSubSpecialist(specialist!.id, data),
    onSuccess: () => {
      toast.success('تم إضافة الاختصاص الفرعي بنجاح');
      form.reset();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['subSpecialists'] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'فشل في إضافة الاختصاص الفرعي';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubSpecialistFormData }) =>
      updateSubSpecialist(specialist!.id, id, data),
    onSuccess: () => {
      toast.success('تم تحديث الاختصاص الفرعي بنجاح');
      setEditingId(null);
      editForm.reset();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['subSpecialists'] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'فشل في تحديث الاختصاص الفرعي';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubSpecialist(specialist!.id, id),
    onSuccess: () => {
      toast.success('تم حذف الاختصاص الفرعي بنجاح');
      setSubSpecialistToDelete(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['subSpecialists'] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'فشل في حذف الاختصاص الفرعي';
      toast.error(errorMessage);
    },
  });

  const handleStartEdit = (subSpecialist: SubSpecialist) => {
    setEditingId(subSpecialist.id);
    editForm.reset({ name: subSpecialist.name });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    editForm.reset();
  };

  const handleSubmitCreate = (data: SubSpecialistFormData) => {
    createMutation.mutate(data);
  };

  const handleSubmitEdit = (data: SubSpecialistFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    }
  };

  if (!specialist) return null;

  return (
    <>
      <Dialog open={isOpen} onClose={() => onOpenChange(false)} maxWidth="md" fullWidth dir="rtl">
        <DialogTitle>
          إدارة الاختصاصات الفرعية - {specialist.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              قم بإضافة أو تعديل الاختصاصات الفرعية للاختصاص المحدد
            </Typography>

            {/* Add New Form */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box component="form" onSubmit={form.handleSubmit(handleSubmitCreate)} sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  {...form.register('name')}
                  fullWidth
                  label="اسم الاختصاص الفرعي"
                  placeholder="أدخل اسم الاختصاص الفرعي"
                  disabled={createMutation.isPending}
                  error={!!form.formState.errors.name}
                  helperText={form.formState.errors.name?.message}
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={createMutation.isPending}
                  startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <Plus className="h-4 w-4" />}
                  sx={{ minWidth: 120 }}
                >
                  {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                </Button>
              </Box>
            </Paper>

            {/* List of Sub Specialists */}
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </Box>
            ) : subSpecialists && subSpecialists.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell className="text-center">م</TableCell>
                    <TableCell className="text-center">الاسم</TableCell>
                    <TableCell className="text-center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subSpecialists.map((subSpec) => (
                    <TableRow key={subSpec.id}>
                      {editingId === subSpec.id ? (
                        <>
                          <TableCell className="text-center">{subSpec.id}</TableCell>
                          <TableCell>
                            <Box component="form" onSubmit={editForm.handleSubmit(handleSubmitEdit)} sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                {...editForm.register('name')}
                                fullWidth
                                size="small"
                                disabled={updateMutation.isPending}
                                error={!!editForm.formState.errors.name}
                                helperText={editForm.formState.errors.name?.message}
                              />
                              <Button
                                type="submit"
                                size="small"
                                variant="contained"
                                disabled={updateMutation.isPending}
                              >
                                حفظ
                              </Button>
                              <Button
                                type="button"
                                size="small"
                                variant="outlined"
                                onClick={handleCancelEdit}
                                disabled={updateMutation.isPending}
                              >
                                إلغاء
                              </Button>
                            </Box>
                          </TableCell>
                          <TableCell />
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center">{subSpec.id}</TableCell>
                          <TableCell className="text-center">{subSpec.name}</TableCell>
                          <TableCell className="text-center">
                            <IconButton
                              size="small"
                              onClick={() => handleStartEdit(subSpec)}
                              color="primary"
                            >
                              <Edit className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setSubSpecialistToDelete(subSpec)}
                              color="error"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                لا توجد اختصاصات فرعية
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onOpenChange(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      <AlertDialog open={!!subSpecialistToDelete} onOpenChange={(open) => !open && setSubSpecialistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {`هل أنت متأكد من حذف الاختصاص الفرعي '${subSpecialistToDelete?.name}'؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => subSpecialistToDelete && deleteMutation.mutate(subSpecialistToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ManageSubSpecialistsDialog;

