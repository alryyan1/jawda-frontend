// src/components/companies/dialogs/ImportPricePreferenceDialog.tsx (New File)
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // shadcn/ui
import { Button } from '@/components/ui/button'; // shadcn/ui

export type PriceImportPreference = 'standard_price' | 'zero_price';

interface ImportPricePreferenceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (preference: PriceImportPreference) => void;
  companyName: string;
}

const ImportPricePreferenceDialog: React.FC<ImportPricePreferenceDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  companyName,
}) => {
  const { t } = useTranslation(['companies', 'common']);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('companies:contracts.importPricePreferenceDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('companies:contracts.importPricePreferenceDialog.description', { companyName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 justify-between sm:justify-end pt-4">
          <AlertDialogCancel className="w-full sm:w-auto">
            {t('common:cancel')}
          </AlertDialogCancel>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onConfirm('zero_price')}
              className="w-full sm:w-auto"
            >
              {t('companies:contracts.importPricePreferenceDialog.setZeroPriceButton')}
            </Button>
            <AlertDialogAction
              onClick={() => onConfirm('standard_price')}
              className="w-full sm:w-auto"
            >
              {t('companies:contracts.importPricePreferenceDialog.useStandardPriceButton')}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImportPricePreferenceDialog;