// src/components/lab/workstation/MainCommentDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  CircularProgress
} from '@mui/material';
import CodeEditor from './CodeEditor';

interface MainCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentComment: string | null | undefined;
  onSave: (comment: string) => void;
  isSaving?: boolean;
  patient?: Record<string, unknown>; // Add patient prop for CodeEditor
  setActivePatient?: (patient: Record<string, unknown>) => void; // Add setActivePatient prop
  labRequestId?: number; // Add labRequestId for saving comments
}

const MainCommentDialog: React.FC<MainCommentDialogProps> = ({
  isOpen,
  onOpenChange,
  currentComment,
  onSave,
  isSaving,
  patient,
  setActivePatient,
  labRequestId
}) => {
  const { setValue } = useForm<{ comment: string }>({
    defaultValues: { comment: currentComment || '' },
  });

  const [codeOptions, setCodeOptions] = useState<string[]>([]);
  const [currentValue, setCurrentValue] = useState(currentComment || '');

  useEffect(() => {
    if (isOpen) {
      setValue('comment', currentComment || '');
      setCurrentValue(currentComment || '');
    }
  }, [isOpen, currentComment, setValue]);

  const handleSave = () => {
    if (currentComment !== currentValue) {
        onSave(currentValue);
    }
    onOpenChange(false);
  };
  
  const handleDialogClose = () => {
    if (currentComment !== currentValue) {
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
          <CodeEditor
            options={codeOptions}
            setOptions={setCodeOptions}
            init={currentValue}
            colName="comment"
            patient={patient || {}}
            setActivePatient={setActivePatient || (() => {})}
            width="100%"
            labRequestId={labRequestId}
            onSave={(value) => {
              setCurrentValue(value);
              setValue('comment', value);
            }}
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
          disabled={isSaving || currentValue === currentComment}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MainCommentDialog;