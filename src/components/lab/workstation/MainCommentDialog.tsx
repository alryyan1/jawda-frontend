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
import { Brain } from 'lucide-react';
import { toast } from 'sonner';
import CodeEditor from './CodeEditor';
import geminiService from '@/services/geminiService';

interface MainCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentComment: string | null | undefined;
  onSave: (comment: string) => void;
  isSaving?: boolean;
  patient?: Record<string, unknown>; // Add patient prop for CodeEditor
  setActivePatient?: (patient: Record<string, unknown>) => void; // Add setActivePatient prop
  labRequestId?: number; // Add labRequestId for saving comments
  testResults?: any; // Add test results for AI analysis
}

const MainCommentDialog: React.FC<MainCommentDialogProps> = ({
  isOpen,
  onOpenChange,
  currentComment,
  onSave,
  isSaving,
  patient,
  setActivePatient,
  labRequestId,
  testResults
}) => {
  const { setValue } = useForm<{ comment: string }>({
    defaultValues: { comment: currentComment || '' },
  });

  const [codeOptions, setCodeOptions] = useState<string[]>([]);
  const [currentValue, setCurrentValue] = useState(currentComment || '');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  useEffect(() => {
    if (isOpen && !aiApplied) {
      setValue('comment', currentComment || '');
      setCurrentValue(currentComment || '');
    }
  }, [isOpen, currentComment, setValue, aiApplied]);

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
    // Reset AI state when dialog closes
    setAiApplied(false);
  }

  const handleGenerateAIInterpretation = async () => {
    if (!testResults) {
      toast.error('لا توجد نتائج تحاليل للتحليل');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Test connection first
      console.log('Testing Gemini API connection...');
      const connectionOk = await geminiService.testConnection();
      if (!connectionOk) {
        toast.error('فشل في الاتصال بخدمة Gemini. يرجى التحقق من إعدادات API');
        return;
      }
      
      console.log('Connection test passed, proceeding with analysis...');
      const response = await geminiService.analyzeLabResults(testResults);
      
      if (response.success && response.data) {
        // Automatically update the CodeEditor with the AI interpretation
        setCurrentValue(response.data.analysis);
        setValue('comment', response.data.analysis);
        setAiApplied(true); // Mark that AI interpretation has been applied
        
        toast.success('تم إنشاء التفسير بنجاح وتم تحديث الحقل تلقائياً');
      } else {
        toast.error(response.error || 'فشل في إنشاء التفسير');
      }
    } catch (error) {
      console.error('Error generating AI interpretation:', error);
      toast.error('حدث خطأ في إنشاء التفسير');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // console.log(currentValue,'currentValue');
// alert(currentValue);
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
          {/* AI Interpretation Section */}
          {testResults && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={isGeneratingAI ? <CircularProgress size={16} /> : <Brain size={16} />}
                  onClick={handleGenerateAIInterpretation}
                  disabled={isGeneratingAI}
                  sx={{ 
                    borderColor: '#3b82f6',
                    color: '#3b82f6',
                    '&:hover': {
                      borderColor: '#2563eb',
                      backgroundColor: '#eff6ff'
                    }
                  }}
                >
                  {isGeneratingAI ? 'جاري التحليل...' : 'تفسير ذكي للنتائج'}
                </Button>
              </Box>

            </Box>
          )}

{/* alert(currentValue); */}
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