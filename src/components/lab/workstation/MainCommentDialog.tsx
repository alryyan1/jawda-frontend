// src/components/lab/workstation/MainCommentDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

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
  const { t } = useTranslation(['labResults', 'common']);
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
        if(window.confirm(t('common:confirmDiscardChanges'))) {
             onOpenChange(false);
        }
    } else {
        onOpenChange(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('labResults:resultEntry.editMainTestComment')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                rows={8}
                placeholder={t('labResults:resultEntry.mainTestCommentPlaceholder')}
                className="text-sm"
              />
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDialogClose}>
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || commentText === currentComment}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MainCommentDialog;