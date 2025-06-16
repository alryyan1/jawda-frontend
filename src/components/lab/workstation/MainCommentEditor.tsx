// src/components/lab/workstation/MainCommentEditor.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWatch, Controller } from 'react-hook-form';
import type { Control, FieldPath } from 'react-hook-form';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormLabel } from '@/components/ui/form';
import FieldStatusIndicator from './FieldStatusIndicator';
import type { FieldSaveStatus } from './FieldStatusIndicator';
import { Edit, Loader2 } from 'lucide-react';

import type { ResultEntryFormValues } from '@/types/labWorkflow';
import { useForm } from 'react-hook-form';

interface MainCommentEditorProps {
  control: Control<ResultEntryFormValues>; // RHF control
  fieldName: FieldPath<ResultEntryFormValues>; // Should be 'main_test_comment'
  debouncedSave: (fieldName: FieldPath<ResultEntryFormValues>, fieldIndex?: number, specificValueToSave?: unknown) => void;
  fieldSaveStatus: FieldSaveStatus;
  disabled?: boolean;
}

const MainCommentEditor: React.FC<MainCommentEditorProps> = ({
  control, fieldName, debouncedSave, fieldSaveStatus, disabled
}) => {
  const { t } = useTranslation(['labResults', 'common']);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // This `watchedValue` reflects the RHF form state, updated by the dialog's save action
  const mainFormComment = useWatch({ control, name: fieldName });

  // Dialog's local RHF form for isolated dirty checking
  const dialogForm = useForm<{ dialogComment: string }>({
    defaultValues: { dialogComment: mainFormComment || '' }
  });
  const { control: dialogControl, handleSubmit: handleDialogSubmit, reset: resetDialog, formState: { isDirty: isDialogDirty } } = dialogForm;
  
  const dialogCommentValue = useWatch({ control: dialogControl, name: "dialogComment" });

  useEffect(() => {
    if (isDialogOpen) {
      resetDialog({ dialogComment: mainFormComment || '' });
    }
  }, [isDialogOpen, mainFormComment, resetDialog]);

  const onDialogSave = () => {
    if (isDialogDirty || dialogCommentValue !== mainFormComment) { // Check if content actually changed
      // Update the parent form's value. This change will be picked up by parent's useWatch/useEffect for debouncedSave.
      control.setValue(fieldName, dialogCommentValue, { shouldDirty: true, shouldValidate: true });
      debouncedSave(fieldName, undefined, dialogCommentValue); // Directly trigger the debounced save
    }
    setIsDialogOpen(false);
  };
  
  const handleDialogCloseIntent = () => {
    if (isDialogDirty && dialogCommentValue !== mainFormComment) {
        if (window.confirm(t('common:confirmDiscardChanges'))) {
            setIsDialogOpen(false);
        }
        // else do nothing, keep dialog open
    } else {
        setIsDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <FormLabel className="text-xs font-medium">
          {t('labResults:resultEntry.mainTestComment')}
        </FormLabel>
        <div className="flex items-center">
            <FieldStatusIndicator status={fieldSaveStatus} />
            <Button variant="ghost" size="sm" className="h-6 w-6 ml-1 p-0" onClick={() => setIsDialogOpen(true)} disabled={disabled}>
                <Edit className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div
        className="p-2 border rounded-md min-h-[60px] text-sm bg-muted/10 dark:bg-muted/20 whitespace-pre-wrap cursor-pointer hover:border-primary/50"
        onClick={() => !disabled && setIsDialogOpen(true)}
        title={t('labResults:resultEntry.clickToEditComment')}
      >
        {mainFormComment || <span className="italic text-muted-foreground">{t('labResults:resultEntry.mainTestCommentPlaceholder')}</span>}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) handleDialogCloseIntent(); else setIsDialogOpen(true);}}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('labResults:resultEntry.editMainTestComment')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDialogSubmit(onDialogSave)} className="py-4">
            <Controller
                name="dialogComment"
                control={dialogControl}
                defaultValue={mainFormComment || ''}
                render={({ field }) => (
                    <Textarea
                        {...field}
                        rows={10}
                        placeholder={t('labResults:resultEntry.mainTestCommentPlaceholder')}
                        className="text-sm min-h-[200px]"
                        disabled={fieldSaveStatus === 'saving'}
                    />
                )}
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleDialogCloseIntent} disabled={fieldSaveStatus === 'saving'}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={fieldSaveStatus === 'saving' || !isDialogDirty}>
                {(fieldSaveStatus === 'saving') && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                {t('common:saveAndClose')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(MainCommentEditor);