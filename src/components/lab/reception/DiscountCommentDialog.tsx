// src/components/lab/reception/DiscountCommentDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Loader2 } from 'lucide-react';

interface DiscountCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentComment: string | null | undefined;
  onSave: (comment: string) => void;
  isSaving?: boolean;
  labRequestId: number;
}

const DiscountCommentDialog: React.FC<DiscountCommentDialogProps> = ({
  isOpen,
  onOpenChange,
  currentComment,
  onSave,
  isSaving,
  labRequestId
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
    if (commentText.trim()) {
      onSave(commentText.trim());
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
    >
      <DialogTitle>
        تعليق الخصم
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
                rows={6}
                fullWidth
                placeholder="أدخل تعليق الخصم..."
                variant="outlined"
                sx={{ 
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem',
                  }
                }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleDialogClose}
          disabled={isSaving}
        >
          إلغاء
        </Button>
        <Button 
          variant="contained"
          onClick={handleSave} 
          disabled={isSaving || !commentText.trim()}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscountCommentDialog; 