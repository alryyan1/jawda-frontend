// src/components/lab/reception/DiscountCommentDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const { t } = useTranslation(['labReception', 'common']);
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
          <DialogTitle>{t('labReception:discountComment.title', 'Discount Comment')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                rows={6}
                placeholder={t('labReception:discountComment.placeholder', 'Enter discount comment...')}
                className="text-sm"
              />
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDialogClose}>
            {t('common:cancel')}
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving || !commentText.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountCommentDialog; 