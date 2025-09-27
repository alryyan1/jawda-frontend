// src/components/lab/workstation/MainCommentDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress
} from '@mui/material';

interface MainCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentComment: string | null | undefined;
  onSave: (comment: string) => void;
  isSaving?: boolean;
}

const MainCommentDialog: React.FC<MainCommentDialogProps> = ({
  isOpen,
  onOpenChange,
  currentComment,
  onSave,
  isSaving
}) => {
  const { control, setValue, watch } = useForm<{ comment: string }>({
    defaultValues: { comment: currentComment || '' },
  });

  const commentText = watch('comment');

  useEffect(() => {
    if (isOpen) {
      setValue('comment', currentComment || '');
    }
  }, [isOpen, currentComment, setValue]);

  const handleSave = () => {
    if (currentComment !== commentText) {
        onSave(commentText);
    }
    onOpenChange(false);
  };
  
  const handleDialogClose = () => {
    if (currentComment !== commentText) {
        if(window.confirm('هل تريد تجاهل التغييرات؟')) {
             onOpenChange(false);
        }
    } else {
        onOpenChange(false);
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      sx={{ direction: 'rtl' }}
    >
      <DialogTitle sx={{ textAlign: 'right', fontWeight: 'bold' }}>
        تعديل ملاحظة التحليل الرئيسي
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                multiline
                rows={8}
                fullWidth
                placeholder="أدخل ملاحظة للتحليل الرئيسي..."
                variant="outlined"
                sx={{
                  '& .MuiInputBase-input': {
                    textAlign: 'right',
                    direction: 'rtl'
                  }
                }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-start', px: 3, pb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleDialogClose}
          sx={{ ml: 1 }}
        >
          إلغاء
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          disabled={isSaving || commentText === currentComment}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MainCommentDialog;